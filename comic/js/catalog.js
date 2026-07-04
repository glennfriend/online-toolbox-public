// catalog.js — 畫風頁:這個畫風的「角色 × 表情」與「道具」,供人工核對畫風。

import { CHARACTERS, EMOTIONS, STYLE } from './assets.js';
import { PROPS } from './props.js';

// 角色 × 表情
const charGrid = document.querySelector('#char-grid');
for (const [id, def] of Object.entries(CHARACTERS)) {
  for (const emotion of EMOTIONS) {
    const face = def.faces[emotion];
    if (!face) continue;
    const p = def.parts;
    const cell = document.createElement('figure');
    cell.className = 'cell';
    cell.innerHTML = `
      <svg viewBox="-110 -110 220 250" width="180" height="205" xmlns="http://www.w3.org/2000/svg">
        <rect x="-110" y="-110" width="220" height="250" fill="${STYLE.paper}"/>
        <g stroke-linecap="round" stroke-linejoin="round">
          ${p.back || ''}${p.neck || ''}${p.body || ''}${p.head || ''}${face}${p.hair || ''}
        </g>
      </svg>
      <figcaption><b>${def.name}</b>(${id})× ${emotion}</figcaption>`;
    charGrid.appendChild(cell);
  }
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
