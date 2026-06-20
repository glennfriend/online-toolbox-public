// groupby.js — 簡單分組加總(純 JS、離線):依「第一欄」分組,把各數值欄加總。
// 想要任意分組 / 任意聚合,用「SQL 查詢」那個 mod(DuckDB)。

import { defineMod } from './index.js';
import { parseTable } from '../lib/table.js';
import { toNumber, isNumeric, round } from '../lib/num.js';

defineMod({
  id: 'group-by-first',
  label: '依第一欄分組加總',
  appliesTo: ['csv', 'tsv'],
  run(input, tags) {
    const { header, rows } = parseTable(input, tags);
    if (header.length < 2 || !rows.length) return '(需要至少兩欄、且有資料)';

    // 找出數值欄(第一欄當分組鍵,不算)
    const numIdx = header.map((h, i) => i).filter((i) => i > 0 && rows.some((r) => isNumeric(r[i])));
    if (!numIdx.length) return '(沒有可加總的數值欄)';

    const order = [];
    const acc = new Map();
    rows.forEach((r) => {
      const key = r[0] ?? '';
      if (!acc.has(key)) { order.push(key); acc.set(key, numIdx.map(() => 0)); }
      const sums = acc.get(key);
      numIdx.forEach((ci, j) => { const n = toNumber(r[ci]); if (Number.isFinite(n)) sums[j] += n; });
    });

    const outHeader = [header[0], ...numIdx.map((i) => header[i])];
    const outRows = order.map((key) => [key, ...acc.get(key).map((v) => round(v))]);
    return [outHeader, ...outRows].map((r) => r.join(',')).join('\n'); // 輸出 CSV,可再往下接
  },
});
