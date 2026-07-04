// catalog.js — 素材頁:列出所有「配件(去背點陣圖)」與「背景(不透明整格)」,供挑圖與核對。

import { ITEMS, ITEM_DIR } from './items.js';
import { BACKGROUNDS, BG_DIR } from './backgrounds.js';

// 配件:去背 → 用棋盤格底襯,一眼看出透明範圍是否乾淨
const CHECKER = 'background:linear-gradient(45deg,#d8d8d8 25%,transparent 25%,transparent 75%,#d8d8d8 75%),linear-gradient(45deg,#d8d8d8 25%,#fff 25%,#fff 75%,#d8d8d8 75%);background-size:18px 18px;background-position:0 0,9px 9px;border-radius:6px';
const itemGrid = document.querySelector('#item-grid');
for (const [id, it] of Object.entries(ITEMS)) {
  const cell = document.createElement('figure');
  cell.className = 'cell';
  cell.innerHTML = `<div style="${CHECKER};display:flex;align-items:center;justify-content:center;height:150px">
      <img src="${ITEM_DIR}${it.file}" alt="${id}" style="max-width:170px;max-height:140px;display:block">
    </div>
    <figcaption><b>${id}</b> · ${it.w}×${it.h}<br><span style="color:var(--muted)">${(it.tags || []).join(' · ')}</span></figcaption>`;
  itemGrid.appendChild(cell);
}

// 背景:點陣圖 + tags
const bgGrid = document.querySelector('#bg-grid');
for (const [id, b] of Object.entries(BACKGROUNDS)) {
  const cell = document.createElement('figure');
  cell.className = 'cell';
  cell.innerHTML = `<img src="${BG_DIR}${b.file}" width="200" alt="${id}" style="border-radius:6px;display:block">
    <figcaption><b>${id}</b><br><span style="color:var(--muted)">${(b.tags || []).join(' · ')}</span></figcaption>`;
  bgGrid.appendChild(cell);
}
