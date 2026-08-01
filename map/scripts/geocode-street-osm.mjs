// geocode-street-osm.mjs — 用 OSM 的「道路幾何」把點定位到**正確的街道**(街道級,非門牌級)。
//
//   node geocode-street-osm.mjs candidates/tainan.json b-tainan-food
//
// 適用情境:該縣市沒有門牌開放資料、OSM 也沒有該店家的 POI,但**道路本身有中文名**。
// 做法:用 Overpass 查該路名在該縣市範圍內的所有路段,取其幾何中心當座標。
// 精度大約 100–300 公尺(視路長),因此一律標 approx:true、geo:"osm-street" —— 不假裝精確。
//
// 為什麼不用 Nominatim/Photon:實測它們對台灣中文地址會「自信地回傳錯誤結果」
// (台南店家配到淡水、龜山、喀拉蚩、阿根廷),Overpass 直接查圖資才可靠。

import fs from 'node:fs';

const ENDPOINTS = ['https://overpass.kumi.systems/api/interpreter', 'https://overpass-api.de/api/interpreter'];
const BBOX = { s: 22.88, w: 120.03, n: 23.45, e: 120.66 };   // 台南
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Overpass 常回「server too busy」的暫時性錯誤(HTML 格式),必須重試而不是當成查無。
// 回傳 { ok:true, json } / { ok:false, why }
async function overpass(query, tries = 6) {
  let why = 'unknown';
  for (let attempt = 0; attempt < tries; attempt++) {
    const ep = ENDPOINTS[attempt % ENDPOINTS.length];
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          // 沒帶可識別的 UA 會被 Overpass 擋掉(406)
          'User-Agent': 'online-toolbox-public-map/1.0 (personal tool; contact glenn.guan@onramplab.com)',
        },
        body: new URLSearchParams({ data: query }),
      });
      const txt = await res.text();
      if (txt.trim().startsWith('{')) return { ok: true, json: JSON.parse(txt) };
      why = /too busy|timeout|rate_limited|Too Many/i.test(txt) ? 'server busy' : `HTTP ${res.status}`;
    } catch (e) { why = e.message; }
    const wait = 5000 * (attempt + 1);               // 5s, 10s, 15s… 線性退避
    console.log(`   …${why},${wait / 1000}s 後重試(${attempt + 1}/${tries})`);
    await sleep(wait);
  }
  return { ok: false, why };
}

// 路名 → 該路所有路段的幾何中心
async function locateStreet(name) {
  const q = `[out:json][timeout:60];way["highway"]["name"="${name}"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});out center;`;
  const r = await overpass(q);
  if (!r.ok) return { error: r.why };                 // 查詢失敗 ≠ 查無此路,要分清楚
  const els = (r.json.elements || []).filter((e) => e.center);
  if (!els.length) return null;
  const lat = els.reduce((s, e) => s + e.center.lat, 0) / els.length;
  const lng = els.reduce((s, e) => s + e.center.lon, 0) / els.length;
  // 路的長度概估(供判斷誤差量級)
  const lats = els.map((e) => e.center.lat), lngs = els.map((e) => e.center.lon);
  const spanM = Math.max((Math.max(...lats) - Math.min(...lats)) * 110000,
                         (Math.max(...lngs) - Math.min(...lngs)) * 102000);
  return { lat, lng, segments: els.length, spanM };
}

const [input, groupId] = process.argv.slice(2);
if (!input) { console.error('用法:node geocode-street-osm.mjs <candidates.json> [groupId]'); process.exit(1); }
const data = JSON.parse(fs.readFileSync(input, 'utf8'));
const groups = groupId ? data.groups.filter((g) => g.id === groupId) : data.groups;

// 先算出每個點的路名(去掉縣市、區、巷弄號)
const streetOf = (addr) => {
  const a = String(addr || '').replace(/\s+/g, '');
  const m = a.match(/^(?:台南市|臺南市)(?:.{1,4}?[區鄉鎮市])(.+?)(?:\d+巷|\d+弄|\d+(?:之\d+)*號|$)/);
  return m ? m[1] : '';
};

const need = new Map();
for (const g of groups) for (const p of g.points) {
  if (Number.isFinite(p.lat)) continue;            // 已經有座標的不動
  const st = streetOf(p.address);
  if (st) { if (!need.has(st)) need.set(st, []); need.get(st).push(p); }
}

console.log(`需要定位 ${[...need.values()].flat().length} 點,共 ${need.size} 條路\n`);
const located = new Map();
for (const st of need.keys()) {
  const r = await locateStreet(st);
  if (r && !r.error) {
    located.set(st, r);
    console.log(`✅ ${st}  →  ${r.lat.toFixed(6)},${r.lng.toFixed(6)}  (${r.segments} 段, 全長約 ${Math.round(r.spanM)}m)`);
  } else if (r && r.error) {
    console.log(`⚠ ${st}  查詢失敗(${r.error})—— 不是查無此路,稍後重跑即可`);
  } else {
    console.log(`❌ ${st}  查無此路`);
  }
  await sleep(4000);                                // 對 Overpass 客氣一點
}

let done = 0, miss = [];
for (const [st, pts] of need) {
  const r = located.get(st);
  for (const p of pts) {
    if (!r) { miss.push(p.title); continue; }
    p.lat = +r.lat.toFixed(6);
    p.lng = +r.lng.toFixed(6);
    p.approx = true;
    p.geo = 'osm-street';                           // 街道級,誠實標示
    done++;
  }
}
console.log(`\n定位成功 ${done} 點(街道級,已標 approx);失敗 ${miss.length} 點 ${miss.join('、')}`);

const out = input.replace(/\.json$/, '') + '.resolved.json';
fs.writeFileSync(out, JSON.stringify(data, null, 2) + '\n');
console.log(`已寫出 ${out}`);
