// catalog.js — 畫風頁:這個畫風的「角色 × 表情」與「道具」,供人工核對畫風。

import { CHARACTERS, EMOTIONS, STYLE } from './assets.js';
import { PROPS } from './props.js';

// 角色 × 表情:每個角色各自一個區塊(分開,好辨認)
const charSections = document.querySelector('#char-sections');
for (const [id, def] of Object.entries(CHARACTERS)) {
  const h = document.createElement('h3');
  h.className = 'char-name';
  h.textContent = `${def.name}(${id})`;
  charSections.appendChild(h);
  const grid = document.createElement('div');
  grid.className = 'grid';
  for (const emotion of EMOTIONS) {
    const face = def.faces[emotion];
    if (!face) continue;
    const p = def.parts;
    const cell = document.createElement('figure');
    cell.className = 'cell';
    cell.innerHTML = `
      <svg viewBox="-110 -110 220 250" width="170" height="193" xmlns="http://www.w3.org/2000/svg">
        <rect x="-110" y="-110" width="220" height="250" fill="${STYLE.paper}"/>
        <g stroke-linecap="round" stroke-linejoin="round">
          ${p.back || ''}${p.neck || ''}${p.body || ''}${p.head || ''}${face}${p.hair || ''}
        </g>
      </svg>
      <figcaption>${emotion}</figcaption>`;
    grid.appendChild(cell);
  }
  charSections.appendChild(grid);
}

// 道具
const propGrid = document.querySelector('#prop-grid');
for (const [name, p] of Object.entries(PROPS)) {
  const w = Math.min(p.w, 160), h = p.h * w / p.w;
  const cell = document.createElement('figure');
  cell.className = 'cell';
  cell.innerHTML = `<svg viewBox="0 0 ${p.w} ${p.h}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" style="background:#fff">${p.svg}</svg>
    <figcaption><b>${name}</b> · ${p.w}×${p.h}</figcaption>`;
  propGrid.appendChild(cell);
}
