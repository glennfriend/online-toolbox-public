// main.js — 殼層:兩個輸入框 → 比對 → 呈現。
//
// 結構:每個「模式」宣告自己的 view 種類(lines / json / inline),run() 依 view 分派到對應渲染函式。
//   lines  = 下方並排逐行 diff(逐字嚴格 / 文章 / 程式碼)
//   json   = 下方 JSON 結構化清單
//   inline = 在「輸入區」就地上色(read-only 檢視,可切回編輯)——不影響上面兩種
// 每個模式自己宣告支援哪些選項,並各自記住選項狀態。

import { diffRows, charDiff, jsonDiff } from './diff.js';
import { revealHtml, revealChar } from './reveal.js';
import { strictReport } from './inspect.js';
import { esc } from './unicode.js';

const $ = (s) => document.querySelector(s);
const inA = $('#a'), inB = $('#b'), ovA = $('#ov-a'), ovB = $('#ov-b');
const diffBox = $('#diff'), reportBox = $('#report'), summaryEl = $('#summary'), bannerEl = $('#banner');
const modesEl = $('#modes'), optsEl = $('#options'), editBtn = $('#viewedit');

const MAX_LINES = 5000;
const cp = (...a) => String.fromCodePoint(...a);

const OPTIONS = {
  showSpaces: { label: '顯示空白字元', group: '顯示' },
  movedBlock: { label: '搬移偵測', group: '顯示' },
  ignoreCase: { label: '忽略大小寫', group: '比對規則' },
  ignoreSpace: { label: '忽略空白', group: '比對規則' },
};
const TEXT_OPTS = ['showSpaces', 'movedBlock', 'ignoreCase', 'ignoreSpace'];

const STRICT_A = 'caf' + cp(0xE9) + ' r' + cp(0xE9) + 'sum' + cp(0xE9) + '\nHello world\nbalance: 100\ngood';
const STRICT_B = 'cafe' + cp(0x301) + ' r' + cp(0xE9) + 'sum' + cp(0xE9) + '\nHello' + cp(0xA0) + 'world\nbalance: 100' + cp(0x200B) + '\ng' + cp(0x43E) + cp(0x43E) + 'd';
const ART_A = ['前言:這份報告討論城市交通。', '背景:近年車流量上升。', '現況一:尖峰時段壅塞。', '現況二:大眾運輸使用率偏低。', '現況三:停車空間不足。', '分析:主因是私人運具偏好。', '方法:建立動態號誌系統。', '數據:平均通勤時間 38 分鐘。', '結果:導入後縮短到 31 分鐘。', '結論:智慧號誌有效。'].join('\n');
const ART_B = ['前言:這份報告討論城市交通。', '背景:近年車流量與事故同步上升。', '現況一:尖峰時段壅塞。', '現況二:大眾運輸使用率偏低。', '現況三:停車空間不足。', '分析:主因是私人運具偏好。', '方法:建立動態號誌系統。', '數據:平均通勤時間 38 分鐘。', '結果:導入後縮短到 29 分鐘,降幅更明顯。', '結論:智慧號誌有效。'].join('\n');
const CODE_A = ['function add(a, b) {', '  return a + b;', '}', '', 'const x = add(1, 2);', 'console.log(x);'].join('\n');
const CODE_B = ['function add(a, b) {', '  if (typeof a !== "number") throw new Error("bad");', '  return a + b;', '}', '', 'const x = add(1, 2);', 'console.log("result", x);'].join('\n');
const JSON_A = '{\n  "name": "Alice",\n  "age": 30,\n  "tags": ["a", "b"],\n  "city": "Taipei"\n}';
const JSON_B = '{\n  "age": 31,\n  "name": "Alice",\n  "tags": ["a", "c", "d"],\n  "country": "TW"\n}';

const MODES = [
  { id: 'strict', label: '逐字嚴格', view: 'lines', collapse: false, options: TEXT_OPTS, a: STRICT_A, b: STRICT_B },
  { id: 'article', label: '文章(只看差異)', view: 'lines', collapse: true, options: TEXT_OPTS, a: ART_A, b: ART_B },
  { id: 'code', label: '程式碼', view: 'lines', collapse: true, options: TEXT_OPTS, a: CODE_A, b: CODE_B },
  { id: 'json', label: 'JSON 結構化', view: 'json', options: [], a: JSON_A, b: JSON_B },
  { id: 'inline', label: '原地比對', view: 'inline', collapse: false, options: TEXT_OPTS, a: STRICT_A, b: STRICT_B },
];

