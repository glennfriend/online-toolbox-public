// main.js — 殼層:串接 DOM、流程、服務選擇、下載 / 複製、錯誤與提示。
//
// 核心不認識任何特定截圖服務:服務由 services/ 模組提供(capture 回傳可顯示的圖網址,
// 可選 getBlob 提供可下載/複製的影像)。新增服務只要動 services/,這裡不用改。

import { SERVICES, getService } from './services/index.js';
import { downloadBlob } from './lib/download.js';
import { copyImageBlob } from './lib/clipboard.js';

const qs = (sel) => document.querySelector(sel);
const form = qs('#form');
const urlInput = qs('#url');
const goBtn = qs('#go');
const fullpageChk = qs('#fullpage');
const serviceSel = qs('#service');
const statusEl = qs('#status');
const result = qs('#result');
const actions = qs('#actions');
const downloadBtn = qs('#download');
const copyBtn = qs('#copy');
const openOrig = qs('#openorig');
const toast = qs('#toast');

// 目前這張截圖的狀態
let currentBlob = null;    // 可下載/複製的影像(取不到 = null)
let currentUrl = null;     // 顯示用 / 原圖網址
let currentName = 'screenshot.png';

// 填服務下拉選單
SERVICES.forEach((s) => {
  const opt = document.createElement('option');
  opt.value = s.id;
  opt.textContent = s.name;
  serviceSel.appendChild(opt);
});

form.addEventListener('submit', (e) => { e.preventDefault(); run(); });

downloadBtn.addEventListener('click', () => {
  if (currentBlob) downloadBlob(currentBlob, currentName);
  else if (currentUrl) window.open(currentUrl, '_blank', 'noopener'); // 無 blob → 開原圖讓使用者另存
});

copyBtn.addEventListener('click', async () => {
  if (!currentBlob) return;
  try { await copyImageBlob(currentBlob); showToast('已複製圖片'); }
  catch (err) { showToast(err.message || '複製失敗'); }
});

async function run() {
  const url = normalizeUrl(urlInput.value.trim());
  if (!url) { showToast('請輸入正確的網址,例如 https://example.com'); return; }

  const svc = getService(serviceSel.value);
  setBusy(true);
  setStatus('截圖中…(整頁可能要幾秒)');
  clearResult();
  actions.hidden = true;
  currentBlob = null; currentUrl = null;

  try {
    const shot = await svc.capture(url, { fullPage: fullpageChk.checked });
    showImage(shot.imageUrl);
    currentUrl = shot.imageUrl;
    currentName = deriveName(url, fullpageChk.checked);
    openOrig.href = shot.imageUrl;

    // 嘗試取得可下載/複製的 blob(取不到就降級:仍能顯示、用「原圖」另存)
    if (shot.getBlob) {
      try { currentBlob = await shot.getBlob(); } catch { currentBlob = null; }
    }

    actions.hidden = false;
    copyBtn.disabled = !(currentBlob && navigator.clipboard && window.ClipboardItem);

    const dims = shot.meta ? `${shot.meta.width}×${shot.meta.height}` : '';
    setStatus(currentBlob
      ? `完成${dims ? ' · ' + dims : ''}`
      : `完成${dims ? ' · ' + dims : ''} ·(此服務不支援複製,請用「原圖」另存)`);
  } catch (err) {
    clearResult();
    setStatus('');
    showError(err.message || '截圖失敗');
  } finally {
    setBusy(false);
  }
}

// ── 顯示 ──
function showImage(src) {
  clearResult();
  const img = document.createElement('img');
  img.className = 'shot';
  img.src = src;
  img.alt = '截圖';
  img.title = '點擊開新分頁看原圖';
  img.addEventListener('click', () => window.open(src, '_blank', 'noopener'));
  img.addEventListener('error', () => {
    clearResult();
    showError('圖片載入失敗(該網址可能無法被截圖,或服務暫時無法使用)');
  });
  result.appendChild(img);
}

function clearResult() { result.innerHTML = ''; }

// ── 狀態 / 提示 ──
function setBusy(busy) {
  goBtn.disabled = busy;
  goBtn.textContent = busy ? '截圖中…' : '截圖';
}
function setStatus(text) { statusEl.textContent = text; statusEl.classList.remove('err'); }
function showError(text) { statusEl.textContent = text; statusEl.classList.add('err'); }

let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

// ── 工具 ──
// 沒有協定就補 https://;用 URL 物件驗證,壞掉回 null
function normalizeUrl(raw) {
  if (!raw) return null;
  const s = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
  try { return new URL(s).href; } catch { return null; }
}

function deriveName(url, fullPage) {
  let host = 'screenshot';
  try { host = new URL(url).hostname; } catch { /* 用預設 */ }
  return `${host}${fullPage ? '-fullpage' : ''}.png`;
}
