// table.js — 統一的「二維表」模型 + 型別判斷 + 依類別彙總(group-by)。
//
// 所有輸入格式(JSON / CSV / TSV / Markdown)都先被解析成這個統一表,
// 之後的「選欄位 → 出圖」都只認這個表,不必管原始格式。
//
// 表的結構:
//   { columns: [{ name, type }], rows: [ [cell, cell, ...], ... ] }
//   type 為 'number' | 'string'(日期暫時當字串標籤處理)。

// 把任意值轉成數字(去掉千分位逗號與空白);不是數字回傳 NaN。
export function toNumber(v) {
  if (typeof v === 'number') return v;
  if (v == null) return NaN;
  const s = String(v).replace(/,/g, '').replace(/\s/g, '');
  if (s === '') return NaN;
  return Number(s);
}

export function isNumeric(v) {
  return Number.isFinite(toNumber(v));
}

// 從「表頭 + 資料列」建出統一表,並逐欄推斷型別。
export function makeTable(header, rows) {
  const names = header.map((h, i) => (h == null || String(h).trim() === '' ? `欄位${i + 1}` : String(h)));
  const columns = names.map((name, i) => ({
    name,
    type: inferColumnType(rows, i),
  }));
  return { columns, rows };
}

// 一欄:若所有非空值都是數字 → number,否則 string。
function inferColumnType(rows, colIdx) {
  let seen = 0;
  for (const row of rows) {
    const v = row[colIdx];
    if (v == null || String(v).trim() === '') continue;
    seen++;
    if (!isNumeric(v)) return 'string';
  }
  return seen > 0 ? 'number' : 'string';
}

// 依「類別欄(xIdx)」分組,對每個「數值欄(yIdxs)」彙總。
// mode: 'sum' | 'avg' | 'count'。回傳 { categories, series }:
//   categories: 依首次出現順序的類別清單
//   series:     每個數值欄一個 { name, data }(data 對齊 categories)
export function aggregateByCategory(table, xIdx, yIdxs, mode) {
  const order = [];                 // 類別出現順序
  const buckets = new Map();        // 類別 → 每個 y 欄的累計 { sum:[], count:[] }

  for (const row of table.rows) {
    const key = String(row[xIdx] ?? '');
    if (!buckets.has(key)) {
      order.push(key);
      buckets.set(key, { sum: yIdxs.map(() => 0), count: yIdxs.map(() => 0) });
    }
    const b = buckets.get(key);
    yIdxs.forEach((yi, j) => {
      const n = toNumber(row[yi]);
      if (Number.isFinite(n)) { b.sum[j] += n; b.count[j] += 1; }
    });
  }

  const series = yIdxs.map((yi, j) => ({
    name: table.columns[yi].name,
    data: order.map((key) => {
      const b = buckets.get(key);
      if (mode === 'count') return b.count[j];
      if (mode === 'avg') return b.count[j] ? round(b.sum[j] / b.count[j]) : 0;
      return round(b.sum[j]); // sum(預設)
    }),
  }));

  return { categories: order, series };
}

function round(n) { return Math.round(n * 1e6) / 1e6; } // 去掉浮點雜訊

// 取數值型欄位的索引(預設用來當 Y)
export function numericColumns(table) {
  return table.columns.map((c, i) => (c.type === 'number' ? i : -1)).filter((i) => i >= 0);
}

// 取第一個字串欄(預設用來當 X / 類別);沒有就回 0
export function firstStringColumn(table) {
  const i = table.columns.findIndex((c) => c.type === 'string');
  return i >= 0 ? i : 0;
}
