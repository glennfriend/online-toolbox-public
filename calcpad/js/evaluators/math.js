// 功能 1:數字計算。
//
// 安全求值:不使用 eval()。自寫遞迴下降(recursive descent)解析器,
// 只支援數字、+ - * / **(平方/次方)、括號與運算優先序,不執行任何使用者輸入的程式碼。
//
// 文法(優先序由低到高):
//   expr   := term (('+' | '-') term)*
//   term   := unary (('*' | '/') unary)*
//   unary  := ('+' | '-') unary | power      // 一元正負,比 ** 鬆 → -3 ** 2 = -(3²)
//   power  := primary ('**' unary)?          // 次方,右結合;右運算元可帶正負(2 ** -1)
//   primary:= '(' expr ')' | number

import { registerEvaluator } from '../registry.js';

// 只認領「整行都是算術」的內容:僅含數字、運算子、括號、小數點、千分位逗號、空白,
// 且至少有一個數字。含字母 / 冒號(如日期、時區)的行不會命中,自然與 datetime 區隔。
// 註:這裡只放寬「字元集」;逗號分組是否合法由下面 number token 的文法把關 ——
//     分組不對的逗號會落在 token 之外,被 tokenize 當成非法符號丟錯(而非默默吃掉)。
const MATH_LINE = /^[\d\s+\-*/().,]+$/;

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

  // term := unary (('*' | '/') unary)*
  function parseTerm() {
    let value = parseUnary();
    while (peek() === '*' || peek() === '/') {
      const op = eat();
      const rhs = parseUnary();
      if (op === '/' && rhs === 0) throw new Error('除以零');
      value = op === '*' ? value * rhs : value / rhs;
    }
    return value;
  }

  // unary := ('+' | '-') unary | power
  function parseUnary() {
    const t = peek();
    if (t === '+') { eat(); return parseUnary(); }
    if (t === '-') { eat(); return -parseUnary(); }
    return parsePower();
  }

  // power := primary ('**' unary)?  右結合;右運算元用 unary,故 2 ** -1 可行
  function parsePower() {
    const base = parsePrimary();
    if (peek() === '**') {
      eat();
      return base ** parseUnary();
    }
    return base;
  }

  // primary := '(' expr ')' | number
  function parsePrimary() {
    const t = peek();
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

// 切詞:數字(含小數 / 千分位逗號)、** 次方,或單一運算子 / 括號;忽略空白。
// ** 要排在 [*] 前面,否則會被切成兩個 *。
//
// 數字文法(只接受「合法分組」的逗號):
//   \d{1,3}(,\d{3})+(\.\d+)?   帶千分位:首組 1~3 位,之後每組剛好 3 位(如 1,212 / 12,344,444)
//   \d+(\.\d+)?                無逗號的一般整數 / 小數(如 12 / 12.5)
//   \.\d+                      開頭省略整數的小數(如 .5)
// 分組不對的逗號(如 12,12)匹配不到完整 number,逗號會落在 token 之外 →
// 下面的縫隙檢查丟「看不懂的符號」,自然「算不出來」,而非默默把它吃掉。
const NUMBER = String.raw`\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?|\.\d+`;

function tokenize(input) {
  const tokens = [];
  const re = new RegExp(String.raw`${NUMBER}|\*\*|[+\-*/()]`, 'g');
  let m;
  let consumed = 0;
  while ((m = re.exec(input)) !== null) {
    // 確認跳過的只有空白,否則代表有非法字元(含分組錯的逗號)。
    if (input.slice(consumed, m.index).trim() !== '') throw new Error('看不懂的符號');
    // 數字 token 去掉千分位逗號,後續 Number() 才認得;運算子無逗號,replace 無副作用。
    tokens.push(m[0].replace(/,/g, ''));
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
