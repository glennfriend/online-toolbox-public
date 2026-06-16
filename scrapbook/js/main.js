// main.js — 殼層:DOM 參照、handler 登記表、共用 ctx、儲存庫清單。
//
// 核心不認識任何具體內容類型;所有「顯示 / 開啟 / 複製 / chip 標籤與顏色」都由
// handlers/ 裡的模組提供並 registerHandler 進來。
// 新增一種內容類型 = 寫一個 handler 模組 + 下方加一行 initXxxHandler(ctx);移除 = 反向操作。

import { addItem, removeItem, loadItems, storageEstimate } from './storage.js';
import { initTextHandler } from './handlers/text.js';
import { initImageHandler } from './handlers/image.js';

const qs = (sel) => document.querySelector(sel);
const input = qs('#input');
const display = qs('#display');
const badge = qs('#badge');
const saveBtn = qs('#save');
const copyBtn = qs('#copy');
const displayActions = display.closest('.pane').querySelector('.pane-actions');
const savedList = qs('#saved');
const storageStatus = qs('#storage-status');
const toast = qs('#toast');

// ── handler 登記表 + 顯示版狀態 ──
const handlers = {};
let copyHandler = null;             // 複製按鈕實際呼叫的函式(由目前顯示內容的 handler 設定)
const displayChangeListeners = []; // 顯示版內容換了 → 通知各 handler(收掉自己的控制項等)

// 提供給各 handler 的共用服務
const ctx = {
  input, display, badge, saveBtn, displayActions,
  registerHandler: (handler) => { handlers[handler.type] = handler; },
  setDisplay: (content) => {
    if (content instanceof Node) display.replaceChildren(content);
    else display.innerHTML = content;
  },
  setBadge: (text) => { badge.textContent = text; },
  setCopyHandler: (fn) => { copyHandler = fn; },
  addItem,
  refreshSaved,
  showToast,
  notifyDisplayChanged: (type) => displayChangeListeners.forEach((cb) => cb(type)),
  onDisplayChanged: (cb) => displayChangeListeners.push(cb),
};

// ── 複製(實際行為交給目前的 copyHandler) ──
copyBtn.addEventListener('click', async () => {
  try {
    if (copyHandler) await copyHandler();
  } catch {
    showToast('複製失敗,請手動選取');
  }
});

// ── 儲存庫:清單 + 空間狀態一起更新 ──
async function refreshSaved() {
  await renderSavedList();
  await renderStorageStatus();
}

async function renderSavedList() {
  const items = await loadItems();
  savedList.innerHTML = '';
  if (!items.length) {
    savedList.innerHTML = '<span class="hint">尚無儲存的內容。</span>';
    return;
  }
  items.forEach((item) => savedList.appendChild(buildChip(item)));
}

async function renderStorageStatus() {
  const est = await storageEstimate();
  if (!est) { storageStatus.textContent = ''; return; }
  const usedMB = (est.usage / 1024 / 1024).toFixed(1);
  const quotaMB = (est.quota / 1024 / 1024).toFixed(0);
  storageStatus.textContent = `已用 ${est.percent.toFixed(1)}%(${usedMB} MB / ${quotaMB} MB)`;
}

function buildChip(item) {
  const handler = handlers[item.type];
  const chip = document.createElement('div');
  chip.className = `chip ${handler && handler.category ? handler.category(item) : 'cat-plain'}`;

  const label = document.createElement('button');
  label.type = 'button';
  label.className = 'chip-label';
  label.textContent = handler && handler.label ? handler.label(item) : item.title;
  label.title = '點擊開啟';
  label.addEventListener('click', () => openItem(item));

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'chip-del';
  del.textContent = '✕';
  del.title = '刪除';
  del.addEventListener('click', async () => {
    if (!confirm(`確定要刪除「${item.title}」嗎?`)) return;
    await removeItem(item.id);
    await refreshSaved();
  });

  chip.append(label, del);
  return chip;
}

// 開啟一筆已儲存的 item:交給對應 handler 把「輸入 + 顯示」切到這筆。
// 防呆:輸入框已有內容時,先 confirm 再替換。
function openItem(item) {
  if (input.value.trim() && !confirm('要用這筆內容替換目前輸入框/顯示的內容嗎?')) return;
  const handler = handlers[item.type];
  if (handler) handler.open(item);
}

// ── 提示 toast ──
let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

// ── 掛載 handlers(可插拔) ──
initTextHandler(ctx);
initImageHandler(ctx);

// ── 啟動 ──
refreshSaved();
