// 殼層:文件庫(localStorage)+ 編輯器 + 預覽 + 檢視模式 + theme,串接 renderer 與 module。
//
// 核心不認識任何具體功能;能渲染什麼,由 modules/ 各模組登記進 registry 決定。
// 新增功能 module = 新增 modules/xxx.js + 下方加一行 import。

import { render, enhance } from './renderer.js';
import { moduleCss } from './registry.js';
import * as store from './store.js';
import './shortcuts.js';   // Alt 快速鍵提示(殼層 UI,非 markdown 模組)
import { setupResizers } from './resize.js';

// ── 掛載功能 module(可插拔)──
// mermaid 要先於 highlight / codeblock(post 依註冊順序執行):先把圖換掉,後兩者就不會碰它。
import './modules/mermaid.js';
import './modules/chart.js';
import './modules/json-format.js';
import './modules/highlight.js';
import './modules/codeblock.js';
import './modules/table-tools.js';
import './modules/mark.js';
import './modules/katex.js';
import './modules/link-attributes.js';
import './modules/task-lists.js';
import './modules/callout.js';

const $ = (s) => document.querySelector(s);
const el = {
  list: $('#doc-list'), newBtn: $('#new-doc'), sidebarToggle: $('#sidebar-toggle'),
  exportMenu: $('#export-menu'), exportToggle: $('#export-toggle'), exportPop: $('#export-pop'),
  downloadBtn: $('#download-html'), downloadPdfBtn: $('#download-pdf'),
  editor: $('#editor'), preview: $('#preview'),
  panes: $('#panes'),
  modeSplit: $('#mode-split'), modeEdit: $('#mode-edit'), modeView: $('#mode-view'),
  theme: $('#theme'), themeLink: $('#theme-link'),
};

const SAVE_DELAY = 250;
const VIEW_KEY = 'markdown.view';
const SIDEBAR_KEY = 'markdown.sidebar';
const THEME_KEY = 'markdown.theme';
const THEMES = ['default', 'github', 'pandoc'];   // 加主題 = 丟一個 themes/<name>.css + 在這裡加名字

// 內建文件(固定 id、不可刪、置頂):從 docs/*.md 載入(同源,離線可用)。
const BUILTINS = [
  [store.DEMO_ID, 'docs/demo.md'],
  ['__p-mark__', 'docs/mark.md'],
  ['__p-katex__', 'docs/katex.md'],
  ['__p-juniormath__', 'docs/junior-math.md'],
  ['__p-linkattr__', 'docs/link-attributes.md'],
  ['__p-tasklist__', 'docs/task-lists.md'],
  ['__p-tabletools__', 'docs/table-tools.md'],
  ['__p-mermaid__', 'docs/mermaid.md'],
  ['__p-chart__', 'docs/chart.md'],
  ['__p-callout__', 'docs/callout.md'],
];

// 注入 module 自帶的 css(若有)
const mcss = moduleCss();
if (mcss) { const s = document.createElement('style'); s.textContent = mcss; document.head.appendChild(s); }

let currentId = null;
let renderSeq = 0;
let applySplit = () => {};   // 由 setupResizers 提供:套用該文件記住的左右分割位置

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
  applySplit(doc.id);        // 套用這份文件記住的左右分割位置
  renderList();
  renderPreview(doc.content);
}

