// extract-parts.mjs — vtracer SVG → 分類報告 + 角色零件模組。
//
// 目的:消掉建模最慢的人工步驟(「逐條讀 path 座標、心算幾何、分類眼/嘴/髮」)。
// 這支工具把機械勞動自動化:解析每條 path 的顏色 + bounding box + 面積,
// 印出可複核的分類表 + 自動猜測,再依「確認過的分組」輸出零件模組。
//
// 設計原則(對齊專案):
//   - 人在迴圈:一律印出分類表讓人確認,絕不無聲(未知/低信心會標 ⚠)。
//   - 確定性:純解析,無隨機、無模型;同一 SVG 同一輸出。
//   - 表情不從描線抽:base = 髮+臉+耳+頸肩(描線的難處);眼/嘴/腮紅一律手寫小零件,
//     跨角色共用同一套表情。所以工具只需把「臉內小暗塊」與「腮紅」從 base 分出來丟掉。
//
// 用法:
//   node extract-parts.mjs <svg>                      → 只印分類表(建模第一步:先看)
//   node extract-parts.mjs <svg> --emit <NAME> [--out f.js] [--groups g.json]
//        → 產出零件模組(base 一層)。groups 省略時用自動猜測的 base。
//
// groups.json(可選,複核後覆寫自動猜測):
//   { "base":[..], "blush":[..], "drop":[bg magenta 索引], "patch":[臉內五官索引] }
//   drop  = 真的丟掉(背景 → 留透明)。
//   patch = 五官區:cutout 模式下臉上這些區是「洞」,直接丟會透出背景;
//           故改填膚色補平,得到「空白臉」,再由手寫表情覆蓋。

import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const svgPath = args[0];
if (!svgPath) { console.error('用法: node extract-parts.mjs <svg> [--emit NAME] [--out file.js] [--groups g.json]'); process.exit(1); }
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const emitName = flag('--emit');
const outFile = flag('--out');
const groupsFile = flag('--groups');

const svg = readFileSync(svgPath, 'utf8');

// 畫布尺寸(vtracer 會寫 width/height)
const dim = svg.match(/<svg[^>]*width="(\d+)"[^>]*height="(\d+)"/);
const W = dim ? +dim[1] : 512, H = dim ? +dim[2] : 512;

