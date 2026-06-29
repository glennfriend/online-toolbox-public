// 功能 module:表格工具(post 型,純前端、無外部相依)。
//
// 對 render 後的每個 <table>:
//   1. 上方加工具列:複製成 Markdown / Unicode(框線)/ CSV / JSON 四種格式。
//   2. 表頭欄界線可拖曳調整欄寬(像 Google Sheet);寬度記在 localStorage,
//      以「表頭文字簽名」為 key —— 與 URL / 文件無關,重整後仍記得;表頭或欄數改了就回預設。
//
// 作法參考自 old-cat 的渲染頁腳本(複製格式邏輯一致)。隔離:每個表格各自 try/catch。

import { registerModule } from '../registry.js';

// CJK 全形字算 2 格,讓 Unicode / Markdown 表在純文字環境也對齊。
function displayWidth(str) {
  let w = 0;
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    const wide =
      (cp >= 0x1100 && cp <= 0x115f) || (cp >= 0x2e80 && cp <= 0x303e) ||
      (cp >= 0x3041 && cp <= 0x33ff) || (cp >= 0x3400 && cp <= 0x4dbf) ||
      (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0xa000 && cp <= 0xa4cf) ||
      (cp >= 0xac00 && cp <= 0xd7a3) || (cp >= 0xf900 && cp <= 0xfaff) ||
      (cp >= 0xfe30 && cp <= 0xfe4f) || (cp >= 0xff00 && cp <= 0xff60) ||
      (cp >= 0xffe0 && cp <= 0xffe6) || (cp >= 0x20000 && cp <= 0x3fffd);
    w += wide ? 2 : 1;
  }
  return w;
}
const padCell = (str, width) => str + ' '.repeat(Math.max(0, width - displayWidth(str)));

// <table> → { header:[...], rows:[[...]], widths:[...] }
function readTable(table) {
  const cellsOf = (row) => Array.from(row.querySelectorAll('th, td'), (c) => c.textContent.trim());
  const headRow = table.querySelector('thead tr');
  let header = headRow ? cellsOf(headRow) : [];
  let rows = Array.from(table.querySelectorAll('tbody tr'), cellsOf);
  if (!header.length && rows.length) header = rows.shift();

  const cols = Math.max(header.length, ...rows.map((r) => r.length), 0);
  const fill = (r) => { while (r.length < cols) r.push(''); return r; };
  fill(header);
  rows.forEach(fill);

  const widths = Array.from({ length: cols }, (_, i) =>
    Math.max(displayWidth(header[i] || ''), ...rows.map((r) => displayWidth(r[i] || ''))));
  return { header, rows, widths };
}

// ── 四種輸出格式 ──
function toMarkdown({ header, rows, widths }) {
  const line = (cells) => '| ' + cells.map((s, i) => padCell(s, widths[i])).join(' | ') + ' |';
  const out = [];
  if (header.length) {
    out.push(line(header));
    out.push('| ' + widths.map((w) => '-'.repeat(w)).join(' | ') + ' |');
  }
  rows.forEach((r) => out.push(line(r)));
  return out.join('\n');
}

const BOX = { h: '─', v: '│', tl: '┌', tm: '┬', tr: '┐', ml: '├', mm: '┼', mr: '┤', bl: '└', bm: '┴', br: '┘' };
function toUnicode({ header, rows, widths }) {
  const rule = (l, m, r) => l + widths.map((w) => BOX.h.repeat(w + 2)).join(m) + r;
  const line = (cells) => BOX.v + cells.map((s, i) => ` ${padCell(s, widths[i])} `).join(BOX.v) + BOX.v;
  const out = [rule(BOX.tl, BOX.tm, BOX.tr)];
  if (header.length) { out.push(line(header), rule(BOX.ml, BOX.mm, BOX.mr)); }
  rows.forEach((r) => out.push(line(r)));
  out.push(rule(BOX.bl, BOX.bm, BOX.br));
  return out.join('\n');
}

function toCSV({ header, rows }) {
  const esc = (s) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lines = [];
  if (header.length) lines.push(header.map(esc).join(','));
  rows.forEach((r) => lines.push(r.map(esc).join(',')));
  return lines.join('\n');
}

function toJSON({ header, rows }) {
  const data = header.length
    ? rows.map((r) => Object.fromEntries(header.map((h, i) => [h || `col${i + 1}`, r[i] || ''])))
    : rows;
  return JSON.stringify(data, null, 2);
}

const FORMATS = [['Markdown', toMarkdown], ['Unicode', toUnicode], ['CSV', toCSV], ['JSON', toJSON]];

