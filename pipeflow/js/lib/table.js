// table.js — 把 CSV / TSV / Markdown 表格解析成 { header, rows };以及把表格轉成物件陣列。
// 給 mods(轉 JSON / 轉 Markdown / 統計)共用。v1 用簡單切分(CSV 不處理引號內逗號)。

import { toNumber } from './num.js';

// 依 tags 決定分隔方式,回傳 { header:[...], rows:[[...]] }
export function parseTable(text, tags) {
  if (tags.includes('markdown')) return parseMarkdown(text);
  const delim = tags.includes('tsv') ? '\t' : ',';
  return parseDelimited(text, delim);
}

function parseDelimited(text, delim) {
  const lines = text.replace(/\r\n?/g, '\n').trim().split('\n').filter((l) => l.length);
  if (!lines.length) return { header: [], rows: [] };
  const header = lines[0].split(delim).map((s) => s.trim());
  const rows = lines.slice(1).map((l) => {
    const cells = l.split(delim).map((s) => s.trim());
    while (cells.length < header.length) cells.push('');
    return cells.slice(0, header.length);
  });
  return { header, rows };
}

function parseMarkdown(text) {
  const lines = text.trim().split(/\r?\n/).map((l) => l.trim()).filter((l) => l.includes('|'));
  if (!lines.length) return { header: [], rows: [] };
  const cells = (line) => {
    let s = line;
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|')) s = s.slice(0, -1);
    return s.split('|').map((c) => c.trim());
  };
  const header = cells(lines[0]);
  const isSep = (l) => /-/.test(l) && /^[\s|:-]+$/.test(l);
  const rows = lines.slice(isSep(lines[1] || '') ? 2 : 1).map((l) => {
    const c = cells(l);
    while (c.length < header.length) c.push('');
    return c.slice(0, header.length);
  });
  return { header, rows };
}

// 表格 → 物件陣列:[{ 欄名: 值, ... }]
export function toObjects(table) {
  return table.rows.map((row) => {
    const obj = {};
    table.header.forEach((h, i) => { obj[h] = autoCell(row[i]); });
    return obj;
  });
}

// 純數字的儲存格轉成數字,其餘維持字串(讓轉出的 JSON 數字不帶引號)
function autoCell(v) {
  const n = toNumber(v);
  return (v !== '' && Number.isFinite(n) && String(n) === String(v).replace(/,/g, '').trim()) ? n : v;
}
