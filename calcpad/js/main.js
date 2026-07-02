// 控制器:逐行讀取輸入 → 派發到 evaluator → render 答案 → 同步網址。
//
// 核心不認識任何具體計算功能;能算什麼,全由 evaluators/ 裡各模組登記進 registry 決定。
// 新增一種功能 = 新增 evaluators/xxx.js + 下方加一行 import;移除 = 反向操作。

import { evaluateLine } from './registry.js';
import { encode, decode } from './urlsync.js';

// ── 掛載 evaluators(可插拔)──
import './evaluators/math.js';
import './evaluators/datetime.js';

const input = document.querySelector('#input');
const results = document.querySelector('#results');
const copyLinkBtn = document.querySelector('#copy-link');
const exMathBtn = document.querySelector('#ex-math');
const exThousandsBtn = document.querySelector('#ex-thousands');
const exDatetimeBtn = document.querySelector('#ex-datetime');
const exDstBtn = document.querySelector('#ex-dst');
const exDateDiffBtn = document.querySelector('#ex-datediff');
const exCommentBtn = document.querySelector('#ex-comment');
const toast = document.querySelector('#toast');

const RENDER_DELAY = 80; // 輸入後稍微 debounce 再重算

// 範例內容:兩種功能各一組,點按鈕「附加」到目前內容後面(不覆蓋既有輸入)。
const EXAMPLE_MATH = [
  '和的平方公式 // (a + b)² = a² + 2ab + b²',
  '(3 + 5) ** 2',
  '(3 ** 2) + (2 * 3 * 5 ) + (5 ** 2)',
].join('\n');
const EXAMPLE_THOUSANDS = '1,000 + 2,000,000';
const EXAMPLE_DATETIME = [
  '2001-01-01T09:00:00+08:00 + 2h + 30m',
  '2001-01-01T09:00:00+08:00 to UTC',
  '2001-01-01T09:00:00+08:00 to America/Los_Angeles', // 1 月的 LA 是 PST(UTC-8)
  '',
  '2001-01-01T09:00:00-07:00 to Asia/Taipei',
].join('\n');
// 美國太平洋時區:夏令(日光節約 PDT)= UTC-7,標準(PST)= UTC-8。
// 口訣:日光節約把時鐘往前撥快 1 小時 → offset 變大(負得比較少),所以 -7 是夏季那個。
const EXAMPLE_DST = [
  '# Taipei 08 20',
  '2001-01-01T08:00:00+08:00 to America/Los_Angeles',
  '2001-01-01T20:00:00+08:00 to America/Los_Angeles',
  '',
  '# PDT (夏令/日光節約, 夏季) 00 08 20 ',
  '2001-01-01T09:00:00-07:00 to Asia/Taipei',
  '2001-01-01T08:00:00-07:00 to Asia/Taipei',
  '2001-01-01T20:00:00-07:00 to Asia/Taipei',
  '',
  '# PST (標準時間, 冬季) 00 08 20 ',
  '2001-01-01T09:00:00-08:00 to Asia/Taipei',
  '2001-01-01T08:00:00-08:00 to Asia/Taipei',
  '2001-01-01T20:00:00-08:00 to Asia/Taipei',
].join('\n');
const EXAMPLE_DATEDIFF = [
  '# 日期相減 → 期間',
  '2026-03-01 to 2026-01-01',
  '2026-12-31 to 2026-01-01',
  '2026-01-01T18:00:00+08:00 to 2026-01-01T09:00:00+08:00',
].join('\n');
const EXAMPLE_COMMENT = [
  '# 這行是註解 / 標題,不會計算',
  '100 + 200',
  '50 * 3',
].join('\n');

// ── 逐行重算 + render ──
function recompute() {
  const lines = input.value.split('\n');
  const frag = document.createDocumentFragment();
  for (const line of lines) {
    frag.appendChild(renderLine(evaluateLine(line)));
  }
  results.replaceChildren(frag);
}

// 一行的結果 → 一個對齊的 div。用 textContent 寫入,天然跳脫、不插入未處理 HTML。
function renderLine(result) {
  const div = document.createElement('div');
  div.className = 'result-line';
  switch (result.kind) {
    case 'ok':
      div.classList.add('result-ok');
      div.textContent = result.value;
      break;
    case 'error':
      div.classList.add('result-error');
      div.textContent = `⚠ ${result.message}`;
      break;
    case 'conflict':
      div.classList.add('result-conflict');
      div.textContent = `不能混用 (${result.names.join(' / ')})`;
      break;
    case 'comment':
      div.classList.add('result-comment');
      div.textContent = result.text || ' ';   // 在答案欄淡淡標出標題,確認這行被當註解
      break;
    default: // empty / none:不顯示答案,但保留一行高度以維持左右對齊
      div.textContent = ' ';
  }
  return div;
}

// ── 網址同步 ──
function syncUrl() {
  const encoded = encode(input.value);
  const url = encoded ? `#${encoded}` : location.pathname + location.search;
  history.replaceState(null, '', url);
}

function loadFromHash() {
  const hash = location.hash.slice(1);
  if (!hash) return;
  try {
    input.value = decode(hash);
  } catch {
    showToast('網址內容無法解碼,已忽略');
  }
}

// ── 提示 toast ──
let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

// ── 事件 ──
let renderTimer;
input.addEventListener('input', () => {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => {
    recompute();
    syncUrl();
  }, RENDER_DELAY);
});

// 答案欄跟著輸入框垂直捲動,保持逐行對齊。
input.addEventListener('scroll', () => {
  results.scrollTop = input.scrollTop;
});

// 把範例附加到目前內容後面(各起新行),非破壞性,故不需 confirm。
function appendExample(text) {
  const current = input.value.replace(/\s+$/, '');
  input.value = current ? `${current}\n${text}` : text;
  recompute();
  syncUrl();
  input.focus();
  input.selectionStart = input.selectionEnd = input.value.length;
}
exMathBtn.addEventListener('click', () => appendExample(EXAMPLE_MATH));
exThousandsBtn.addEventListener('click', () => appendExample(EXAMPLE_THOUSANDS));
exDatetimeBtn.addEventListener('click', () => appendExample(EXAMPLE_DATETIME));
exDstBtn.addEventListener('click', () => appendExample(EXAMPLE_DST));
exDateDiffBtn.addEventListener('click', () => appendExample(EXAMPLE_DATEDIFF));
exCommentBtn.addEventListener('click', () => appendExample(EXAMPLE_COMMENT));

copyLinkBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    showToast('已複製網址');
  } catch {
    showToast('複製失敗,請手動複製網址列');
  }
});

// ── 啟動 ──
loadFromHash();
recompute();
