// catalog.js — 素材頁:配件(依角色分組,每個變化一格)+ 背景(整格不透明)。

import { ITEMS, ITEM_DIR } from './items.js';
import { BACKGROUNDS, BG_DIR } from './backgrounds.js';

const CHECKER = 'background:linear-gradient(45deg,#d8d8d8 25%,transparent 25%,transparent 75%,#d8d8d8 75%),linear-gradient(45deg,#d8d8d8 25%,#fff 25%,#fff 75%,#d8d8d8 75%);background-size:18px 18px;background-position:0 0,9px 9px;border-radius:6px';

// 配件:依角色分組
const itemRoot = document.querySelector('#item-sections');
for (const [char, ch] of Object.entries(ITEMS)) {
  const h = document.createElement('h3');
  h.className = 'char-name';
  h.textContent = `${ch.label}　(${char})`;
  itemRoot.appendChild(h);
  const grid = document.createElement('div');
  grid.className = 'grid';
  for (const [name, v] of Object.entries(ch.variants)) {
    const cell = document.createElement('figure');
    cell.className = 'cell';
    cell.innerHTML = `<div style="${CHECKER};display:flex;align-items:center;justify-content:center;height:140px">
        <img src="${ITEM_DIR}${char}/${v.file}" alt="${char}/${name}" style="max-width:160px;max-height:130px;display:block">
      </div>
      <figcaption><b>${char}/${name}</b> · ${v.w}×${v.h}<br><span style="color:var(--muted)">${(v.tags || []).join(' · ')}</span></figcaption>`;
    grid.appendChild(cell);
  }
  itemRoot.appendChild(grid);
}

// 背景
const bgGrid = document.querySelector('#bg-grid');
for (const [id, b] of Object.entries(BACKGROUNDS)) {
  const cell = document.createElement('figure');
  cell.className = 'cell';
  cell.innerHTML = `<img src="${BG_DIR}${b.file}" width="200" alt="${id}" style="border-radius:6px;display:block">
    <figcaption><b>${id}</b><br><span style="color:var(--muted)">${(b.tags || []).join(' · ')}</span></figcaption>`;
  bgGrid.appendChild(cell);
}
