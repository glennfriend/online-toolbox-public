// main.js — 殼層:DOM 參照、handler 登記表、共用 ctx、儲存庫清單。
//
// 核心不認識任何具體內容類型;所有「顯示 / 開啟 / 複製 / chip 標籤與顏色」都由
// handlers/ 裡的模組提供並 registerHandler 進來。
// 新增一種內容類型 = 寫一個 handler 模組 + 下方加一行 initXxxHandler(ctx);移除 = 反向操作。

import { addItem, removeItem, loadItems, storageEstimate, saveDraft, loadDraft, clearDraft } from './storage.js';
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

// 輸入框「已載入 / 已儲存」的內容快照;與它不同且非空 = 有未存變動(dirty)。
// 切去開別筆而當下 dirty 時,先把輸入塞進「暫存區」,避免不小心弄丟(見 openItem)。
let currentBaseline = '';

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
  // handler 存好目前輸入後告知殼層:此刻輸入已是「已儲存」狀態,不再算未存變動。
  markInputSaved: () => { currentBaseline = input.value; },
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
async function refreshSaved(opts = {}) {
  await renderSavedList(opts);
  await renderStorageStatus();
}

async function renderSavedList(opts = {}) {
  const items = await loadItems();
  const draft = await loadDraft();
  savedList.innerHTML = '';
  if (!items.length && !draft) {
    savedList.innerHTML = '<span class="hint">尚無儲存的內容。</span>';
    return;
  }
  if (draft) savedList.appendChild(buildDraftChip(draft, opts.flashDraft)); // 暫存區永遠在第一格
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

// 暫存區 chip:單一、置頂、樣式不同;被覆蓋時(flash=true)閃一下,讓使用者知道「又被蓋過一次」。
function buildDraftChip(draft, flash) {
  const chip = document.createElement('div');
  chip.className = 'chip chip-draft' + (flash ? ' flash' : '');

  const label = document.createElement('button');
  label.type = 'button';
  label.className = 'chip-label';
  label.textContent = `暫存 · ${draft.title}`;
  label.title = '點擊把這份未儲存的暫存還原到輸入框';
  label.addEventListener('click', () => restoreDraft());

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'chip-del';
  del.textContent = '✕';
  del.title = '丟棄暫存';
  del.addEventListener('click', async () => {
    if (!confirm('確定要丟棄這份暫存嗎?')) return;
    await clearDraft();
    await refreshSaved();
  });

  chip.append(label, del);
  return chip;
}

// 開啟一筆已儲存的 item:不再事事詢問。若目前輸入有「未存變動」,先自動塞進暫存區
// (單格覆蓋,只保護最近一次),再切過去 → 常切換不被干擾,有輸入也不會弄丟。
async function openItem(item) {
  if (isInputDirty()) await stashCurrentInput();
  const handler = handlers[item.type];
  if (handler) handler.open(item);
  currentBaseline = item.type === 'text' ? item.payload : ''; // 圖片沒有對應文字 → 視為空
}

// 輸入非空,且和「已載入/已儲存」的快照不同 → 有未存變動
function isInputDirty() {
  const v = input.value;
  return v.trim() !== '' && v !== currentBaseline;
}

async function stashCurrentInput() {
  await saveDraft(input.value);
  await refreshSaved({ flashDraft: true }); // 暫存區內容變了 → 閃一下
}

// 還原暫存區:把暫存內容放回輸入框。
//  • 目前輸入是乾淨的 → 暫存區用完即消失。
//  • 目前輸入也有未存變動 → 兩者「交換」(手上的換進暫存區),兩邊都不丟。
async function restoreDraft() {
  const draft = await loadDraft();
  if (!draft) return;
  if (isInputDirty()) {
    const current = input.value;          // 先記下手上的未存內容
    loadTextIntoInput(draft.payload);      // 暫存內容 → 輸入框
    await saveDraft(current);              // 手上的 → 暫存區(交換)
    await refreshSaved({ flashDraft: true });
  } else {
    loadTextIntoInput(draft.payload);
    await clearDraft();
    await refreshSaved();
  }
}

// 把一段文字載入輸入框,並讓 text handler 重新 render 顯示版(用 input 事件,維持解耦)。
function loadTextIntoInput(text) {
  input.value = text;
  currentBaseline = text;                  // 視為已載入,沒未存變動
  input.dispatchEvent(new Event('input'));
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