const optState = {};
MODES.forEach((m) => { optState[m.id] = {}; m.options.forEach((o) => { optState[m.id][o] = false; }); });

let mode = MODES[0];
let editing = false;   // inline 模式:true=編輯中(隱藏上色層)、false=檢視(顯示上色層)
let timer;

function buildModes() {
  MODES.forEach((m) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'mode-btn'; b.textContent = m.label; b.dataset.id = m.id;
    b.addEventListener('click', () => setMode(m));
    modesEl.appendChild(b);
  });
}

function setMode(m) {
  mode = m;
  editing = false;
  [...modesEl.children].forEach((b) => b.classList.toggle('active', b.dataset.id === m.id));
  document.body.classList.toggle('mode-inline', m.view === 'inline');   // 切換輸入區 vs 下方面板的顯示
  editBtn.hidden = m.view !== 'inline';
  updateEditUI();
  renderOptions(m);
  inA.value = m.a; inB.value = m.b;
  run();
}

function updateEditUI() {
  editBtn.textContent = editing ? '✓ 完成' : '編輯';
  ovA.hidden = ovB.hidden = (mode.view !== 'inline') || editing;   // 編輯中隱藏上色層,露出 textarea
}

function renderOptions(m) {
  optsEl.innerHTML = '';
  const groups = {};
  m.options.forEach((o) => { const g = OPTIONS[o].group; (groups[g] = groups[g] || []).push(o); });
  for (const g of Object.keys(groups)) {
    const wrap = document.createElement('div'); wrap.className = 'opt-group';
    wrap.innerHTML = `<span class="opt-label">${g}</span>`;
    groups[g].forEach((o) => {
      const lab = document.createElement('label'); lab.className = 'toggle';
      lab.innerHTML = `<input type="checkbox"><span class="slider"></span><span>${OPTIONS[o].label}</span>`;
      const cb = lab.querySelector('input');
      cb.checked = optState[m.id][o];
      cb.addEventListener('change', () => { optState[m.id][o] = cb.checked; run(); });
      wrap.appendChild(lab);
    });
    optsEl.appendChild(wrap);
  }
}

function opt(id) { return !!optState[mode.id][id]; }
function cmpOpts() { return { ignoreCase: opt('ignoreCase'), ignoreSpace: opt('ignoreSpace') }; }

// ── 依模式 view 分派 ──
const VIEWS = { lines: linesView, json: jsonView, inline: inlineView };
function run() { VIEWS[mode.view](inA.value, inB.value); }

// view: lines — 下方並排逐行 diff
function linesView(rawA, rawB) {
  renderReport(strictReport(rawA, rawB));
  let aLines = rawA.replace(/\r\n?/g, '\n').split('\n');
  let bLines = rawB.replace(/\r\n?/g, '\n').split('\n');
  let capped = false;
  if (aLines.length > MAX_LINES || bLines.length > MAX_LINES) { aLines = aLines.slice(0, MAX_LINES); bLines = bLines.slice(0, MAX_LINES); capped = true; }
  bannerEl.hidden = !capped;
  if (capped) bannerEl.textContent = `⚠ 內容過大，只比較前 ${MAX_LINES} 行`;

  const cmp = cmpOpts();
  const rows = diffRows(aLines.join('\n'), bLines.join('\n'), cmp);
  if (opt('movedBlock')) markMoved(rows);
  renderRows(rows, mode.collapse, opt('showSpaces'), cmp);
}

