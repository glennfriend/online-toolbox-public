// main.js — 編輯器殼層(calcpad 式):左 JSON、右即時預覽。
//   - 小改即時編進網址(#hash),可「複製連結」分享/重現。
//   - 「劇本」下拉載入版本控管裡存好的漫畫(scripts/index.json)。
//   - 下載 SVG / PNG(2x)。

import { renderComic } from './renderer.js';
import { encode, decode } from './urlsync.js';

const $ = (s) => document.querySelector(s);
const input = $('#input');
const preview = $('#preview');
const warnBox = $('#warnings');
const toast = $('#toast');

const DEFAULT_SCRIPT = {
  version: 1,
  title: '範例',
  layout: 'single',
  panels: [{
    bg: 'plain',
    cast: [{ char: 'bun', pos: 'right', emotion: 'happy' }],
    bubbles: [{ speaker: 'bun', type: 'speech', text: '把 JSON 貼進左邊,右邊就出圖!' }],
  }],
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

// ── 網址同步(小改即時編進 #hash)──
function syncUrl() {
  const encoded = encode(input.value);
  history.replaceState(null, '', encoded ? `#${encoded}` : location.pathname + location.search);
}

let timer;
input.addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(() => { rerender(); syncUrl(); }, 200);
});

// ── 提示 toast ──
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

// ── 存好的劇本下拉(版本控管:scripts/*.json)──
async function loadScriptList() {
  try {
    const list = await (await fetch('scripts/index.json', { cache: 'no-store' })).json();
    const sel = $('#scripts');
    for (const it of list) {
      const opt = document.createElement('option');
      opt.value = it.file; opt.textContent = it.name;
      sel.appendChild(opt);
    }
    sel.addEventListener('change', async () => {
      if (!sel.value) return;
      try {
        const txt = await (await fetch('scripts/' + sel.value, { cache: 'no-store' })).text();
        input.value = JSON.stringify(JSON.parse(txt), null, 2);
        rerender(); syncUrl();
      } catch (err) {
        showToast('劇本載入失敗');
        console.error('[comic] 劇本載入失敗', sel.value, err);
      }
      sel.value = '';
    });
  } catch (err) {
    console.warn('[comic] 讀不到 scripts/index.json', err);
  }
}

$('#copy-link').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); showToast('已複製連結'); }
  catch { showToast('複製失敗,請手動複製網址'); }
});

// 下載下拉:選 SVG / PNG 即下載,之後重置回 "Download"
$('#download').addEventListener('change', (e) => {
  const kind = e.target.value;
  e.target.value = '';
  if (kind === 'svg') downloadSvg();
  else if (kind === 'png') downloadPng();
});

function downloadSvg() {
  if (!lastSvg) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lastSvg], { type: 'image/svg+xml;charset=utf-8' }));
  a.download = 'comic.svg';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function downloadPng() {
  if (!lastSvg) return;
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width * 2; canvas.height = img.height * 2;   // 2x 解析度
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'comic.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  };
  img.onerror = () => showToast('PNG 轉檔失敗');
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(lastSvg);
}

// ── 啟動 ──
(function init() {
  const hash = location.hash.slice(1);
  if (hash) {
    try { input.value = decode(hash); } catch { input.value = JSON.stringify(DEFAULT_SCRIPT, null, 2); }
  } else {
    input.value = JSON.stringify(DEFAULT_SCRIPT, null, 2);
  }
  rerender();
  loadScriptList();
})();
