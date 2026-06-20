// examples.js — 範例資料按鈕:一點就載入,用來展示各種功能(刻意各自命中不同 tag / 轉換)。
// 要改範例就改這裡。

export const EXAMPLES = [
  {
    label: '美國各州 CSV', // → 轉 JSON / 轉 Markdown / 統計 / a-z 排序
    data: '州,人口(百萬)\nCalifornia,39.4\nTexas,31.7\nFlorida,23.5\nNew York,20.0\nPennsylvania,13.1\nIllinois,12.7',
  },
  {
    label: '分數 (數字清單)', // → 數字排序 / 統計
    data: '88\n95\n72\n100\n63\n91',
  },
  {
    label: 'JSON', // → JSON 美化 / 縮成一行 / 轉 Markdown
    data: '[{"name":"Alice","age":30,"city":"Taipei"},{"name":"Bob","age":25,"city":"Tokyo"}]',
  },
  {
    label: '含網址的文字', // → 萃取 urls
    data: '參考 https://example.com/a 與 https://example.org/b\n另見 http://test.com/c(重複 https://example.com/a)',
  },
  {
    label: '網頁連結 (HTML)', // → 萃取有內容的連結(css 連結會被濾掉)
    data: '<ul>\n  <li><a href="https://news.ycombinator.com/item?id=1">Show HN: My cool project</a></li>\n  <li><a href="https://blog.example.com/duckdb-internals">DuckDB Internals Part 1</a></li>\n  <li><a href="https://x.com/css/app.css">styles</a></li>\n</ul>',
  },
  {
    label: 'Mermaid 語法', // 預設直接顯示圖
    data: 'graph TD\n  A[貼上資料] --> B{偵測 tags}\n  B --> C[推薦轉換]\n  C --> D[串成管線]\n  D --> E[輸出]',
    chain: [{ id: 'mermaid-render' }],
  },
  {
    label: '銷售明細彙整 CSV', // 預設直接分組加總(地區重複)
    data: '地區,金額\n北區,120\n南區,90\n北區,200\n中區,75\n南區,110\n北區,60',
    chain: [{ id: 'group-by-first' }],
  },
  {
    label: 'SQL Schema', // 預設直接 Schema → ER → 顯示圖
    data: 'CREATE TABLE users (\n  id INT PRIMARY KEY,\n  name VARCHAR(50),\n  email VARCHAR(100)\n);\nCREATE TABLE orders (\n  id INT PRIMARY KEY,\n  user_id INT REFERENCES users(id),\n  amount DECIMAL(10,2)\n);',
    chain: [{ id: 'sql-to-er' }, { id: 'mermaid-render' }],
  },
  {
    label: 'SQL 查詢 (DuckDB)', // 預設直接跑一個 group by 查詢
    data: '地區,產品,金額\n北區,A,120\n南區,B,90\n北區,C,200\n中區,A,75\n南區,A,110\n北區,B,60',
    chain: [{ id: 'sql-query', param: 'SELECT 地區, sum(金額) AS 合計 FROM t GROUP BY 地區 ORDER BY 合計 DESC' }],
  },
  {
    label: '英文文章', // 預設直接翻成繁中,輸出雙語(每段原文 + 譯文)
    data: 'DuckDB is an in-process analytical SQL database. Analytical means it is optimized for queries that scan millions of rows to filter, aggregate, and join.\n\nDuckDB has received widespread adoption because it is just so easy to use. It ships as a single binary under 20 MB with no external dependencies.',
    chain: [{ id: 'translate', param: 'zh-TW' }],
  },
];
