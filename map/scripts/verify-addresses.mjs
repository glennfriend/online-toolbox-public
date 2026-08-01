// verify-addresses.mjs — 給一份「候選點清單」,逐筆用政府門牌資料驗證地址是否存在,
// 並回填門牌級座標。用來在資料進 builtin.json 之前先把地址錯的挑出來。
//
//   node verify-addresses.mjs candidates/taichung.json
//
// 輸入 JSON:{ groups: [ { id, name, center, points:[{ emoji,title,address,tags,hours,note }] } ] }
// 輸出:同結構 + 每點補上 lat/lng/geo,並在 stdout 列出查無門牌的項目(= 地址要修)。
// 產生的檔案寫成 <輸入檔>.resolved.json,確認後再併進 builtin.json。

import fs from 'node:fs';
import path from 'node:path';
import { parseAddress, keyOf, lookupAll, nearestOnStreet } from './geocode-moi.mjs';

const input = process.argv[2];
if (!input) { console.error('用法:node verify-addresses.mjs <candidates.json>'); process.exit(1); }

const data = JSON.parse(fs.readFileSync(input, 'utf8'));
const items = [];
for (const g of data.groups) for (const p of g.points) {
  const parsed = p.address ? parseAddress(p.address) : null;
  items.push({ g, p, key: parsed ? keyOf(parsed) : null });
}

const resolvable = items.filter((t) => t.key);
console.log(`候選 ${items.length} 點,可解析門牌 ${resolvable.length} 點,掃描門牌資料中…`);
const found = await lookupAll(new Set(resolvable.map((t) => t.key)));

const ok = [], bad = [], noNo = [];
for (const t of items) {
  if (!t.key) { noNo.push(t); continue; }
  const g = found.get(t.key);
  if (!g) { bad.push(t); continue; }
  t.p.lat = +g.lat.toFixed(6);
  t.p.lng = +g.lng.toFixed(6);
  t.p.geo = 'moi-address';
  ok.push(t);
}

console.log(`\n✅ 門牌命中 ${ok.length} / ${items.length}`);

// 查無該號 → 退而求其次:用同路段最接近的門牌定位,標成 approx(絕不假裝精確)。
let fellBack = [];
if (bad.length) {
  const wantMap = new Map(bad.map((t) => [t.key, parseAddress(t.p.address)]));
  const near = await nearestOnStreet(wantMap);
  // 借用鄰近門牌只在「差幾號」時合理。差太多代表這條路根本沒有這個號碼區間 ——
  // 那是地址寫錯,不是登記缺口,硬借會定位到幾百公尺外。
  const MAX_NO_GAP = 20;
  for (const t of bad) {
    const g = near.get(t.key);
    if (!g) continue;
    if (g.gap > MAX_NO_GAP) { t.gapTooBig = g; continue; }
    t.p.lat = +g.lat.toFixed(6);
    t.p.lng = +g.lng.toFixed(6);
    t.p.approx = true;
    t.p.geo = 'moi-nearest';
    t.fallbackVia = g;
    fellBack.push(t);
  }
  const tooFar = bad.filter((t) => t.gapTooBig);
  if (tooFar.length) {
    console.log(`\n⚠ 該路段最接近的門牌差太多(${tooFar.length},判定地址有誤,不定位):`);
    tooFar.forEach((t) => console.log(`   [${t.g.name}] ${t.p.title}  ${t.p.address}  → 最近只有 ${t.gapTooBig.viaNo}號(差 ${t.gapTooBig.gap} 號)`));
  }
  const stillBad = bad.filter((t) => !t.fallbackVia && !t.gapTooBig);
  if (fellBack.length) {
    console.log(`\n≈ 該號未登記,改用同路段最近門牌定位(${fellBack.length},已標 approx):`);
    fellBack.forEach((t) => console.log(`   [${t.g.name}] ${t.p.title}  ${t.p.address}  → 借用 ${t.fallbackVia.viaNo}號(差 ${t.fallbackVia.gap} 號)`));
  }
  if (stillBad.length) {
    console.log(`\n❌ 完全查不到(${stillBad.length})—— 連該路段都沒有,地址很可能錯:`);
    stillBad.forEach((t) => console.log(`   [${t.g.name}] ${t.p.title}  ${t.p.address}`));
  }
}
if (noNo.length) {
  console.log(`\n⚠ 無門牌號可查(${noNo.length})—— 夜市/園區/步道之類,需另行定位:`);
  noNo.forEach((t) => console.log(`   [${t.g.name}] ${t.p.title}  ${t.p.address || '(無地址)'}`));
}

// 各組統計
console.log('\n各組命中率:');
for (const g of data.groups) {
  const total = g.points.length;
  const hit = g.points.filter((p) => p.geo === 'moi-address').length;
  console.log(`  ${g.name}:${hit}/${total}`);
}

const out = input.replace(/\.json$/, '') + '.resolved.json';
fs.writeFileSync(out, JSON.stringify(data, null, 2) + '\n');
console.log(`\n已寫出 ${out}`);
