// main.js — 殼層:兩個輸入框 → 比對 → 顯示差異 + 嚴格報告。
//
// 結構重點:每個「模式」自己宣告「有哪些選項可用」,而且每個模式各自記住自己的選項狀態。
//   → 不適用的選項在那個模式下「不顯示」;切換模式不會把別的模式的選項帶過來。

import { diffRows, charDiff, jsonDiff } from './diff.js';
import { revealHtml, revealChar } from './reveal.js';
import { strictReport } from './inspect.js';
import { esc } from './unicode.js';

const $ = (s) => document.querySelector(s);
const inA = $('#a'), inB = $('#b');
const diffBox = $('#diff'), reportBox = $('#report'), summaryEl = $('#summary'), bannerEl = $('#banner');
const modesEl = $('#modes'), optsEl = $('#options');

const MAX_LINES = 5000;
const cp = (...a) => String.fromCodePoint(...a);

// 選項定義(id → 標籤)。模式用 id 宣告自己支援哪些。
const OPTIONS = { showSpaces: '顯示空白字元', ignoreCase: '忽略大小寫', ignoreSpace: '忽略空白' };
const TEXT_OPTS = ['showSpaces', 'ignoreCase', 'ignoreSpace'];

const STRICT_A = 'caf' + cp(0xE9) + ' r' + cp(0xE9) + 'sum' + cp(0xE9) + '\nHello world\nbalance: 100\ngood';
const STRICT_B = 'cafe' + cp(0x301) + ' r' + cp(0xE9) + 'sum' + cp(0xE9) + '\nHello' + cp(0xA0) + 'world\nbalance: 100' + cp(0x200B) + '\ng' + cp(0x43E) + cp(0x43E) + 'd';
const ART_A = ['前言:這份報告討論城市交通。', '背景:近年車流量上升。', '現況一:尖峰時段壅塞。', '現況二:大眾運輸使用率偏低。', '現況三:停車空間不足。', '分析:主因是私人運具偏好。', '方法:建立動態號誌系統。', '數據:平均通勤時間 38 分鐘。', '結果:導入後縮短到 31 分鐘。', '結論:智慧號誌有效。'].join('\n');
const ART_B = ['前言:這份報告討論城市交通。', '背景:近年車流量與事故同步上升。', '現況一:尖峰時段壅塞。', '現況二:大眾運輸使用率偏低。', '現況三:停車空間不足。', '分析:主因是私人運具偏好。', '方法:建立動態號誌系統。', '數據:平均通勤時間 38 分鐘。', '結果:導入後縮短到 29 分鐘,降幅更明顯。', '結論:智慧號誌有效。'].join('\n');
const CODE_A = ['function add(a, b) {', '  return a + b;', '}', '', 'const x = add(1, 2);', 'console.log(x);'].join('\n');
const CODE_B = ['function add(a, b) {', '  if (typeof a !== "number") throw new Error("bad");', '  return a + b;', '}', '', 'const x = add(1, 2);', 'console.log("result", x);'].join('\n');
const JSON_A = '{\n  "name": "Alice",\n  "age": 30,\n  "tags": ["a", "b"],\n  "city": "Taipei"\n}';
const JSON_B = '{\n  "age": 31,\n  "name": "Alice",\n  "tags": ["a", "c", "d"],\n  "country": "TW"\n}';

// 模式:options = 該模式支援的選項 id(JSON 結構化沒有可用選項)
const MODES = [
  { id: 'strict', label: '逐字嚴格', collapse: false, options: TEXT_OPTS, a: STRICT_A, b: STRICT_B },
  { id: 'article', label: '文章(只看差異)', collapse: true, options: TEXT_OPTS, a: ART_A, b: ART_B },
  { id: 'code', label: '程式碼', collapse: true, options: TEXT_OPTS, a: CODE_A, b: CODE_B },
  { id: 'json', label: 'JSON 結構化', json: true, options: [], a: JSON_A, b: JSON_B },
];

// 每個模式各自記住自己的選項狀態:optState[modeId][optId] = bool
const optState = {};
MODES.forEach((m) => { optState[m.id] = {}; m.options.forEach((o) => { optState[m.id][o] = false; }); });

let mode = MODES[0];
let timer;

buildModes();
setMode(MODES[0]);

[inA, inB].forEach((el) => el.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 200); }));
$('#swap').addEventListener('click', () => { const t = inA.value; inA.value = inB.value; inB.value = t; run(); });
$('#clear').addEventListener('click', () => { inA.value = ''; inB.value = ''; run(); });

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
  [...modesEl.children].forEach((b) => b.classList.toggle('active', b.dataset.id === m.id));
  renderOptions(m);            // 只顯示此模式支援的選項,並還原此模式之前的選擇
  inA.value = m.a; inB.value = m.b;
  run();
}