// 逐條 path:抓 d、fill、transform translate
const paths = [];
const re = /<path\s+d="([^"]*)"\s+fill="([^"]*)"(?:\s+transform="translate\(([^)]*)\)")?\s*\/>/g;
let m;
while ((m = re.exec(svg))) {
  const d = m[1], fill = m[2];
  const [tx, ty] = (m[3] || '0,0').split(/[, ]+/).map(Number);
  // 取出所有數字成對 → (x,y);vtracer 的指令(M/L/C/Z)引數皆為座標對,順序配對即可。
  const nums = (d.match(/-?\d+\.?\d*/g) || []).map(Number);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = nums[i] + tx, y = nums[i + 1] + ty;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const w = maxX - minX, h = maxY - minY;
  paths.push({ idx: paths.length, fill, tx, ty, minX, minY, w, h,
    cx: minX + w / 2, cy: minY + h / 2, areaPct: (w * h) / (W * H) * 100, raw: m[0] });
}

// 顏色分類(圖已量化):pink=腮紅, near-white=白填充(碎形/高光/膚), dark=黑(髮/五官/線)
function colorClass(fill) {
  const hx = fill.replace('#', '');
  if (hx.length < 6) return 'other';
  const r = parseInt(hx.slice(0, 2), 16), g = parseInt(hx.slice(2, 4), 16), b = parseInt(hx.slice(4, 6), 16);
  const lum = (r * 299 + g * 587 + b * 114) / 1000;
  if (r > 180 && b > 180 && g < 80) return 'magenta';   // flood-fill 背景 sentinel(含 vtracer 量化偏移)
  if (r > b + 12 && r > 180 && lum < 245) return 'pink';
  if (lum < 90) return 'dark';
  if (lum > 235) return 'white';
  return 'other';
}

// 自動猜測(僅供複核起點,不是真相):
//   bg = 面積≈整張;pink = blush;dark 大塊 = 髮(base);
//   dark 小塊且落在臉內區(中央偏下)= 五官 → drop(改手寫);其餘 = base。
const faceBox = { x0: W * 0.30, x1: W * 0.72, y0: H * 0.55, y1: H * 0.88 };
function guess(p) {
  const cc = colorClass(p.fill);
  if (cc === 'magenta') return 'drop';             // flood-fill 標記的背景 → 丟(留透明)
  if (p.areaPct > 70 && cc !== 'dark') return 'bg';
  if (cc === 'pink') return 'blush';
  const inFace = p.cx > faceBox.x0 && p.cx < faceBox.x1 && p.cy > faceBox.y0 && p.cy < faceBox.y1;
  if (cc === 'dark' && inFace && p.areaPct < 3) return 'drop';   // 臉內小暗塊 = 眼/嘴/鼻 → 手寫
  return 'base';
}
for (const p of paths) p.g = guess(p);

// 分類表(一律印出,供人複核)
const lo = (n) => Math.round(n);
console.log(`\n${svgPath}  canvas ${W}x${H}  faceBox x[${lo(faceBox.x0)}-${lo(faceBox.x1)}] y[${lo(faceBox.y0)}-${lo(faceBox.y1)}]`);
console.log('idx  color   fill      cx    cy     w     h    area%   guess');
for (const p of paths) {
  console.log(
    String(p.idx).padStart(3) + '  ' +
    colorClass(p.fill).padEnd(6) + '  ' + p.fill.padEnd(8) + '  ' +
    String(lo(p.cx)).padStart(4) + '  ' + String(lo(p.cy)).padStart(4) + '  ' +
    String(lo(p.w)).padStart(4) + '  ' + String(lo(p.h)).padStart(4) + '  ' +
    p.areaPct.toFixed(2).padStart(6) + '   ' + p.g);
}
const byG = (g) => paths.filter((p) => p.g === g).map((p) => p.idx);
console.log(`\n自動猜測分組  base=[${byG('base')}]  blush=[${byG('blush')}]  drop=[${byG('drop')}]  bg=[${byG('bg')}]`);
console.log('複核後如需覆寫,建 groups.json 再加 --emit。臉內小暗塊(drop)代表由手寫表情取代。\n');

if (!emitName) process.exit(0);

// ── 產出零件模組 ──
let groups;
if (groupsFile) {
  groups = JSON.parse(readFileSync(groupsFile, 'utf8'));
} else {
  groups = { base: byG('base'), blush: byG('blush'), drop: byG('drop').concat(byG('bg')) };
}
const SKIN = flag('--skin') || '#FFFFFF';
const pick = (list) => (list || []).map((i) => paths[i].raw).join('\n  ');
// patch:把五官洞填成膚色(換掉 fill),補平臉;附在 base 最後(在髮之上、表情之下)
const pickPatched = (list) => (list || []).map((i) => paths[i].raw.replace(/fill="[^"]*"/, `fill="${SKIN}"`)).join('\n  ');
const module = `// ${emitName}-traced-parts.js — 由 tools/extract-parts.mjs 從 vtracer SVG 自動抽取。
// 來源:${svgPath}。座標系 = 描線原始像素(${W}x${H}),由 assets.js 以 transform 對位。
// 此檔為產物,勿手改;重產請跑 extract-parts.mjs。
// 分組:base=[${groups.base}]  blush=[${groups.blush}]  drop(手寫表情取代)=[${groups.drop || []}]
export const ${emitName} = {
  base: \`${pick(groups.base)}
  ${pickPatched(groups.patch)}\`,
  blush: \`${pick(groups.blush)}\`,
};
`;
const target = outFile || svgPath.replace(/[^/\\]*$/, `${emitName}.js`);
writeFileSync(target, module);
console.log(`已輸出 → ${target}  (base ${groups.base.length} 條, blush ${(groups.blush || []).length} 條)`);
