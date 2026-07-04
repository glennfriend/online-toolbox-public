// catalog.js — 素材頁:各「畫風(style)」的配件(去背點陣圖)+ 共用的背景(不透明整格)。

import { STYLES, STYLE_DIR } from './items.js';
import { BACKGROUNDS, BG_DIR } from './backgrounds.js';

const CHECKER = 'background:linear-gradient(45deg,#d8d8d8 25%,transparent 25%,transparent 75%,#d8d8d8 75%),linear-gradient(45deg,#d8d8d8 25%,#fff 25%,#fff 75%,#d8d8d8 75%);background-size:18px 18px;background-position:0 0,9px 9px;border-radius:6px';

// 配件:依 style 分區
const itemRoot = document.querySelector('#item-sections');
for (const [style, def] of Object.entries(STYLES)) {
  const h = document.createElement('h3');
  h.className = 'char-name';
  h.textContent = `${def.label}（${style}）`;
  itemRoot.appendChild(h);
  const grid = document.createElement('div');
  grid.className = 'grid';
  for (const [id, it] of Object.entries(def.items)) {
    const cell = document.createElement('figure');
    cell.className = 'cell';
    cell.innerHTML = `<div style="${CHECKER};display:flex;align-items:center;justify-content:center;height:150px">
        <img src="${STYLE_DIR}${style}/items/${it.file}" alt="${id}" style="max-width:170px;max-height:140px;display:block">
      </div>
      <figcaption><b>${id}</b> · ${it.w}×${it.h}<br><span style="color:var(--muted)">${(it.tags || []).join(' · ')}</span></figcaption>`;
    grid.appendChild(cell);
  }
  itemRoot.appendChild(grid);
}

// 背景(所有畫風共用)
const bgGrid = document.querySelector('#bg-grid');
for (const [id, b] of Object.entries(BACKGROUNDS)) {
  const cell = document.createElement('figure');
  cell.className = 'cell';
  cell.innerHTML = `<img src="${BG_DIR}${b.file}" width="200" alt="${id}" style="border-radius:6px;display:block">
    <figcaption><b>${id}</b><br><span style="color:var(--muted)">${(b.tags || []).join(' · ')}</span></figcaption>`;
  bgGrid.appendChild(cell);
}
