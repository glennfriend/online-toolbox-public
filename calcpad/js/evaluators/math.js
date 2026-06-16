// 功能 1:數字計算。
//
// 安全求值:不使用 eval()。自寫遞迴下降(recursive descent)解析器,
// 只支援數字、+ - * /、括號與運算優先序,不執行任何使用者輸入的程式碼。

import { registerEvaluator } from '../registry.js';

// 只認領「整行都是算術」的內容:僅含數字、運算子、括號、小數點、空白,且至少有一個數字。
// 含字母 / 冒號(如日期、時區)的行不會命中,自然與 datetime 區隔。
const MATH_LINE = /^[\d\s+\-*/().]+$/;

registerEvaluator({
  name: 'math',
  match: (line) => MATH_LINE.test(line) && /\d/.test(line),
  evaluate: (line) => formatNumber(evalExpr(line)),
});

// ── 求值 ──

function evalExpr(input) {
  const tokens = tokenize(input);
  let pos = 0;

  const peek = () => tokens[pos];
  const eat = () => tokens[pos++];

  // expr := term (('+' | '-') term)*
  function parseExpr() {
    let value = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = eat();
      const rhs = parseTerm();
      value = op === '+' ? value + rhs : value - rhs;
    }
    return value;
  }

  // term := factor (('*' | '/') factor)*
  function parseTerm() {
    let value = parseFactor();
    while (peek() === '*' || peek() === '/') {
      const op = eat();
      const rhs = parseFactor();
      if (op === '/' && rhs === 0) throw new Error('除以零');
      value = op === '*' ? value * rhs : value / rhs;
    }
    return value;
  }

  // factor := ('+' | '-') factor | '(' expr ')' | number
  function parseFactor() {
    const t = peek();
    if (t === '+') { eat(); return parseFactor(); }
    if (t === '-') { eat(); return -parseFactor(); }
    if (t === '(') {
      eat();
      const value = parseExpr();
      if (eat() !== ')') throw new Error('括號不對稱');
      return value;
    }
    if (t === undefined) throw new Error('運算式不完整');
    const n = Number(t);
    if (Number.isNaN(n)) throw new Error(`看不懂:${t}`);
    eat();
    return n;
  }

  const result = parseExpr();
  if (pos < tokens.length) throw new Error('多餘的符號');
  return result;
}

// 切詞:數字(含小數)或單一運算子 / 括號;忽略空白。
function tokenize(input) {
  const tokens = [];
  const re = /\d*\.?\d+|[+\-*/()]/g;
  let m;
  let consumed = 0;
  while ((m = re.exec(input)) !== null) {
    // 確認跳過的只有空白,否則代表有非法字元(理論上 match 已擋掉,雙重保險)。
    if (input.slice(consumed, m.index).trim() !== '') throw new Error('看不懂的符號');
    tokens.push(m[0]);
    consumed = re.lastIndex;
  }
  if (input.slice(consumed).trim() !== '') throw new Error('看不懂的符號');
  return tokens;
}

// 格式化:消除浮點誤差(四捨五入到第 10 位),去掉多餘尾零。
function formatNumber(n) {
  if (!Number.isFinite(n)) throw new Error('結果非有限數');
  const rounded = Math.round((n + Number.EPSILON) * 1e10) / 1e10;
  return String(rounded);
}
