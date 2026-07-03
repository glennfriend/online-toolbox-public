// catalog.js — 角色型錄:所有角色 × 所有表情,供人工核對畫風(「調教」用的頁面)。

import { CHARACTERS, EMOTIONS, STYLE } from './assets.js';

const grid = document.querySelector('#grid');

for (const [id, def] of Object.entries(CHARACTERS)) {
  for (const emotion of EMOTIONS) {
    const face = def.faces[emotion];
    if (!face) continue;
    const p = def.parts;
    const cell = document.createElement('figure');
    cell.className = 'cell';
    cell.innerHTML = `
      <svg viewBox="-110 -110 220 250" width="220" height="250" xmlns="http://www.w3.org/2000/svg">
        <rect x="-110" y="-110" width="220" height="250" fill="${STYLE.paper}"/>
        <g stroke-linecap="round" stroke-linejoin="round">
          ${p.back || ''}${p.neck || ''}${p.body || ''}${p.head || ''}${face}${p.hair || ''}
        </g>
      </svg>
      <figcaption><b>${def.name}</b>(${id})× ${emotion}</figcaption>`;
    grid.appendChild(cell);
  }
}
