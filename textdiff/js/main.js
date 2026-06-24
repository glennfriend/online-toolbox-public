// main.js — 殼層:兩個輸入框 → 比對 → 並排顯示差異 + 嚴格報告。
// 結構同站上其他工具:殼層只負責 DOM/事件,真正的邏輯在 diff / reveal / inspect 純函式模組。

import { diffRows, charDiff } from './diff.js';
import { revealHtml, revealChar } from './reveal.js';
import { strictReport } from './inspect.js';

const $ = (s) => document.querySelector(s);
const inA = $('#a'), inB = $('#b');
const diffBox = $('#diff'), reportBox = $('#report'), summaryEl = $('#summary'), bannerEl = $('#banner');
const wsToggle = $('#ws-toggle');

const MAX_LINES = 5000;   // 上限:超過只比前 N 行(絕不無聲,會出橫幅)

// 示範:兩段「畫面看起來幾乎一樣、其實不同」的文字(用碼點明確嵌入隱形/同形字元)
//   A 是乾淨版;B 動了手腳:café 改用 NFD(e+組合重音)、Hello 與 world 間是 NBSP、
//   第三行行尾多一個零寬空格、good 的兩個 o 換成西里爾字母 о。
const cp = (...a) => String.fromCodePoint(...a);
inA.value = 'caf' + cp(0xE9) + ' r' + cp(0xE9) + 'sum' + cp(0xE9) + '\nHello world\nbalance: 100\ngood';
inB.value = 'cafe' + cp(0x301) + ' r' + cp(0xE9) + 'sum' + cp(0xE9)   // café → NFD
  + '\nHello' + cp(0xA0) + 'world'                                    // NBSP
  + '\nbalance: 100' + cp(0x200B)                                    // 行尾零寬空格
  + '\ng' + cp(0x43E) + cp(0x43E) + 'd';                             // 西里爾 о 同形字

let showSpaces = false;
let timer;
[inA, inB].forEach((el) => el.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 200); }));
wsToggle.addEventListener('change', () => { showSpaces = wsToggle.checked; run(); });
$('#swap').addEventListener('click', () => { const t = inA.value; inA.value = inB.value; inB.value = t; run(); });
$('#clear').addEventListener('click', () => { inA.value = ''; inB.value = ''; run(); });

run();

function run() {
  const rawA = inA.value, rawB = inB.value;

  // 嚴格報告吃「原始」文字(含 \r、不正規化)
  renderReport(strictReport(rawA, rawB));

  // 差異視圖:把行尾正規化成 \n 再比行(行尾不一致已由報告指出)
  let aLines = rawA.replace(/\r\n?/g, '\n').split('\n');
  let bLines = rawB.replace(/\r\n?/g, '\n').split('\n');
  let capped = false;
  if (aLines.length > MAX_LINES || bLines.length > MAX_LINES) {
    aLines = aLines.slice(0, MAX_LINES); bLines = bLines.slice(0, MAX_LINES); capped = true;
  }
  bannerEl.hidden = !capped;
  if (capped) bannerEl.textContent = `⚠ 內容過大，只比較前 ${MAX_LINES} 行`;

  renderDiff(diffRows(aLines.join('\n'), bLines.join('\n')));
}

function renderReport({ verdict, findings }) {
  let html = `<div class="verdict ${verdict.level}">${verdict.text}</div>`;
  if (findings.length) {
    html += '<ul class="findings">' + findings.map((f) => `<li><span class="k">${f.k}</span>${f.v}</li>`).join('') + '</ul>';
  }
  reportBox.innerHTML = html;
}

function renderDiff(rows) {
  let nChg = 0, nAdd = 0, nDel = 0;
  let la = 0, lb = 0;   // 行號
  let html = '';
  for (const row of rows) {
    if (row.type === 'eq') {
      la++; lb++;
      html += line(la, revealHtml(row.left, { showSpaces }), 'eq', lb, revealHtml(row.right, { showSpaces }), 'eq');
    } else if (row.type === 'chg') {
      la++; lb++; nChg++;
      const ops = charDiff(row.left, row.right);
      html += line(la, side(ops, 'left'), 'chg', lb, side(ops, 'right'), 'chg');
    } else if (row.type === 'del') {
      la++; nDel++;
      html += line(la, revealHtml(row.left, { showSpaces }), 'del', '', '', 'blank');
    } else { // add
      lb++; nAdd++;
      html += line('', '', 'blank', lb, revealHtml(row.right, { showSpaces }), 'add');
    }
  }
  diffBox.innerHTML = html || '<div class="empty">(兩邊都是空的)</div>';

  const same = !nChg && !nAdd && !nDel;
  summaryEl.textContent = same ? '兩邊逐行相同' : `修改 ${nChg} 行・新增 ${nAdd} 行・刪除 ${nDel} 行`;
}

// 修改列:左側顯示 相同+刪除,右側顯示 相同+新增
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
