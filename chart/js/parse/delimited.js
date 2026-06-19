// delimited.js — 解析有分隔符的表格:CSV(逗號)與 TSV(Tab)共用。
// 第一列當表頭。CSV 支援雙引號包住的欄位(裡面可含逗號、換行、跳脫的引號)。

import { makeTable } from '../table.js';

export function parseCsv(raw) { return parseDelimited(raw, ','); }
export function parseTsv(raw) { return parseDelimited(raw, '\t'); }

function parseDelimited(raw, delim) {
  const rows = splitRows(raw.replace(/\r\n?/g, '\n').trim(), delim);
  if (!rows.length) throw new Error('沒有可解析的內容');
  const header = rows[0];
  const body = rows.slice(1);
  if (!body.length) throw new Error('只有表頭、沒有資料列');
  // 補齊每列欄數,避免短列造成欄位錯位
  const width = header.length;
  const norm = body.map((r) => { const c = r.slice(0, width); while (c.length < width) c.push(''); return c; });
  return makeTable(header, norm);
}

// 走訪字元做切分:支援雙引號(處理欄內的分隔符、換行、"" 跳脫)。
function splitRows(text, delim) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }  // "" → 一個 "
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(field); field = '';
    } else if (ch === '\n') {
      row.push(field); field = ''; rows.push(row); row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.length > 1 || row[0] !== '') rows.push(row);
  return rows.map((r) => r.map((c) => c.trim()));
}
