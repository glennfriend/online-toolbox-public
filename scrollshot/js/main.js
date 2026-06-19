// main.js — 殼層:串接 DOM、流程、服務選擇、下載 / 複製。
//
// 跑流程時逐步顯示訊息:解析網址 → 判斷服務 → 調用 API → 產生圖片。
// 每完成一步,該行從「--」變「→」並補上細節(服務名稱、圖片大小);
// 任一步失敗就標成 ❌,滑鼠移上去看實際錯誤訊息。
// 核心不認識特定服務:服務由 services/ 提供。

import { SERVICES, getService } from './services/index.js';
import { downloadBlob } from './lib/download.js';
import { copyImageBlob } from './lib/clipboard.js';

const qs = (sel) => document.querySelector(sel);
const form = qs('#form');
const urlInput = qs('#url');
const goBtn = qs('#go');
const fullpageChk = qs('#fullpage');
const serviceSel = qs('#service');
const stepsEl = qs('#steps');
const result = qs('#result');
const actions = qs('#actions');
const downloadBtn = qs('#download');
const copyBtn = qs('#copy');
const openOrig = qs('#openorig');
const toast = qs('#toast');

let currentBlob = null;    // 可下載/複製的影像(取不到 = null)
let currentUrl = null;     // 顯示用 / 原圖網址
let currentName = 'screenshot.png';
let steps = [];            // 目前流程的步驟狀態

// 流程的四個步驟(文字會隨進度補上細節:服務名稱、圖片大小)
const STEP_DEFS = [
  { text: '解析輸入的網址' },
  { text: '判斷使用哪個截圖服務' },
  { text: '調用截圖服務 API 進行截圖' },
  { text: '產生圖片' },
];

// 填服務下拉選單
SERVICES.forEach((s) => {
  const opt = document.createElement('option');
  opt.value = s.id; opt.textContent = s.name;
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
  steps = STEP_DEFS.map((d) => ({ text: d.text, state: 'pending' }));
  renderSteps();
  clearResult();
  actions.hidden = true;
  currentBlob = null; currentUrl = null;

  // 1) 解析網址
  const url = normalizeUrl(urlInput.value.trim());
  if (!url) { fail(0, '網址格式不正確,例如 https://example.com'); return; }
  done(0);

  // 2) 判斷使用哪個服務
  const svc = getService(serviceSel.value);
  steps[1].text = `判斷使用 ${svc.shortName} 服務`;
  done(1);

  // 3) 調用 API 截圖
  steps[2].text = `調用 ${svc.shortName} API 進行截圖`;
  renderSteps();
  setBusy(true);
  try {
    const shot = await svc.capture(url, { fullPage: fullpageChk.checked });
    done(2);

    showImage(shot.imageUrl);
    currentUrl = shot.imageUrl;
    currentName = deriveName(url, fullpageChk.checked);
    openOrig.href = shot.imageUrl;

    // 4) 產生圖片(取得可下載/複製的 blob + 大小;取不到就降級為「顯示 + 原圖另存」)
    if (shot.getBlob) { try { currentBlob = await shot.getBlob(); } catch { currentBlob = null; } }
    const size = currentBlob ? `（${formatSize(currentBlob.size)}）` : '';
    steps[3].text = `產生圖片${size}`;
    done(3);

    actions.hidden = false;
    copyBtn.disabled = !(currentBlob && navigator.clipboard && window.ClipboardItem);
  } catch (err) {
    fail(2, err.message || '未知錯誤');   // 調用 API 失敗 → 標紅,產生圖片留待(--)
  } finally {
    setBusy(false);
  }
}

// ── 步驟狀態 ──
function done(i) { steps[i].state = 'done'; renderSteps(); }
function fail(i, message) { steps[i].state = 'error'; steps[i].error = message; renderSteps(); }

function renderSteps() {
  stepsEl.innerHTML = steps.map((s) => {
    if (s.state === 'error') {
      return `<div class="step err" title="${escAttr(s.error || '')}">`
        + `<span class="mark">❌</span> ${esc(s.text)} — 失敗 <span class="why">(滑鼠移上看原因)</span></div>`;
    }
    const mark = s.state === 'done' ? '→' : '--';
    return `<div class="step ${s.state}"><span class="mark">${mark}</span> ${esc(s.text)}</div>`;
  }).join('');
}

// ── 顯示 ──
function showImage(src) {
  clearResult();
  const img = document.createElement('img');
  img.className = 'shot';
  img.src = src; img.alt = '截圖'; img.title = '點擊開新分頁看原圖';
  img.addEventListener('click', () => window.open(src, '_blank', 'noopener'));
  img.addEventListener('error', () => {
    clearResult();
    actions.hidden = true;
    fail(3, '圖片載入失敗(該網址可能無法被截圖,或服務暫時無法使用)');
  });
  result.appendChild(img);
}

function clearResult() { result.innerHTML = ''; }

function setBusy(busy) { goBtn.disabled = busy; goBtn.textContent = busy ? '截圖中…' : '截圖'; }

let toastTimer;
function showToast(message) {
  toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

// ── 工具 ──
// 沒有協定就補 https://;用 URL 物件驗證,壞掉回 null
function normalizeUrl(raw) {
  if (!raw) return null;
  const s = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
  try { return new URL(s).href; } catch { return null; }
}
function formatSize(bytes) {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
function deriveName(url, fullPage) {
  let host = 'screenshot';
  try { host = new URL(url).hostname; } catch { /* 用預設 */ }
  return `${host}${fullPage ? '-fullpage' : ''}.png`;
}
function esc(s) { return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
function escAttr(s) { return esc(s).replace(/"/g, '&quot;'); }
