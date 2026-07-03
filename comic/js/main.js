// main.js — 編輯器殼層:左 JSON、右即時預覽 + 下載 SVG/PNG。

import { renderComic } from './renderer.js';

const $ = (s) => document.querySelector(s);
const input = $('#input');
const preview = $('#preview');
const warnBox = $('#warnings');

const EXAMPLE = {
  version: 1,
  layout: 'single',
  title: '示範',
  panels: [
    {
      bg: 'plain',
      cast: [{ char: 'bun', pos: 'right', emotion: 'happy' }],
      bubbles: [{ speaker: 'bun', type: 'speech', text: '今天也要好好吃飯!' }],
    },
  ],
};

let lastSvg = '';

function rerender() {
  let script;
  try {
    script = JSON.parse(input.value);
  } catch (err) {
    preview.innerHTML = `<p class="err">JSON 解析失敗:${String(err.message).replace(/</g, '&lt;')}</p>`;
    warnBox.hidden = true;
    return;
  }
  const { svg, warnings } = renderComic(script);
  lastSvg = svg;
  preview.innerHTML = svg;
  warnBox.hidden = !warnings.length;
  warnBox.textContent = warnings.map((w) => `⚠ ${w}`).join('\n');
  for (const w of warnings) console.warn('[comic]', w);
}

let timer;
input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(rerender, 150); });

$('#example').addEventListener('click', () => {
  input.value = JSON.stringify(EXAMPLE, null, 2);
  rerender();
});

$('#dl-svg').addEventListener('click', () => {
  if (!lastSvg) return;
  const blob = new Blob([lastSvg], { type: 'image/svg+xml;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'comic.svg';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$('#dl-png').addEventListener('click', () => {
  if (!lastSvg) return;
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width * 2;                       // 2x 解析度
    canvas.height = img.height * 2;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'comic.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  };
  img.onerror = () => console.error('[comic] PNG 轉檔失敗:SVG 無法載入為圖片');
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(lastSvg);
});

// 啟動:直接帶入範例
input.value = JSON.stringify(EXAMPLE, null, 2);
rerender();