function renderList() {
  el.list.replaceChildren();
  let sepDone = false;
  for (const doc of store.list()) {
    const builtin = store.isProtected(doc.id);
    if (builtin && !sepDone) {   // 使用者文件與示範文件之間的分隔
      const sep = document.createElement('li');
      sep.className = 'doc-sep';
      sep.textContent = '示範';
      el.list.appendChild(sep);
      sepDone = true;
    }
    const li = document.createElement('li');
    li.className = 'doc-item' + (doc.id === currentId ? ' active' : '');
    const name = document.createElement('button');
    name.type = 'button';
    name.className = 'doc-name';
    name.textContent = doc.title || '未命名';
    name.addEventListener('click', () => openDoc(doc.id));
    li.appendChild(name);
    if (!builtin) {   // 只有使用者文件有刪除鈕;示範文件不可刪、也不放圖示
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'doc-del';
      del.textContent = '×';
      del.title = '刪除';
      del.addEventListener('click', (e) => { e.stopPropagation(); deleteDoc(doc); });
      li.appendChild(del);
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

// ── 側欄收合 ──
function setSidebar(collapsed) {
  document.body.classList.toggle('sidebar-collapsed', collapsed);
  localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
}
el.sidebarToggle.addEventListener('click', () => setSidebar(!document.body.classList.contains('sidebar-collapsed')));

// ── 下載成單一 HTML(CDN 式:存 markdown 原文 + 引用本站 render 模組 + CDN 庫,開啟時現場重渲染,跟這裡一樣)──
// 需先於 highlight/codeblock 的模組順序要跟本檔一致(mermaid/chart 先)。
const EXPORT_MODULES = ['mermaid', 'chart', 'highlight', 'codeblock', 'table-tools', 'mark', 'katex', 'link-attributes', 'task-lists'];

function buildExportHtml(doc) {
  const base = new URL('.', location.href).href;   // 本站 markdown/ 目錄(絕對網址)
  const importMap = document.querySelector('script[type="importmap"]').textContent;
  const themeName = localStorage.getItem(THEME_KEY) || 'default';
  const moduleImports = EXPORT_MODULES.map((m) => `import ${JSON.stringify(base + 'js/modules/' + m + '.js')};`).join('\n');
  const srcJson = JSON.stringify(doc.content).replace(/<\//g, '<\\/');   // 避免 </script> 提早結束
  const titleText = (doc.title || 'Markdown').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${titleText}</title>
<link rel="stylesheet" href="${base}themes/${themeName}.css">
<style>body{margin:0 auto;max-width:980px;padding:2rem 1.2rem;font-family:-apple-system,"Segoe UI","Noto Sans CJK TC","Microsoft JhengHei",sans-serif;}</style>
<script type="importmap">${importMap}</script>
</head>
<body>
<div id="preview" class="md-preview markdown-body" aria-live="polite"></div>
<script type="application/json" id="md-src">${srcJson}</script>
<script type="module">
import { render, enhance } from ${JSON.stringify(base + 'js/renderer.js')};
import { moduleCss } from ${JSON.stringify(base + 'js/registry.js')};
${moduleImports}
const st = document.createElement('style'); st.textContent = moduleCss(); document.head.appendChild(st);
const SRC = JSON.parse(document.getElementById('md-src').textContent);
const el = document.getElementById('preview');
el.innerHTML = await render(SRC);
await enhance(el);
</script>
</body>
</html>`;
}

function downloadHtml() {
  const doc = store.getCurrent();
  if (!doc) return;
  const blob = new Blob([buildExportHtml(doc)], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (doc.title || 'markdown').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 50) + '.html';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
// ── 右上角「下載」下拉選單(目前一項:Download HTML;之後可再加)──
function setExportMenu(open) {
  el.exportPop.hidden = !open;
  el.exportToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
}
el.exportToggle.addEventListener('click', (e) => { e.stopPropagation(); setExportMenu(el.exportPop.hidden); });
document.addEventListener('click', (e) => { if (!el.exportMenu.contains(e.target)) setExportMenu(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setExportMenu(false); });
el.downloadBtn.addEventListener('click', () => { setExportMenu(false); downloadHtml(); });
// Download PDF:靠 @media print,直接叫瀏覽器列印(選「另存為 PDF」);chart/mermaid 已是 DOM 內 SVG,無需逐功能轉換。
el.downloadPdfBtn.addEventListener('click', () => { setExportMenu(false); window.print(); });

// ── 編輯 / 預覽 捲動同步(比例對應,避免兩邊不一致)──
let syncing = false;
function syncScroll(from, to) {
  if (syncing) return;
  syncing = true;
  const fromMax = from.scrollHeight - from.clientHeight;
  const toMax = to.scrollHeight - to.clientHeight;
  to.scrollTop = fromMax > 0 ? (from.scrollTop / fromMax) * toMax : 0;
  requestAnimationFrame(() => { syncing = false; });
}
el.editor.addEventListener('scroll', () => syncScroll(el.editor, el.preview));
el.preview.addEventListener('scroll', () => syncScroll(el.preview, el.editor));

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
// 主題用並排按鈕(點一下即時套用,不必開下拉/按 Enter;與檢視模式控制一致)。
function buildThemeButtons() {
  el.theme.replaceChildren();
  for (const name of THEMES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'seg-btn';
    b.dataset.theme = name;
    b.textContent = name;
    b.addEventListener('click', () => setTheme(name));
    el.theme.appendChild(b);
  }
}
function setTheme(name) {
  if (!THEMES.includes(name)) name = 'default';
  el.themeLink.href = `themes/${name}.css`;
  [...el.theme.children].forEach((b) => b.classList.toggle('active', b.dataset.theme === name));
  localStorage.setItem(THEME_KEY, name);
}

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
  buildThemeButtons();
  setTheme(localStorage.getItem(THEME_KEY) || 'default');
  setMode(localStorage.getItem(VIEW_KEY) || 'split');
  setSidebar(localStorage.getItem(SIDEBAR_KEY) === '1');
  store.pruneBuiltins(BUILTINS.map(([id]) => id));     // 清掉已移除的舊內建文件(如 anchor)
  applySplit = setupResizers({ getDocId: () => currentId }).applySplit;
  await seedBuiltins();
  openDoc(store.getCurrent()?.id || store.DEMO_ID);
})();
