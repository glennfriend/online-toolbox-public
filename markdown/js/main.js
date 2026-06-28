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
const THEMES = ['default'];   // 加主題 = 丟一個 themes/<name>.css + 在這裡加名字

const WELCOME = [
  '# 歡迎使用 Markdown',
  '',
  '這是一份**本機筆記**,邊打邊自動存。左側可新增 / 切換文件,上方可切換檢視模式與主題。',
  '',
  '## 程式碼上色',
  '',
  '```js',
  'const greet = (name) => `Hi, ${name}`;',
  'console.log(greet("world"));',
  '```',
  '',
  '```json',
  '{ "name": "demo", "ok": true, "n": 42 }',
  '```',
  '',
  '```php',
  '<?php echo "hello " . strtoupper("world"); ?>',
  '```',
  '',
  '> 安全:原始 HTML 一律當文字顯示 —— <b>這不會變粗體</b>',
].join('\n');

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
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'doc-del';
    del.textContent = '×';
    del.title = '刪除';
    del.addEventListener('click', (e) => { e.stopPropagation(); deleteDoc(doc); });
    li.append(name, del);
    el.list.appendChild(li);
  }
}

function deleteDoc(doc) {
  if (!confirm(`刪除「${doc.title || '未命名'}」?`)) return;
  store.remove(doc.id);
  const cur = store.getCurrent();
  openDoc(cur ? cur.id : store.create(WELCOME).id);
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

// ── 啟動 ──
for (const t of THEMES) {
  const o = document.createElement('option');
  o.value = t; o.textContent = t;
  el.theme.appendChild(o);
}
setTheme(localStorage.getItem(THEME_KEY) || 'default');
setMode(localStorage.getItem(VIEW_KEY) || 'split');
openDoc(store.getCurrent()?.id || store.create(WELCOME).id);