// view: json — 下方結構化清單
function jsonView(rawA, rawB) {
  bannerEl.hidden = true;
  let A, B;
  try { A = JSON.parse(rawA); } catch (e) { return jsonErr('A', e.message); }
  try { B = JSON.parse(rawB); } catch (e) { return jsonErr('B', e.message); }
  const diffs = jsonDiff(A, B);
  if (!diffs.length) { reportBox.innerHTML = '<div class="verdict same">✓ 結構相同(鍵與值一致,key 順序不影響)</div>'; diffBox.innerHTML = ''; summaryEl.textContent = '結構相同'; return; }
  reportBox.innerHTML = '';
  const lab = { add: '新增', del: '刪除', chg: '變更' };
  const v = (x) => esc(JSON.stringify(x));
  diffBox.innerHTML = '<div class="jdiff">' + diffs.map((d) => {
    let val;
    if (d.type === 'add') val = `<span class="c-add">${v(d.b)}</span>`;
    else if (d.type === 'del') val = `<span class="c-del">${v(d.a)}</span>`;
    else val = `<span class="c-del">${v(d.a)}</span> → <span class="c-add">${v(d.b)}</span>`;
    return `<div class="jrow ${d.type}"><span class="jtag ${d.type}">${lab[d.type]}</span><code class="jpath">${esc(d.path)}</code> ${val}</div>`;
  }).join('') + '</div>';
  summaryEl.textContent = `${diffs.length} 處不同`;
}
function jsonErr(side, msg) { reportBox.innerHTML = `<div class="verdict warn">⚠ ${side} 不是合法 JSON:${esc(msg)}</div>`; diffBox.innerHTML = ''; summaryEl.textContent = ''; }

// view: inline — 在輸入區就地上色(每一邊各自呈現自己的文件,加上 移除/新增 上色)
function inlineView(rawA, rawB) {
  renderReport(strictReport(rawA, rawB));
  bannerEl.hidden = true;
  const cmp = cmpOpts(), showSpaces = opt('showSpaces');
  const rows = diffRows(rawA.replace(/\r\n?/g, '\n'), rawB.replace(/\r\n?/g, '\n'), cmp);
  if (opt('movedBlock')) markMoved(rows);

  let left = '', right = '', nChg = 0, nAdd = 0, nDel = 0, nMoved = 0;
  const iline = (html, cls) => `<div class="iline ${cls}">${html || '&nbsp;'}</div>`;
  for (const row of rows) {
    if (row.type === 'eq') { left += iline(revealHtml(row.left, { showSpaces }), 'eq'); right += iline(revealHtml(row.right, { showSpaces }), 'eq'); }
    else if (row.type === 'chg') { const ops = charDiff(row.left, row.right, cmp); left += iline(side(ops, 'left', showSpaces), 'del'); right += iline(side(ops, 'right', showSpaces), 'add'); nChg++; }
    else if (row.type === 'del') { left += iline(movedTag(row.moved, '移出') + revealHtml(row.left, { showSpaces }), row.moved ? 'moved' : 'del'); row.moved ? nMoved++ : nDel++; }
    else { right += iline(movedTag(row.moved, '移入') + revealHtml(row.right, { showSpaces }), row.moved ? 'moved' : 'add'); if (!row.moved) nAdd++; }
  }
  ovA.innerHTML = left; ovB.innerHTML = right;
  updateEditUI();   // 依 editing 決定是否顯示上色層

  const same = !nChg && !nAdd && !nDel && !nMoved;
  let s = `修改 ${nChg} 行・新增 ${nAdd} 行・刪除 ${nDel} 行`;
  if (nMoved) s += `・移動 ${nMoved} 行`;
  summaryEl.textContent = same ? '兩邊逐行相同' : s + (editing ? '(編輯中)' : '');
}

// ── 共用 ──
function renderReport({ verdict, findings }) {
  let html = '';
  if (verdict.level === 'same') html += `<div class="verdict same">✓ ${verdict.text}</div>`;
  else if (verdict.level === 'warn') html += `<div class="verdict warn">⚠ ${verdict.text}</div>`;
  if (findings.length) html += '<ul class="findings">' + findings.map((f) => `<li><span class="k">${f.k}</span>${f.v}</li>`).join('') + '</ul>';
  reportBox.innerHTML = html;
}