// 依模式產生選項開關(不支援的選項不會出現),狀態取自該模式自己的記憶
function renderOptions(m) {
  optsEl.innerHTML = '';
  m.options.forEach((o) => {
    const lab = document.createElement('label');
    lab.className = 'toggle';
    lab.innerHTML = `<input type="checkbox"><span class="slider"></span><span>${OPTIONS[o]}</span>`;
    const cb = lab.querySelector('input');
    cb.checked = optState[m.id][o];
    cb.addEventListener('change', () => { optState[m.id][o] = cb.checked; run(); });
    optsEl.appendChild(lab);
  });
}

// 目前模式的選項狀態(讀取用;沒宣告的選項一律 false)
function opt(id) { return !!optState[mode.id][id]; }

function run() {
  const rawA = inA.value, rawB = inB.value;
  if (mode.json) { jsonRun(rawA, rawB); return; }

  renderReport(strictReport(rawA, rawB));
  const showSpaces = opt('showSpaces');

  let aLines = rawA.replace(/\r\n?/g, '\n').split('\n');
  let bLines = rawB.replace(/\r\n?/g, '\n').split('\n');
  let capped = false;
  if (aLines.length > MAX_LINES || bLines.length > MAX_LINES) {
    aLines = aLines.slice(0, MAX_LINES); bLines = bLines.slice(0, MAX_LINES); capped = true;
  }
  bannerEl.hidden = !capped;
  if (capped) bannerEl.textContent = `⚠ 內容過大，只比較前 ${MAX_LINES} 行`;

  const cmp = { ignoreCase: opt('ignoreCase'), ignoreSpace: opt('ignoreSpace') };
  renderDiff(diffRows(aLines.join('\n'), bLines.join('\n'), cmp), mode.collapse, showSpaces, cmp);
}

// ── JSON 結構化比對 ──
function jsonRun(rawA, rawB) {
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
function jsonErr(side, msg) {
  reportBox.innerHTML = `<div class="verdict warn">⚠ ${side} 不是合法 JSON:${esc(msg)}</div>`;
  diffBox.innerHTML = ''; summaryEl.textContent = '';
}

function renderReport({ verdict, findings }) {
  let html = '';
  if (verdict.level === 'same') html += `<div class="verdict same">✓ ${verdict.text}</div>`;
  else if (verdict.level === 'warn') html += `<div class="verdict warn">⚠ ${verdict.text}</div>`;
  if (findings.length) html += '<ul class="findings">' + findings.map((f) => `<li><span class="k">${f.k}</span>${f.v}</li>`).join('') + '</ul>';
  reportBox.innerHTML = html;
}

function renderDiff(rows, collapse, showSpaces, cmp) {
  const CTX = 2;
  const keep = rows.map(() => !collapse);
  if (collapse) rows.forEach((r, i) => { if (r.type !== 'eq') for (let j = Math.max(0, i - CTX); j <= Math.min(rows.length - 1, i + CTX); j++) keep[j] = true; });

  let nChg = 0, nAdd = 0, nDel = 0, la = 0, lb = 0, html = '', skipped = 0;
  const flushSkip = () => { if (skipped) { html += `<div class="row"><div class="gap">⋯ 相同 ${skipped} 行 ⋯</div></div>`; skipped = 0; } };

  rows.forEach((row, i) => {
    if (row.type === 'eq') { la++; lb++; }
    else if (row.type === 'chg') { la++; lb++; nChg++; }
    else if (row.type === 'del') { la++; nDel++; }
    else { lb++; nAdd++; }

    if (!keep[i]) { skipped++; return; }
    flushSkip();
    if (row.type === 'eq') html += line(la, revealHtml(row.left, { showSpaces }), 'eq', lb, revealHtml(row.right, { showSpaces }), 'eq');
    else if (row.type === 'chg') { const ops = charDiff(row.left, row.right, cmp); html += line(la, side(ops, 'left', showSpaces), 'chg', lb, side(ops, 'right', showSpaces), 'chg'); }
    else if (row.type === 'del') html += line(la, revealHtml(row.left, { showSpaces }), 'del', '', '', 'blank');
    else html += line('', '', 'blank', lb, revealHtml(row.right, { showSpaces }), 'add');
  });
  flushSkip();

  diffBox.innerHTML = html || '<div class="empty">(兩邊都是空的)</div>';
  const same = !nChg && !nAdd && !nDel;
  summaryEl.textContent = same ? '兩邊逐行相同' : `修改 ${nChg} 行・新增 ${nAdd} 行・刪除 ${nDel} 行`;
}

function side(ops, which, showSpaces) {
  let out = '';
  for (const op of ops) {
    if (op.t === 'eq') out += revealChar(which === 'right' ? (op.v2 ?? op.v) : op.v, { showSpaces });   // eq 各顯示自己那邊的原字
    else if (op.t === 'del' && which === 'left') out += `<span class="c-del">${revealChar(op.v, { showSpaces })}</span>`;
    else if (op.t === 'add' && which === 'right') out += `<span class="c-add">${revealChar(op.v, { showSpaces })}</span>`;
  }
  return out;
}

function line(nl, lh, lc, nr, rh, rc) {
  return '<div class="row">' +
    `<div class="num">${nl}</div><div class="cell ${lc}">${lh}</div>` +
    `<div class="num">${nr}</div><div class="cell ${rc}">${rh}</div>` +
    '</div>';
}
