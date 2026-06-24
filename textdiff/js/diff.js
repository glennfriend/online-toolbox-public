// diff.js — 核心比對(純函式,不碰 DOM)。

// 通用 LCS:輸入兩個陣列 → ops [{t:'eq'|'del'|'add', v}]。字元級用。
export function lcsDiff(a, b) {
  const n = a.length, m = b.length;
  if (!n) return b.map((v) => ({ t: 'add', v }));
  if (!m) return a.map((v) => ({ t: 'del', v }));
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

export function charDiff(a, b) { return lcsDiff(Array.from(a), Array.from(b)); }

// 行級 → 並排列。opts:{ ignoreCase, ignoreSpace } 只影響「配對」(用正規化後的鍵比對),
// 但顯示時仍用原文(所以忽略大小寫時,大小寫不同的行會被當相同、各自顯示原樣)。
export function diffRows(aText, bText, opts = {}) {
  const norm = (s) => {
    let x = s;
    if (opts.ignoreSpace) x = x.replace(/\s+/g, '');
    if (opts.ignoreCase) x = x.toLowerCase();
    return x;
  };
  const A = aText.split('\n'), B = bText.split('\n');
  const ak = A.map(norm), bk = B.map(norm);
  const n = ak.length, m = bk.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = ak[i] === bk[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const rows = []; let i = 0, j = 0, dels = [], adds = [];
  const flush = () => {
    const k = Math.min(dels.length, adds.length);
    for (let x = 0; x < k; x++) rows.push({ type: 'chg', left: dels[x], right: adds[x] });
    for (let x = k; x < dels.length; x++) rows.push({ type: 'del', left: dels[x], right: null });
    for (let x = k; x < adds.length; x++) rows.push({ type: 'add', left: null, right: adds[x] });
    dels = []; adds = [];
  };
  while (i < n && j < m) {
    if (ak[i] === bk[j]) { flush(); rows.push({ type: 'eq', left: A[i], right: B[j] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) dels.push(A[i++]);
    else adds.push(B[j++]);
  }
  while (i < n) dels.push(A[i++]);
  while (j < m) adds.push(B[j++]);
  flush();
  return rows;
}

// JSON 結構化深層比對:依 key 比對(物件不看 key 順序),回傳 [{path, type:'add'|'del'|'chg', a, b}]。
const jtype = (v) => Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;
export function jsonDiff(a, b, path = '') {
  const out = [];
  const ta = jtype(a), tb = jtype(b);
  if (ta !== tb) { out.push({ path: path || '(根)', type: 'chg', a, b }); return out; }
  if (ta === 'object') {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    for (const k of keys) {
      const p = path ? path + '.' + k : k;
      if (!(k in a)) out.push({ path: p, type: 'add', b: b[k] });
      else if (!(k in b)) out.push({ path: p, type: 'del', a: a[k] });
      else out.push(...jsonDiff(a[k], b[k], p));
    }
  } else if (ta === 'array') {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const p = `${path}[${i}]`;
      if (i >= a.length) out.push({ path: p, type: 'add', b: b[i] });
      else if (i >= b.length) out.push({ path: p, type: 'del', a: a[i] });
      else out.push(...jsonDiff(a[i], b[i], p));
    }
  } else if (a !== b) {
    out.push({ path: path || '(根)', type: 'chg', a, b });
  }
  return out;
}