function markMoved(rows) {
  const dels = new Map(), adds = new Map();
  rows.forEach((r, i) => {
    if (r.type === 'del' && r.left.trim()) { if (!dels.has(r.left)) dels.set(r.left, []); dels.get(r.left).push(i); }
    else if (r.type === 'add' && r.right.trim()) { if (!adds.has(r.right)) adds.set(r.right, []); adds.get(r.right).push(i); }
  });
  for (const [text, di] of dels) {
    const ai = adds.get(text); if (!ai) continue;
    const k = Math.min(di.length, ai.length);
    for (let x = 0; x < k; x++) { rows[di[x]].moved = true; rows[ai[x]].moved = true; }
  }
}
const movedTag = (on, t) => (on ? `<span class="moved-tag">${t}</span>` : '');

function renderRows(rows, collapse, showSpaces, cmp) {
  const CTX = 2;
  const keep = rows.map(() => !collapse);
  if (collapse) rows.forEach((r, i) => { if (r.type !== 'eq') for (let j = Math.max(0, i - CTX); j <= Math.min(rows.length - 1, i + CTX); j++) keep[j] = true; });

  let nChg = 0, nAdd = 0, nDel = 0, nMoved = 0, la = 0, lb = 0, html = '', skipped = 0;
  const flushSkip = () => { if (skipped) { html += `<div class="row"><div class="gap">⋯ 相同 ${skipped} 行 ⋯</div></div>`; skipped = 0; } };

  rows.forEach((row, i) => {
    if (row.type === 'eq') { la++; lb++; }
    else if (row.type === 'chg') { la++; lb++; nChg++; }
    else if (row.type === 'del') { la++; row.moved ? nMoved++ : nDel++; }
    else { lb++; if (!row.moved) nAdd++; }

    if (!keep[i]) { skipped++; return; }
    flushSkip();
    if (row.type === 'eq') html += line(la, revealHtml(row.left, { showSpaces }), 'eq', lb, revealHtml(row.right, { showSpaces }), 'eq');
    else if (row.type === 'chg') { const ops = charDiff(row.left, row.right, cmp); html += line(la, side(ops, 'left', showSpaces), 'del', lb, side(ops, 'right', showSpaces), 'add'); }
    else if (row.type === 'del') html += line(la, movedTag(row.moved, '移出') + revealHtml(row.left, { showSpaces }), row.moved ? 'moved' : 'del', '', '', 'blank');
    else html += line('', '', 'blank', lb, movedTag(row.moved, '移入') + revealHtml(row.right, { showSpaces }), row.moved ? 'moved' : 'add');
  });
  flushSkip();

  const header = '<div class="row dhead"><div class="num"></div><div class="cell hl">Origin</div><div class="num numr"></div><div class="cell hr">Changed</div></div>';
  diffBox.innerHTML = html ? header + html : '<div class="empty">(兩邊都是空的)</div>';
  const same = !nChg && !nAdd && !nDel && !nMoved;
  let s = `修改 ${nChg} 行・新增 ${nAdd} 行・刪除 ${nDel} 行`;
  if (nMoved) s += `・移動 ${nMoved} 行`;
  summaryEl.textContent = same ? '兩邊逐行相同' : s;
}

function side(ops, which, showSpaces) {
  let out = '';
  for (const op of ops) {
    if (op.t === 'eq') out += revealChar(which === 'right' ? (op.v2 ?? op.v) : op.v, { showSpaces });
    else if (op.t === 'del' && which === 'left') out += `<span class="c-del">${revealChar(op.v, { showSpaces })}</span>`;
    else if (op.t === 'add' && which === 'right') out += `<span class="c-add">${revealChar(op.v, { showSpaces })}</span>`;
  }
  return out;
}

function line(nl, lh, lc, nr, rh, rc) {
  return '<div class="row">' +
    `<div class="num">${nl}</div><div class="cell ${lc}">${lh}</div>` +
    `<div class="num numr">${nr}</div><div class="cell ${rc}">${rh}</div>` +
    '</div>';
}

// ── 啟動(放在最後:確保上面的 const VIEWS 等都已初始化才呼叫 run)──
buildModes();
setMode(MODES[0]);
[inA, inB].forEach((el) => el.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 200); }));
$('#swap').addEventListener('click', () => { const t = inA.value; inA.value = inB.value; inB.value = t; run(); });
$('#clear').addEventListener('click', () => { inA.value = ''; inB.value = ''; run(); });
editBtn.addEventListener('click', () => { editing = !editing; if (editing) { inA.focus(); } updateEditUI(); run(); });
