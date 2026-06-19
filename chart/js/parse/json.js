// json.js — 解析 JSON 成統一表。支援三種常見形狀:
//   1) 物件陣列   [{a:1,b:2}, {a:3,b:4}]            → 欄=所有 key 的聯集
//   2) 陣列的陣列 [["a","b"],[1,2],[3,4]]            → 第一列當表頭
//   3) 物件含陣列 {a:[1,3], b:[2,4]}                 → 欄=key,列=各陣列同 index 組起來

import { makeTable } from '../table.js';

export function parseJson(raw) {
  let data;
  try { data = JSON.parse(raw); } catch (e) { throw new Error('JSON 格式錯誤:' + e.message); }

  if (Array.isArray(data)) {
    if (!data.length) throw new Error('JSON 陣列是空的');
    if (Array.isArray(data[0])) return fromArrayOfArrays(data);
    if (isObject(data[0])) return fromArrayOfObjects(data);
    // 純值陣列 [1,2,3] → 單欄
    return makeTable(['值'], data.map((v) => [v]));
  }
  if (isObject(data)) return fromObjectOfArrays(data);
  throw new Error('看不懂的 JSON 結構');
}

function fromArrayOfObjects(arr) {
  const keys = [];
  arr.forEach((o) => Object.keys(o || {}).forEach((k) => { if (!keys.includes(k)) keys.push(k); }));
  const rows = arr.map((o) => keys.map((k) => (o && k in o ? o[k] : '')));
  return makeTable(keys, rows);
}

function fromArrayOfArrays(arr) {
  const header = arr[0].map((h) => String(h));
  return makeTable(header, arr.slice(1));
}

function fromObjectOfArrays(obj) {
  const keys = Object.keys(obj);
  const len = Math.max(...keys.map((k) => (Array.isArray(obj[k]) ? obj[k].length : 0)));
  const rows = [];
  for (let i = 0; i < len; i++) rows.push(keys.map((k) => (Array.isArray(obj[k]) ? obj[k][i] ?? '' : '')));
  return makeTable(keys, rows);
}

function isObject(v) { return v && typeof v === 'object' && !Array.isArray(v); }
