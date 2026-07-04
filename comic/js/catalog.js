// catalog.js — 畫風頁:這個畫風的「角色 × 表情」與「道具」,供人工核對畫風。

import { CHARACTERS, EMOTIONS, STYLE } from './assets.js';
import { PROPS } from './props.js';
import { BACKGROUNDS, BG_DIR } from './backgrounds.js';

// 角色 × 表情:先依「人」分區(bun / longhair),每個人底下列出各姿勢 × 5 表情
const charSections = document.querySelector('#char-sections');
const byPerson = {};
for (const [id, def] of Object.entries(CHARACTERS)) {
  const key = def.person || id;
  (byPerson[key] = byPerson[key] || []).push([id, def]);
}
for (const [person, entries] of Object.entries(byPerson)) {
  const h = document.createElement('h3');
  h.className = 'char-name';
  h.textContent = (CHARACTERS[person] || entries[0][1]).name;
  charSections.appendChild(h);
  for (const [id, def] of entries) {
    const label = document.createElement('div');
    label.className = 'pose-label';
    label.textContent = `${def.name}(${id})`;
    charSections.appendChild(label);
    const grid = document.createElement('div');
    grid.className = 'grid';
    for (const emotion of EMOTIONS) {
      const face = def.faces[emotion];
      if (!face) continue;
      const p = def.parts;
      const cell = document.createElement('figure');
      cell.className = 'cell';
      cell.innerHTML = `
        <svg viewBox="-110 -110 220 260" width="160" height="189" xmlns="http://www.w3.org/2000/svg">
          <rect x="-110" y="-110" width="220" height="260" fill="${STYLE.paper}"/>
          <g stroke-linecap="round" stroke-linejoin="round">
            ${p.back || ''}${p.neck || ''}${p.body || ''}${p.head || ''}${face}${p.hair || ''}
          </g>
        </svg>
        <figcaption>${emotion}</figcaption>`;
      grid.appendChild(cell);
    }
    charSections.appendChild(grid);
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

// 背景(點陣圖 + tags)
const bgGrid = document.querySelector('#bg-grid');
const bgEntries = Object.entries(BACKGROUNDS);
if (!bgEntries.length) {
  bgGrid.innerHTML = `<p class="hint">尚無背景。把圖丟進 <code>raw/backgrounds/</code>,我再幫每張下 tag。</p>`;
}
for (const [id, b] of bgEntries) {
  const cell = document.createElement('figure');
  cell.className = 'cell';
  cell.innerHTML = `<img src="${BG_DIR}${b.file}" width="200" alt="${id}" style="border-radius:6px;display:block">
    <figcaption><b>${id}</b><br><span style="color:var(--muted)">${(b.tags || []).join(' · ')}</span></figcaption>`;
  bgGrid.appendChild(cell);
}