// ── 複製鈕 + 回饋 ──
function makeButton(label, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'tt-btn';
  btn.textContent = label;
  btn.title = `複製成 ${label}`;
  btn.dataset.label = label;
  btn.addEventListener('click', () => onClick(btn));
  return btn;
}
function feedback(btn, status) {
  const label = btn.dataset.label;
  clearTimeout(btn._t);
  btn.textContent = `${label} (${status})`;
  btn.classList.add('copied');
  btn._t = setTimeout(() => { btn.textContent = label; btn.classList.remove('copied'); }, 1300);
}
async function copyText(text, btn) {
  try { await navigator.clipboard.writeText(text); feedback(btn, '已複製'); }
  catch { feedback(btn, '失敗'); }
}

// ── 欄寬拖曳 + localStorage 記憶(key = 表頭文字簽名,與 URL/文件無關) ──
const MIN_COL_WIDTH = 40;
function tableKey(ths) {
  const text = ths.map((th) => th.textContent.trim()).join('|');
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return `markdown.colwidth:${ths.length}:${h.toString(36)}`;
}
function loadWidths(key, count) {
  try { const s = JSON.parse(localStorage.getItem(key)); return Array.isArray(s) && s.length === count ? s : null; }
  catch { return null; }
}
function saveWidths(key, ths) {
  try { localStorage.setItem(key, JSON.stringify(ths.map((th) => th.offsetWidth))); } catch {}
}

function setupResize(table) {
  const ths = Array.from(table.querySelectorAll('thead th'));
  if (ths.length < 2) return;
  const key = tableKey(ths);

  const saved = loadWidths(key, ths.length);
  if (saved) {
    table.style.tableLayout = 'fixed';
    const sum = saved.reduce((a, b) => a + b, 0);
    ths.forEach((th, i) => { th.style.width = `${(saved[i] / sum * 100).toFixed(3)}%`; });
  }

  ths.slice(0, -1).forEach((th, i) => {
    const handle = document.createElement('div');
    handle.className = 'tt-resize';
    handle.title = '拖曳調整欄寬';
    th.appendChild(handle);

    handle.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const widths = ths.map((t) => t.offsetWidth);
      table.style.tableLayout = 'fixed';
      ths.forEach((t, j) => { t.style.width = `${widths[j]}px`; });
      const next = ths[i + 1];
      const startX = e.clientX, startW = th.offsetWidth, startN = next.offsetWidth;
      handle.classList.add('dragging');
      try { handle.setPointerCapture(e.pointerId); } catch {}

      const onMove = (ev) => {
        const dx = Math.max(MIN_COL_WIDTH - startW, Math.min(startN - MIN_COL_WIDTH, ev.clientX - startX));
        th.style.width = `${startW + dx}px`;
        next.style.width = `${startN - dx}px`;
      };
      const onUp = () => {
        handle.classList.remove('dragging');
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', onUp);
        saveWidths(key, ths);
      };
      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', onUp);
    });
  });
}

registerModule({
  name: 'table-tools',
  type: 'post',
  css: `
.md-preview .tt-wrap { position: relative; max-width: 100%; padding-top: 2.2rem; overflow-x: auto; }
.md-preview .tt-wrap > table { display: table; width: 100%; margin: 0; }
.md-preview .tt-tools { position: absolute; top: 0; left: 0; display: flex; gap: .4rem; flex-wrap: wrap; }
.md-preview .tt-btn { font: inherit; font-size: .76rem; line-height: 1; padding: .3em .7em; border: 1px solid var(--border, #d0d7de); border-radius: 5px; background: #fff; color: var(--muted, #57606a); cursor: pointer; opacity: .7; }
.md-preview .tt-btn:hover { color: var(--fg, #24292f); border-color: var(--accent, #2563eb); opacity: 1; }
.md-preview .tt-btn.copied { color: #1a7f37; border-color: #1a7f37; opacity: 1; }
.md-preview .tt-wrap th { position: relative; }
.md-preview .tt-resize { position: absolute; top: 0; right: -4px; width: 8px; height: 100%; cursor: col-resize; user-select: none; touch-action: none; z-index: 1; }
.md-preview .tt-resize::after { content: ''; position: absolute; top: 0; bottom: 0; left: 3px; width: 2px; background: transparent; }
.md-preview .tt-resize:hover::after, .md-preview .tt-resize.dragging::after { background: var(--accent, #2563eb); }
`,
  apply(root) {
    root.querySelectorAll('table').forEach((table) => {
      if (table.closest('.tt-wrap')) return;
      try {
        const wrap = document.createElement('div');
        wrap.className = 'tt-wrap';
        table.replaceWith(wrap);
        wrap.appendChild(table);

        const tools = document.createElement('div');
        tools.className = 'tt-tools';
        for (const [label, format] of FORMATS) {
          tools.appendChild(makeButton(label, (btn) => copyText(format(readTable(table)), btn)));
        }
        wrap.prepend(tools);

        setupResize(table);
      } catch (err) {
        console.error('[markdown] table-tools 單一表格失敗,保留原樣:', err);
      }
    });
  },
});
