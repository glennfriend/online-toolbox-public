// main.js — 殼層:串接 DOM、流程、服務「失效自動切換」、下載 / 複製。
//
// 截圖服務有時候會不能用,所以這裡會「依序嘗試」多家服務(services/ 的順序),
// 第一個能成功產出可載入圖片的就用它,並把它記下來(localStorage),下次優先用。
// 只要某一家失敗(API 報錯、或回的圖載不出來)就自動換下一家。
//
// 跑流程時逐步顯示訊息;失敗的嘗試標 ✗、可 hover 看原因。
// 核心不認識特定服務:服務由 services/ 提供。

import { SERVICES, getServiceById } from './services/index.js';
import { downloadBlob } from './lib/download.js';
import { copyImageBlob } from './lib/clipboard.js';

const qs = (sel) => document.querySelector(sel);
const form = qs('#form');
const urlInput = qs('#url');
const goBtn = qs('#go');
const fullpageChk = qs('#fullpage');
const svcOrderEl = qs('#svcorder');
const stepsEl = qs('#steps');
const result = qs('#result');
const actions = qs('#actions');
const downloadBtn = qs('#download');
const copyBtn = qs('#copy');
const openOrig = qs('#openorig');
const toast = qs('#toast');

const LAST_KEY = 'scrollshot:lastService'; // 記住「最後一次成功的服務」

let currentBlob = null;    // 可下載/複製的影像(取不到 = null)
let currentUrl = null;     // 顯示用 / 原圖網址
let currentName = 'screenshot.png';
let steps = [];            // 目前流程的步驟狀態

updateSvcOrder();
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
  steps = [
    { text: '解析輸入的網址', state: 'pending' },
    { text: '截圖服務(失效自動切換)', state: 'pending', attempts: [] },
    { text: '產生圖片', state: 'pending' },
  ];
  renderSteps();
  clearResult();
  actions.hidden = true;
  currentBlob = null; currentUrl = null;

  // 1) 解析網址
  const url = normalizeUrl(urlInput.value.trim());
  if (!url) { fail(0, '網址格式不正確,例如 https://example.com'); return; }
  done(0);

  // 2) 依序嘗試各服務,第一個成功(且圖片載得出來)就用它
  setBusy(true);
  const order = orderedServices();
  let shot = null, usedSvc = null;
  for (const svc of order) {
    const attempt = { name: svc.shortName, state: 'trying' };
    steps[1].attempts.push(attempt); renderSteps();
    try {
      const s = await svc.capture(url, { fullPage: fullpageChk.checked });
      await verifyImage(s.imageUrl);   // 確認圖真的載得出來,否則視為失敗、換下一家
      attempt.state = 'ok'; shot = s; usedSvc = svc; renderSteps();
      break;
    } catch (err) {
      attempt.state = 'fail'; attempt.error = err.message || '失敗'; renderSteps();
    }
  }

  if (!shot) { steps[1].state = 'error'; steps[1].error = '所有服務都無法截圖'; renderSteps(); setBusy(false); return; }

  steps[1].state = 'done';
  steps[1].text = `截圖服務:使用 ${usedSvc.shortName}`;
  renderSteps();
  saveLastService(usedSvc.id);   // 記住這次成功的,下次優先用
  updateSvcOrder();

  showImage(shot.imageUrl);
  currentUrl = shot.imageUrl;
  currentName = deriveName(url, fullpageChk.checked);
  openOrig.href = shot.imageUrl;

  // 3) 產生圖片(取得可下載/複製的 blob + 大小;取不到就降級為「顯示 + 原圖另存」)
  if (shot.getBlob) { try { currentBlob = await shot.getBlob(); } catch { currentBlob = null; } }
  const size = currentBlob ? `（${formatSize(currentBlob.size)}）` : '（此服務不支援複製,可用「原圖」另存）';
  steps[2].text = `產生圖片${size}`;
  done(2);

  actions.hidden = false;
  copyBtn.disabled = !(currentBlob && navigator.clipboard && window.ClipboardItem);
  setBusy(false);
}

// 服務嘗試順序:上次成功的排第一,其餘照預設順序
function orderedServices() {
  const last = getServiceById(loadLastService());
  return last ? [last, ...SERVICES.filter((s) => s !== last)] : [...SERVICES];
}

// 確認影像網址真的能載入(用 <img>,跨網域也行,不需要 CORS);載不出來就 reject。
function verifyImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => reject(new Error('載入逾時')), 20000);
    img.onload = () => { clearTimeout(timer); resolve(); };
    img.onerror = () => { clearTimeout(timer); reject(new Error('回傳的圖片載入失敗')); };
    img.src = src;
  });
}

// ── 步驟狀態 ──
function done(i) { steps[i].state = 'done'; renderSteps(); }
function fail(i, message) { steps[i].state = 'error'; steps[i].error = message; renderSteps(); }

function renderSteps() {
  stepsEl.innerHTML = steps.map((s) => {
    let html;
    if (s.state === 'error') {
      html = `<div class="step err" title="${escAttr(s.error || '')}"><span class="mark">❌</span> ${esc(s.text)} — 失敗</div>`;
    } else {
      const mark = s.state === 'done' ? '→' : '--';
      html = `<div class="step ${s.state}"><span class="mark">${mark}</span> ${esc(s.text)}</div>`;
    }
    if (s.attempts && s.attempts.length) html += s.attempts.map(renderAttempt).join('');
    return html;
  }).join('');
}

function renderAttempt(a) {
  if (a.state === 'ok') return `<div class="attempt ok"><span class="mark">→</span> ${esc(a.name)} 成功</div>`;
  if (a.state === 'fail') return `<div class="attempt fail" title="${escAttr(a.error || '')}"><span class="mark">✗</span> ${esc(a.name)} 失敗(滑鼠移上看原因)</div>`;
  return `<div class="attempt trying"><span class="mark">…</span> 嘗試 ${esc(a.name)}…</div>`;
}

// ── 顯示 ──
function showImage(src) {
  clearResult();
  const img = document.createElement('img');
  img.className = 'shot';
  img.src = src; img.alt = '截圖'; img.title = '點擊開新分頁看原圖';
  img.addEventListener('click', () => window.open(src, '_blank', 'noopener'));
  result.appendChild(img);
}

function clearResult() { result.innerHTML = ''; }

function setBusy(busy) { goBtn.disabled = busy; goBtn.textContent = busy ? '截圖中…' : '截圖'; }

// 服務順序顯示(上次成功的排第一)
function updateSvcOrder() {
  svcOrderEl.textContent = orderedServices().map((s) => s.shortName).join(' → ') + '(自動切換)';
}

let toastTimer;
function showToast(message) {
  toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

// ── 記住最後一次成功的服務(localStorage:單一值用它最合適)──
function saveLastService(id) { try { localStorage.setItem(LAST_KEY, id); } catch { /* 隱私模式等可能不能寫,忽略 */ } }
function loadLastService() { try { return localStorage.getItem(LAST_KEY); } catch { return null; } }

// ── 工具 ──
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
function formatSize(bytes) {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
function esc(s) { return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
function escAttr(s) { return esc(s).replace(/"/g, '&quot;'); }
