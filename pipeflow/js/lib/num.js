// num.js — 數字小工具。

// 去掉千分位逗號/空白後轉數字;不是數字回傳 NaN。
export function toNumber(v) {
  if (typeof v === 'number') return v;
  if (v == null) return NaN;
  const s = String(v).replace(/,/g, '').replace(/\s/g, '');
  return s === '' ? NaN : Number(s);
}

export function isNumeric(v) {
  return Number.isFinite(toNumber(v));
}

// 去浮點雜訊
export function round(n, dp = 6) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
