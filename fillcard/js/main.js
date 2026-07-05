// main.js — Fillcard 編輯器殼層:選版型 → 左邊填 JSON 文字 → 右邊即時出圖 → 下載 SVG/PNG。
//   設計固定在版型裡,使用者只給文字。改文字即時重繪。

import { TEMPLATES } from './templates.js';

const $ = (s) => document.querySelector(s);
const input = $('#input');
const preview = $('#preview');
const errBox = $('#err');
const toast = $('#toast');

let currentId = Object.keys(TEMPLATES)[0];
let lastSvg = '';

function loadTemplate(id) {
  currentId = id;
  input.value = JSON.stringify(TEMPLATES[id].defaultData, null, 2);
  rerender();
}

function rerender() {
  const tpl = TEMPLATES[currentId];
  let data;
  try { data = JSON.parse(input.value); }
  catch (e) { errBox.hidden = false; errBox.textContent = 'JSON 解析失敗:' + e.message; return; }
  errBox.hidden = true;
  try {
    lastSvg = tpl.render(data);
    preview.innerHTML = lastSvg;
  } catch (e) {
    errBox.hidden = false; errBox.textContent = '出圖失敗:' + e.message;
  }
}

let timer;
input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(rerender, 200); });

// 版型下拉
const sel = $('#templates');
for (const [id, t] of Object.entries(TEMPLATES)) {
  const o = document.createElement('option'); o.value = id; o.textContent = t.label; sel.appendChild(o);
}
sel.value = currentId;
sel.addEventListener('change', () => loadTemplate(sel.value));

// 下載
$('#download').addEventListener('change', (e) => {
  const k = e.target.value; e.target.value = '';
  if (k === 'svg') downloadSvg();
  else if (k === 'png') downloadPng();
});

function showToast(m) { toast.textContent = m; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 1600); }

function downloadSvg() {
  if (!lastSvg) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lastSvg], { type: 'image/svg+xml;charset=utf-8' }));
  a.download = currentId + '.svg'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function downloadPng() {
  if (!lastSvg) return;
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width * 2; canvas.height = img.height * 2;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = currentId + '.png'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  };
  img.onerror = () => showToast('PNG 轉檔失敗');
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(lastSvg);
}

// 啟動
loadTemplate(currentId);
