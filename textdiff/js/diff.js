// diff.js — 核心比對(純函式,不碰 DOM)。LCS 演算法,可比「行」也可比「字元」。
//
// lcsDiff:輸入兩個陣列 → ops [{t:'eq'|'del'|'add', v}]。
// charDiff:字元級(用 Array.from 以正確處理 emoji/組合字等多碼點)。
// diffRows:行級 → 並排列;連續 del+add 配成「修改」列(供內層字元 diff)。

export function lcsDiff(a, b) {
  const n = a.length, m = b.length;
  if (!n) return b.map((v) => ({ t: 'add', v }));
  if (!m) return a.map((v) => ({ t: 'del', v }));

  // dp[i][j] = a[i..]、b[j..] 的最長共同子序列長度
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const ops = []; let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { ops.push({ t: 'eq', v: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) ops.push({ t: 'del', v: a[i++] });
    else ops.push({ t: 'add', v: b[j++] });
  }
  while (i < n) ops.push({ t: 'del', v: a[i++] });
  while (j < m) ops.push({ t: 'add', v: b[j++] });
  return ops;
}

export function charDiff(a, b) {
  return lcsDiff(Array.from(a), Array.from(b));
}

export function diffRows(aText, bText) {
  const aLines = aText.split('\n'), bLines = bText.split('\n');
  const ops = lcsDiff(aLines, bLines);
  const rows = [];
  let dels = [], adds = [];
  const flush = () => {
    const k = Math.min(dels.length, adds.length);
    for (let i = 0; i < k; i++) rows.push({ type: 'chg', left: dels[i], right: adds[i] });        // 配對 = 修改
    for (let i = k; i < dels.length; i++) rows.push({ type: 'del', left: dels[i], right: null });   // 多的刪除
    for (let i = k; i < adds.length; i++) rows.push({ type: 'add', left: null, right: adds[i] });    // 多的新增
    dels = []; adds = [];
  };
  for (const op of ops) {
    if (op.t === 'eq') { flush(); rows.push({ type: 'eq', left: op.v, right: op.v }); }
    else if (op.t === 'del') dels.push(op.v);
    else adds.push(op.v);
  }
  flush();
  return rows;
}
