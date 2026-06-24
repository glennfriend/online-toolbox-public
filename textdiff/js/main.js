// main.js — 殼層:兩個輸入框 → 比對 → 並排顯示差異 + 嚴格報告。
// 多種比較模式(可插拔):逐字嚴格(顯示全部行)、文章(只看差異)、程式碼。每個模式有自己的預設範例。

import { diffRows, charDiff } from './diff.js';
import { revealHtml, revealChar } from './reveal.js';
import { strictReport } from './inspect.js';

const $ = (s) => document.querySelector(s);
const inA = $('#a'), inB = $('#b');
const diffBox = $('#diff'), reportBox = $('#report'), summaryEl = $('#summary'), bannerEl = $('#banner'), modesEl = $('#modes');
const wsToggle = $('#ws-toggle');

const MAX_LINES = 5000;
const cp = (...a) => String.fromCodePoint(...a);

// 逐字嚴格的範例:畫面看起來幾乎一樣、其實不同(NFD café、NBSP、零寬空格、西里爾同形字)
const STRICT_A = 'caf' + cp(0xE9) + ' r' + cp(0xE9) + 'sum' + cp(0xE9) + '\nHello world\nbalance: 100\ngood';
const STRICT_B = 'cafe' + cp(0x301) + ' r' + cp(0xE9) + 'sum' + cp(0xE9) + '\nHello' + cp(0xA0) + 'world\nbalance: 100' + cp(0x200B) + '\ng' + cp(0x43E) + cp(0x43E) + 'd';

const ART_A = ['前言:這份報告討論城市交通。', '背景:近年車流量上升。', '現況一:尖峰時段壅塞。', '現況二:大眾運輸使用率偏低。', '現況三:停車空間不足。', '分析:主因是私人運具偏好。', '方法:建立動態號誌系統。', '數據:平均通勤時間 38 分鐘。', '結果:導入後縮短到 31 分鐘。', '結論:智慧號誌有效。'].join('\n');
const ART_B = ['前言:這份報告討論城市交通。', '背景:近年車流量與事故同步上升。', '現況一:尖峰時段壅塞。', '現況二:大眾運輸使用率偏低。', '現況三:停車空間不足。', '分析:主因是私人運具偏好。', '方法:建立動態號誌系統。', '數據:平均通勤時間 38 分鐘。', '結果:導入後縮短到 29 分鐘,降幅更明顯。', '結論:智慧號誌有效。'].join('\n');

const CODE_A = ['function add(a, b) {', '  return a + b;', '}', '', 'const x = add(1, 2);', 'console.log(x);'].join('\n');
const CODE_B = ['function add(a, b) {', '  if (typeof a !== "number") throw new Error("bad");', '  return a + b;', '}', '', 'const x = add(1, 2);', 'console.log("result", x);'].join('\n');

// 模式註冊(要加新模式 = 多一筆;collapse=true 表示折疊相同的行,只看差異)
const MODES = [
  { id: 'strict', label: '逐字嚴格', collapse: false, a: STRICT_A, b: STRICT_B },
  { id: 'article', label: '文章(只看差異)', collapse: true, a: ART_A, b: ART_B },
  { id: 'code', label: '程式碼', collapse: true, a: CODE_A, b: CODE_B },
];
let mode = MODES[0];
let showSpaces = false;
let timer;

buildModes();
setMode(MODES[0]);   // 載入第一個模式的範例並比對

[inA, inB].forEach((el) => el.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 200); }));
wsToggle.addEventListener('change', () => { showSpaces = wsToggle.checked; run(); });
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
  inA.value = m.a; inB.value = m.b;   // 各模式有自己的預設內容
  run();
}

function run() {
  const rawA = inA.value, rawB = inB.value;
  renderReport(strictReport(rawA, rawB));

  let aLines = rawA.replace(/\r\n?/g, '\n').split('\n');
  let bLines = rawB.replace(/\r\n?/g, '\n').split('\n');
  let capped = false;
  if (aLines.length > MAX_LINES || bLines.length > MAX_LINES) {
    aLines = aLines.slice(0, MAX_LINES); bLines = bLines.slice(0, MAX_LINES); capped = true;
  }
  bannerEl.hidden = !capped;
  if (capped) bannerEl.textContent = `⚠ 內容過大，只比較前 ${MAX_LINES} 行`;

  renderDiff(diffRows(aLines.join('\n'), bLines.join('\n')), mode.collapse);
}

function renderReport({ verdict, findings }) {
  let html = '';
  if (verdict.level === 'same') html += `<div class="verdict same">✓ ${verdict.text}</div>`;
  else if (verdict.level === 'warn') html += `<div class="verdict warn">⚠ ${verdict.text}</div>`;
  // 單純不同就不再多一條「內容不同」(下方 diff 與摘要已說明)
  if (findings.length) html += '<ul class="findings">' + findings.map((f) => `<li><span class="k">${f.k}</span>${f.v}</li>`).join('') + '</ul>';
  reportBox.innerHTML = html;
}

function renderDiff(rows, collapse) {
  // 折疊模式:只保留「有差異的行 + 前後各 CTX 行」,其餘相同的行收成一條分隔
  const CTX = 2;
  const keep = rows.map(() => !collapse);
  if (collapse) rows.forEach((r, i) => { if (r.type !== 'eq') for (let j = Math.max(0, i - CTX); j <= Math.min(rows.length - 1, i + CTX); j++) keep[j] = true; });

  let nChg = 0, nAdd = 0, nDel = 0, la = 0, lb = 0, html = '', skipped = 0;
  const flushSkip = () => { if (skipped) { html += `<div class="row"><div class="gap">⋯ 相同 ${skipped} 行 ⋯</div></div>`; skipped = 0; } };

  rows.forEach((row, i) => {
    // 行號照所有行累計(折疊也要正確)
    if (row.type === 'eq') { la++; lb++; }
    else if (row.type === 'chg') { la++; lb++; nChg++; }
    else if (row.type === 'del') { la++; nDel++; }
    else { lb++; nAdd++; }

    if (!keep[i]) { skipped++; return; }
    flushSkip();
    if (row.type === 'eq') html += line(la, revealHtml(row.left, { showSpaces }), 'eq', lb, revealHtml(row.right, { showSpaces }), 'eq');
    else if (row.type === 'chg') { const ops = charDiff(row.left, row.right); html += line(la, side(ops, 'left'), 'chg', lb, side(ops, 'right'), 'chg'); }
    else if (row.type === 'del') html += line(la, revealHtml(row.left, { showSpaces }), 'del', '', '', 'blank');
    else html += line('', '', 'blank', lb, revealHtml(row.right, { showSpaces }), 'add');
  });
  flushSkip();

  diffBox.innerHTML = html || '<div class="empty">(兩邊都是空的)</div>';
  const same = !nChg && !nAdd && !nDel;
  summaryEl.textContent = same ? '兩邊逐行相同' : `修改 ${nChg} 行・新增 ${nAdd} 行・刪除 ${nDel} 行`;
}

function side(ops, which) {
  let out = '';
  for (const op of ops) {
    if (op.t === 'eq') out += revealChar(op.v, { showSpaces });
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
