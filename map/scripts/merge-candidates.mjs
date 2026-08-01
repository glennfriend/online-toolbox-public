// merge-candidates.mjs — 把驗證過的候選組併進 data/builtin.json,並依「由北到南」重排組別順序。
//
//   node merge-candidates.mjs candidates/taichung.resolved.json candidates/kaohsiung.resolved.json ...
//
// 同 id 的組會被覆蓋(可重跑);沒列到的既有組保持不動。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BUILTIN = path.join(HERE, '..', 'data', 'builtin.json');

// 由北到南、同城市相鄰;沒列到的排在最後(維持原相對順序)。
const ORDER = [
  '中山國中 捷運站', '南京復興 捷運站', '忠孝復興 捷運站', '大安 捷運站', '信義安和 捷運站',
  '大稻埕 - 景點',
  // 宜蘭維持既有的「鄉鎮」分類(礁溪 / 羅東 / 五結),每個鄉鎮再分景點 / 美食
  '宜蘭礁溪 - 景點', '宜蘭礁溪 - 美食',
  '宜蘭羅東 - 景點', '宜蘭羅東 - 美食',
  '宜蘭五結 - 景點', '宜蘭五結 - 美食',
  '台中 - 景點', '台中 - 美食',
  '台南 - 景點', '台南 - 美食',
  '高雄 - 景點', '高雄 - 美食',
];

// --remove=id1,id2 可在合併前刪掉舊組(例如把宜蘭三鎮拆成景點/美食後,舊的三組要移除)
const args = process.argv.slice(2);
const removeArg = args.find((a) => a.startsWith('--remove='));
const files = args.filter((a) => !a.startsWith('--'));
if (!files.length && !removeArg) { console.error('用法:node merge-candidates.mjs [--remove=id,…] <*.resolved.json> ...'); process.exit(1); }

const data = JSON.parse(fs.readFileSync(BUILTIN, 'utf8'));

if (removeArg) {
  const ids = new Set(removeArg.slice('--remove='.length).split(',').filter(Boolean));
  const before = data.groups.length;
  const gone = data.groups.filter((g) => ids.has(g.id)).map((g) => `${g.name}(${g.points.length}點)`);
  data.groups = data.groups.filter((g) => !ids.has(g.id));
  console.log(`− 移除 ${before - data.groups.length} 組:${gone.join('、') || '(無相符 id)'}`);
}
const byId = new Map(data.groups.map((g) => [g.id, g]));

for (const f of files) {
  const inc = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const g of inc.groups) {
    // 只收有座標的點 —— 沒定位成功的不進正式資料,寧可少也不要壞資料
    const good = g.points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    const dropped = g.points.length - good.length;
    if (dropped) console.log(`⚠ ${g.name}:略過 ${dropped} 個沒有座標的點`);
    if (!good.length) { console.log(`⚠ ${g.name}:完全沒有可用的點,不併入`); continue; }
    // osmQuery 只是查詢用的暫時欄位,不進正式資料
    good.forEach((p) => delete p.osmQuery);
    const out = { id: g.id, name: g.name, builtin: true, center: g.center, points: good };
    if (byId.has(g.id)) {
      const idx = data.groups.findIndex((x) => x.id === g.id);
      data.groups[idx] = out;
      console.log(`↻ 覆蓋 ${g.name}(${good.length} 點)`);
    } else {
      data.groups.push(out);
      console.log(`+ 新增 ${g.name}(${good.length} 點)`);
    }
    byId.set(g.id, out);
  }
}

const rank = (n) => { const i = ORDER.indexOf(n); return i < 0 ? ORDER.length : i; };
data.groups.sort((a, b) => rank(a.name) - rank(b.name));

fs.writeFileSync(BUILTIN, JSON.stringify(data, null, 2) + '\n');
console.log('\n最終組別順序:');
data.groups.forEach((g, i) => {
  const moi = g.points.filter((p) => p.geo === 'moi-address').length;
  const near = g.points.filter((p) => p.geo === 'moi-nearest').length;
  const osm = g.points.filter((p) => p.geo === 'osm').length;
  const osmA = g.points.filter((p) => p.geo === 'osm-approx').length;
  const none = g.points.filter((p) => !p.geo).length;
  const parts = [moi && `門牌 ${moi}`, near && `鄰近門牌 ${near}`, osm && `OSM ${osm}`, osmA && `OSM概略 ${osmA}`, none && `未驗證 ${none}`].filter(Boolean);
  console.log(`  ${String(i + 1).padStart(2)} ${g.name}(${g.points.length}) — ${parts.join(' / ')}`);
});
console.log(`\n總計 ${data.groups.reduce((n, g) => n + g.points.length, 0)} 點`);
