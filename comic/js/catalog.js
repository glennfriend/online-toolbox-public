// catalog.js — 素材頁:每個「畫風(style)」的配件(去背)+ 背景(不透明整格),都分畫風。

import { STYLES, STYLE_DIR } from './items.js';
import { bgOf, bgPath } from './backgrounds.js';

const CHECKER = 'background:linear-gradient(45deg,#d8d8d8 25%,transparent 25%,transparent 75%,#d8d8d8 75%),linear-gradient(45deg,#d8d8d8 25%,#fff 25%,#fff 75%,#d8d8d8 75%);background-size:18px 18px;background-position:0 0,9px 9px;border-radius:6px';

const root = document.querySelector('#sections');

function grid() { const g = document.createElement('div'); g.className = 'grid'; return g; }
function sub(text) { const s = document.createElement('div'); s.className = 'pose-label'; s.textContent = text; return s; }

for (const [style, def] of Object.entries(STYLES)) {
  const h = document.createElement('h3');
  h.className = 'char-name';
  h.textContent = `${def.label}（${style}）`;
  root.appendChild(h);

  // 配件
  root.appendChild(sub('配件（去背,週圍透明）'));
  const ig = grid();
  for (const [id, it] of Object.entries(def.items)) {
    const cell = document.createElement('figure');
    cell.className = 'cell';
    cell.innerHTML = `<div style="${CHECKER};display:flex;align-items:center;justify-content:center;height:150px">
        <img src="${STYLE_DIR}${style}/items/${it.file}" alt="${id}" style="max-width:170px;max-height:140px;display:block">
      </div>
      <figcaption><b>${id}</b> · ${it.w}×${it.h}<br><span style="color:var(--muted)">${(it.tags || []).join(' · ')}</span></figcaption>`;
    ig.appendChild(cell);
  }
  root.appendChild(ig);

  // 背景
  const bgs = bgOf(style);
  const bgIds = Object.keys(bgs);
  root.appendChild(sub(`背景（不透明,鋪滿整格）${bgIds.length ? '' : ' —— 此畫風尚無背景'}`));
  if (bgIds.length) {
    const bg = grid();
    for (const [id, b] of Object.entries(bgs)) {
      const cell = document.createElement('figure');
      cell.className = 'cell';
      cell.innerHTML = `<img src="${bgPath(style, b.file)}" width="200" alt="${id}" style="border-radius:6px;display:block">
        <figcaption><b>${id}</b><br><span style="color:var(--muted)">${(b.tags || []).join(' · ')}</span></figcaption>`;
      bg.appendChild(cell);
    }
    root.appendChild(bg);
  }
}
