// geocode-osm.mjs — 用 OpenStreetMap / Nominatim 定位候選點(給沒有門牌開放資料的縣市用,例如台南)。
//
//   node geocode-osm.mjs candidates/tainan.json
//
// 每個 point 可加 "osmQuery" 指定查詢字串(英文名命中率通常更高);沒給就用「標題 + 地址」。
// 規則:
//   • 遵守 Nominatim 使用條款:每秒最多 1 次查詢、帶可識別的 User-Agent。
//   • 結果必須落在該縣市的合理範圍內,否則視為失敗(Nominatim 對中文常誤配到國外)。
//   • 回傳的門牌號與我們的地址相符 → geo:"osm"(視為已驗證);
//     只查到路/地標層級 → geo:"osm-approx" + approx:true(誠實標示不精確)。

import fs from 'node:fs';

const UA = 'online-toolbox-public-map/1.0 (personal tool; contact glenn.guan@onramplab.com)';
const SLEEP = 1150;   // ms,Nominatim 要求 <= 1 req/s

// 縣市合理範圍(粗略外接矩形),用來擋掉配到國外/他縣市的結果
const BBOX = {
  '台南市': { minLat: 22.88, maxLat: 23.45, minLng: 120.03, maxLng: 120.66 },
  '臺南市': { minLat: 22.88, maxLat: 23.45, minLng: 120.03, maxLng: 120.66 },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function nominatim(q) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'tw');
  url.searchParams.set('addressdetails', '1');
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'zh-TW,zh' } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const j = await res.json();
  return j[0] || null;
}

const input = process.argv[2];
if (!input) { console.error('用法:node geocode-osm.mjs <candidates.json>'); process.exit(1); }
const data = JSON.parse(fs.readFileSync(input, 'utf8'));

const cityOf = (addr) => (String(addr || '').match(/^(台南市|臺南市|台中市|臺中市|高雄市|台北市|臺北市|宜蘭縣)/) || [])[1] || '';
const houseNoOf = (addr) => (String(addr || '').match(/(\d+(?:之\d+)*)號/) || [])[1] || '';

let exact = 0, loose = 0, failed = [];
for (const g of data.groups) {
  for (const p of g.points) {
    const queries = [p.osmQuery, p.address, `${p.title} ${p.address || ''}`.trim()].filter(Boolean);
    let hit = null, usedQ = '';
    for (const q of queries) {
      let r = null;
      try { r = await nominatim(q); } catch (e) { /* 網路波動就跳過這個查詢 */ }
      await sleep(SLEEP);
      if (!r) continue;
      const lat = +r.lat, lng = +r.lon;
      const bb = BBOX[cityOf(p.address)];
      if (bb && (lat < bb.minLat || lat > bb.maxLat || lng < bb.minLng || lng > bb.maxLng)) continue;  // 落在縣市外 → 不採信
      hit = { lat, lng, display: r.display_name, house: r.address?.house_number || '' };
      usedQ = q;
      break;
    }
    if (!hit) { failed.push({ g: g.name, p }); console.log(`❌ ${p.title}  ${p.address || ''}`); continue; }

    p.lat = +hit.lat.toFixed(6);
    p.lng = +hit.lng.toFixed(6);
    const want = houseNoOf(p.address);
    if (want && hit.house && hit.house === want) {
      p.geo = 'osm';                       // 門牌號對得上 → 視為已驗證
      delete p.approx;
      exact++;
      console.log(`✅ ${p.title}  門牌${hit.house}號相符  ${p.lat},${p.lng}`);
    } else {
      p.geo = 'osm-approx';
      p.approx = true;                     // 只到路/地標層級 → 誠實標概略
      loose++;
      console.log(`≈  ${p.title}  (OSM 未給門牌號,標概略)  ${p.lat},${p.lng}  ← ${usedQ}`);
    }
  }
}

console.log(`\n門牌號相符 ${exact} 筆;僅地標層級(approx) ${loose} 筆;查無 ${failed.length} 筆`);
if (failed.length) failed.forEach((f) => console.log(`   查無:[${f.g}] ${f.p.title}  ${f.p.address || ''}`));

const out = input.replace(/\.json$/, '') + '.resolved.json';
fs.writeFileSync(out, JSON.stringify(data, null, 2) + '\n');
console.log(`\n已寫出 ${out}`);
