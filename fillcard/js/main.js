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
input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { rerender(); autosave(); }, 200); });

// 版型下拉
const sel = $('#templates');
for (const [id, t] of Object.entries(TEMPLATES)) {
  const o = document.createElement('option'); o.value = id; o.textContent = t.label; sel.appendChild(o);
}
sel.value = currentId;
// 換版型 = 開一張全新草稿(脫離目前選中的存檔,才不會把預設值覆蓋回去)
sel.addEventListener('change', () => { setActive(null); loadTemplate(sel.value); });

// ── 已儲存的圖(localStorage;topbar 晶片列)─────────────────────────
//   儲存 = 建新晶片(最新在最左);點晶片 = 載入;× = 確認後刪除;
//   有選中的晶片時,每次改字都自動回存到那張。
const CARDS_KEY = 'fillcard.cards';
const ACTIVE_KEY = 'fillcard.activeId';
const cardsEl = $('#cards');
let cards = loadCards();
let activeId = localStorage.getItem(ACTIVE_KEY) || null;

function loadCards() { try { return JSON.parse(localStorage.getItem(CARDS_KEY)) || []; } catch { return []; } }
function persistCards() { localStorage.setItem(CARDS_KEY, JSON.stringify(cards)); }
function newId() { return crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(16).slice(2); }

function setActive(id) {
  activeId = id;
  if (id) localStorage.setItem(ACTIVE_KEY, id); else localStorage.removeItem(ACTIVE_KEY);
  renderChips();
}

// 晶片名稱 = title(其次 subtitle),最多 20 字。
function cardTitle(text, tplId) {
  let t = '';
  try { const d = JSON.parse(text); t = d.title || d.subtitle || ''; } catch {}
  t = String(t || (TEMPLATES[tplId] && TEMPLATES[tplId].label) || '未命名').replace(/\s+/g, ' ').trim();
  return t.length > 20 ? t.slice(0, 20) + '…' : t;
}

function renderChips() {
  cardsEl.innerHTML = '';
  for (const c of cards) {
    const chip = document.createElement('div');
    chip.className = 'card-chip' + (c.id === activeId ? ' active' : '');
    chip.title = c.title;
    const name = document.createElement('span'); name.className = 'chip-name'; name.textContent = c.title;
    const x = document.createElement('button'); x.className = 'chip-x'; x.textContent = '×'; x.title = '刪除';
    chip.append(name, x);
    chip.addEventListener('click', (e) => { if (e.target !== x) openCard(c.id); });
    x.addEventListener('click', (e) => { e.stopPropagation(); deleteCard(c.id); });
    cardsEl.appendChild(chip);
  }
}

function openCard(id) {
  const c = cards.find((x) => x.id === id); if (!c) return;
  currentId = TEMPLATES[c.templateId] ? c.templateId : Object.keys(TEMPLATES)[0];
  sel.value = currentId;
  input.value = c.data;      // 以程式設值不會觸發 input 事件 → 不會誤存
  setActive(id);
  rerender();
}

function saveNewCard() {
  const c = { id: newId(), templateId: currentId, data: input.value, title: cardTitle(input.value, currentId), updatedAt: Date.now() };
  cards.unshift(c);          // 最新放最左
  persistCards();
  setActive(c.id);
  showToast('已儲存');
}

function autosave() {
  if (!activeId) return;
  const c = cards.find((x) => x.id === activeId); if (!c) return;
  c.data = input.value; c.title = cardTitle(input.value, c.templateId); c.updatedAt = Date.now();
  persistCards();
  renderChips();
}

function deleteCard(id) {
  const c = cards.find((x) => x.id === id); if (!c) return;
  if (!confirm(`確定刪除「${c.title}」?`)) return;
  cards = cards.filter((x) => x.id !== id);
  persistCards();
  if (activeId === id) setActive(null); else renderChips();
}

$('#saveCard').addEventListener('click', saveNewCard);

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

// ── 可拖曳分隔線(記住寬度,全域共用一組)──
const workspace = $('.workspace');
const splitter = $('#splitter');
const SPLIT_KEY = 'fillcard.leftPx';
const saved = parseInt(localStorage.getItem(SPLIT_KEY), 10);
if (saved) workspace.style.setProperty('--left', saved + 'px');

let dragging = false;
splitter.addEventListener('pointerdown', (e) => {
  dragging = true; splitter.classList.add('dragging'); splitter.setPointerCapture(e.pointerId); e.preventDefault();
});
splitter.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const rect = workspace.getBoundingClientRect();
  const x = Math.max(200, Math.min(rect.width - 320, e.clientX - rect.left));
  workspace.style.setProperty('--left', Math.round(x) + 'px');
});
const endDrag = (e) => {
  if (!dragging) return;
  dragging = false; splitter.classList.remove('dragging');
  try { splitter.releasePointerCapture(e.pointerId); } catch {}
  const cur = parseInt(workspace.style.getPropertyValue('--left'), 10);
  if (cur) localStorage.setItem(SPLIT_KEY, cur);
};
splitter.addEventListener('pointerup', endDrag);
splitter.addEventListener('pointercancel', endDrag);

// 啟動:有存檔且上次選中的還在 → 直接開它;否則載入預設版型
renderChips();
if (activeId && cards.some((c) => c.id === activeId)) openCard(activeId);
else { setActive(null); loadTemplate(currentId); }
