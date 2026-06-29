// 殼層:文件庫(localStorage)+ 編輯器 + 預覽 + 檢視模式 + theme,串接 renderer 與 module。
//
// 核心不認識任何具體功能;能渲染什麼,由 modules/ 各模組登記進 registry 決定。
// 新增功能 module = 新增 modules/xxx.js + 下方加一行 import。

import { render, enhance } from './renderer.js';
import { moduleCss } from './registry.js';
import * as store from './store.js';

// ── 掛載功能 module(可插拔)──
import './modules/highlight.js';
import './modules/codeblock.js';
import './modules/table-tools.js';
import './modules/mark.js';
import './modules/katex.js';
import './modules/link-attributes.js';
import './modules/task-lists.js';

const $ = (s) => document.querySelector(s);
const el = {
  list: $('#doc-list'), newBtn: $('#new-doc'),
  editor: $('#editor'), preview: $('#preview'),
  panes: $('#panes'),
  modeSplit: $('#mode-split'), modeEdit: $('#mode-edit'), modeView: $('#mode-view'),
  theme: $('#theme'), themeLink: $('#theme-link'),
};

const SAVE_DELAY = 250;
const VIEW_KEY = 'markdown.view';
const THEME_KEY = 'markdown.theme';
const THEMES = ['default', 'github'];   // 加主題 = 丟一個 themes/<name>.css + 在這裡加名字

// 內建文件(固定 id、不可刪、置頂):從 docs/*.md 載入(同源,離線可用)。
const BUILTINS = [
  [store.DEMO_ID, 'docs/demo.md'],
  ['__p-mark__', 'docs/mark.md'],
  ['__p-katex__', 'docs/katex.md'],
  ['__p-linkattr__', 'docs/link-attributes.md'],
  ['__p-tasklist__', 'docs/task-lists.md'],
  ['__p-tabletools__', 'docs/table-tools.md'],
];

// 注入 module 自帶的 css(若有)
const mcss = moduleCss();
if (mcss) { const s = document.createElement('style'); s.textContent = mcss; document.head.appendChild(s); }

let currentId = null;
let renderSeq = 0;

// 預覽:render 是 async(核心延遲載入),用序號丟棄過時的渲染。
async function renderPreview(text) {
  const seq = ++renderSeq;
  const html = await render(text);
  if (seq !== renderSeq) return;
  el.preview.innerHTML = html;
  await enhance(el.preview);
}

function openDoc(id) {
  const doc = store.list().find((d) => d.id === id);
  if (!doc) return;
  currentId = doc.id;
  store.open(doc.id);
  el.editor.value = doc.content;
  renderList();
  renderPreview(doc.content);
}

function renderList() {
  el.list.replaceChildren();
  for (const doc of store.list()) {
    const li = document.createElement('li');
    li.className = 'doc-item' + (doc.id === currentId ? ' active' : '');
    const name = document.createElement('button');
    name.type = 'button';
    name.className = 'doc-name';
    name.textContent = doc.title || '未命名';
    name.addEventListener('click', () => openDoc(doc.id));
    if (store.isProtected(doc.id)) {
      const pin = document.createElement('span');
      pin.className = 'doc-pin';
      pin.textContent = '📌';
      pin.title = '內建示範,不可刪除';
      li.append(name, pin);
    } else {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'doc-del';
      del.textContent = '×';
      del.title = '刪除';
      del.addEventListener('click', (e) => { e.stopPropagation(); deleteDoc(doc); });
      li.append(name, del);
    }
    el.list.appendChild(li);
  }
}

function deleteDoc(doc) {
  if (!confirm(`刪除「${doc.title || '未命名'}」?`)) return;
  store.remove(doc.id);
  const cur = store.getCurrent();
  openDoc(cur ? cur.id : store.DEMO_ID);
}

// ── 自動儲存(輸入後 debounce 存回目前文件)──
let saveTimer;
el.editor.addEventListener('input', () => {
  const text = el.editor.value;
  renderPreview(text);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    store.update(currentId, text);
    renderList();   // 標題可能變(取自第一行)
  }, SAVE_DELAY);
});

el.newBtn.addEventListener('click', () => { openDoc(store.create('').id); el.editor.focus(); });

// ── 檢視模式:左右 / 編輯 / 預覽 ──
function setMode(mode) {
  el.panes.className = 'panes mode-' + mode;
  el.modeSplit.classList.toggle('active', mode === 'split');
  el.modeEdit.classList.toggle('active', mode === 'edit');
  el.modeView.classList.toggle('active', mode === 'view');
  localStorage.setItem(VIEW_KEY, mode);
}
el.modeSplit.addEventListener('click', () => setMode('split'));
el.modeEdit.addEventListener('click', () => setMode('edit'));
el.modeView.addEventListener('click', () => setMode('view'));

// ── 主題:換 themes/<name>.css ──
function setTheme(name) {
  if (!THEMES.includes(name)) name = 'default';
  el.themeLink.href = `themes/${name}.css`;
  el.theme.value = name;
  localStorage.setItem(THEME_KEY, name);
}
el.theme.addEventListener('change', () => setTheme(el.theme.value));
// 上下鍵即時套用(聚焦在主題選單時,按 ↑/↓ 就換並套用,不必先 commit)。
el.theme.addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  e.preventDefault();
  const n = el.theme.options.length;
  el.theme.selectedIndex = (el.theme.selectedIndex + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
  setTheme(el.theme.value);
});

// 從 docs/*.md 載入內建文件,並以 .md 為準更新(它們是參考文件,永遠保持最新)。
async function seedBuiltins() {
  for (const [id, url] of BUILTINS) {
    try {
      const txt = await (await fetch(url)).text();
      store.upsertBuiltin(id, txt);   // 每次載入都以 .md 為準更新(內容沒變則不寫)
    } catch (err) {
      console.error('[markdown] 載入內建文件失敗:', url, err);
    }
  }
}

// ── 啟動 ──
(async function init() {
  for (const t of THEMES) {
    const o = document.createElement('option');
    o.value = t; o.textContent = t;
    el.theme.appendChild(o);
  }
  setTheme(localStorage.getItem(THEME_KEY) || 'default');
  setMode(localStorage.getItem(VIEW_KEY) || 'split');
  store.pruneBuiltins(BUILTINS.map(([id]) => id));   // 清掉已移除的舊內建文件(如 anchor)
  await seedBuiltins();
  openDoc(store.getCurrent()?.id || store.DEMO_ID);
})();
