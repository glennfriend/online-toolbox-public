// sample.js — 輸入上限與取樣。
//
// 為什麼要:貼上超大資料(例如百萬行)會讓瀏覽器卡死。所以「處理」前先設上限,
// 超過就只取前 N 行(取樣模式)。重點:取樣這件事一定要讓使用者「看得到」(見 main 的橫幅)。

export const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_LINES = 10000;           // 1 萬行

// 數行數(不建大陣列,省記憶體)
export function countLines(s) {
  if (!s) return 0;
  let n = 1;
  for (let i = s.indexOf('\n'); i >= 0; i = s.indexOf('\n', i + 1)) n++;
  return n;
}

// 第 n 個換行的位置(用來切前 n 行);不足回 -1
function nthNewline(s, n) {
  let idx = -1;
  for (let k = 0; k < n; k++) {
    idx = s.indexOf('\n', idx + 1);
    if (idx < 0) return -1;
  }
  return idx;
}

// 處理用的輸入:在上限內就原樣;超過就取前 MAX_LINES 行、且不超過 MAX_BYTES。
// 回傳 { text, sampled, usedLines, totalLines }
export function capForProcessing(text) {
  const totalLines = countLines(text);
  if (text.length <= MAX_BYTES && totalLines <= MAX_LINES) {
    return { text, sampled: false, usedLines: totalLines, totalLines };
  }
  const cut = nthNewline(text, MAX_LINES);
  let slice = cut >= 0 ? text.slice(0, cut) : text;
  if (slice.length > MAX_BYTES) slice = slice.slice(0, MAX_BYTES);
  return { text: slice, sampled: true, usedLines: countLines(slice), totalLines };
}
