// sql.js — 任意 SQL 查詢(用 DuckDB-Wasm,外部 CDN)。這是個「參數化 + 非同步」的 mod:
//   • param:true → 在那一步顯示一個 SQL 輸入框 + 「執行」鈕(資料表名稱固定為 t)。
//   • async:true → run 是非同步(要等 DuckDB 載入與查詢)。
//   • external → UI 會顯示「使用外部資源」徽章,方便除錯。

import { defineMod } from './index.js';
import { queryCsv } from '../lib/duckdb.js';

defineMod({
  id: 'sql-query',
  label: 'SQL 查詢',
  appliesTo: ['csv', 'tsv'],
  param: true,
  defaultParam: 'SELECT * FROM t LIMIT 20',
  paramLabel: '輸入 SQL(資料表名稱為 t)。例:SELECT 地區, sum(金額) AS 合計 FROM t GROUP BY 地區 ORDER BY 合計 DESC',
  async: true,
  external: 'DuckDB-Wasm (CDN)',
  async run(input, tags, param) {
    const sql = (param || '').trim();
    if (!sql) return '(請在上方輸入 SQL,然後按「執行」)';
    return await queryCsv(input, sql);
  },
});
