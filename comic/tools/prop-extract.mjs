// prop-extract.mjs — 把「去背+描線」後的道具 SVG 收成 props 模組。
//
// 每個輸入 SVG(vtracer color cutout 之後):
//   - 丟掉 magenta 背景 path、丟掉幾乎滿版的殘留背景 path
//   - 其餘 path 一起平移使左上角對齊 (0,0),記錄 w/h
//   - 檔名(去副檔名)= 道具 id
// 輸出:props.js  → export const PROPS = { pot:{w,h,svg}, mug:{...}, ... }
//
// 用法:node prop-extract.mjs out.js a.svg b.svg ...

import { readFileSync, writeFileSync } from 'node:fs';
import { basename, extname } from 'node:path';

const [outFile, ...svgs] = process.argv.slice(2);
if (!outFile || !svgs.length) { console.error('用法: node prop-extract.mjs out.js <svg...>'); process.exit(1); }

function bboxOf(d, tx, ty) {
  const nums = (d.match(/-?\d+\.?\d*/g) || []).map(Number);
  let a = Infinity, b = Infinity, c = -Infinity, e = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = nums[i] + tx, y = nums[i + 1] + ty;
    if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > e) e = y;
  }
  return { minX: a, minY: b, maxX: c, maxY: e };
}
const isMagenta = (fill) => {
  const h = fill.replace('#', ''); if (h.length < 6) return false;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), bb = parseInt(h.slice(4, 6), 16);
  // 純 magenta 及其被 vtracer 混色後的紫色殘邊(R、B 高、G 明顯低);膚色/腮紅 G 接近 R 不會中
  return r > 150 && bb > 150 && g < Math.min(r, bb) - 45;
};
const isDark = (fill) => {
  const h = fill.replace('#', ''); if (h.length < 6) return false;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), bb = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + bb * 114) / 1000 < 100;
};
// 線稿類(狗/雲/海鷗…):只留黑線,白底/白內部全丟 → 透明內部的純線稿。以檔名字首判斷(不必去背/量化)。
const LINEART = ['dog', 'cloud-', 'gull', 'bird'];
const isLineArt = (name) => LINEART.some((p) => name.startsWith(p));

const props = {};
for (const file of svgs) {
  const svg = readFileSync(file, 'utf8');
  const dim = svg.match(/<svg[^>]*width="(\d+)"[^>]*height="(\d+)"/);
  const W = dim ? +dim[1] : 0, H = dim ? +dim[2] : 0, canvasArea = W * H;
  const name = basename(file, extname(file));
  const lineart = isLineArt(name);
  const re = /<path\s+d="([^"]*)"\s+fill="([^"]*)"(?:\s+transform="translate\(([^)]*)\)")?\s*\/>/g;
  let m; const keep = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  while ((m = re.exec(svg))) {
    const fill = m[2];
    const [tx, ty] = (m[3] || '0,0').split(/[, ]+/).map(Number);
    const bb = bboxOf(m[1], tx, ty);
    const area = (bb.maxX - bb.minX) * (bb.maxY - bb.minY);
    if (lineart) {
      if (!isDark(fill)) continue;                       // 線稿:只留黑線
    } else {
      if (isMagenta(fill)) continue;                     // 背景 sentinel
      if (canvasArea && area > canvasArea * 0.92) continue; // 殘留滿版背景
    }
    keep.push(m[0]);
    if (bb.minX < minX) minX = bb.minX; if (bb.minY < minY) minY = bb.minY;
    if (bb.maxX > maxX) maxX = bb.maxX; if (bb.maxY > maxY) maxY = bb.maxY;
  }
  const w = Math.ceil(maxX - minX), h = Math.ceil(maxY - minY);
  const inner = keep.join('').replace(/\s+/g, ' ');
  props[name] = { w, h, svg: `<g transform="translate(${-Math.round(minX)} ${-Math.round(minY)})">${inner}</g>` };
  console.log(`${name.padEnd(14)} ${keep.length} paths  ${w}x${h}`);
}

const body = Object.entries(props)
  .map(([k, v]) => `  ${JSON.stringify(k)}: { w: ${v.w}, h: ${v.h}, svg: ${JSON.stringify(v.svg)} },`)
  .join('\n');
writeFileSync(outFile, `// props.js — 道具資產(由 tools/prop-extract.mjs 從 vtracer 描線 SVG 抽取)。\n// 每個道具:{ w, h, svg }。svg 內容左上角已對齊 (0,0),renderer 以 translate+scale 擺放。\nexport const PROPS = {\n${body}\n};\n`);
console.log(`\n→ ${outFile}  (${Object.keys(props).length} props)`);
