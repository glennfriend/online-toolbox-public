// examples.js — 範例資料按鈕:一點就載入,用來展示各種功能(刻意各自命中不同 tag / 轉換)。
// 要改範例就改這裡。

export const EXAMPLES = [
  {
    label: '美國各州 (CSV)', // → 轉 JSON / 轉 Markdown / 統計 / a-z 排序
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
    label: '流程圖 (Mermaid)', // → 顯示圖
    data: 'graph TD\n  A[貼上資料] --> B{偵測 tags}\n  B --> C[推薦轉換]\n  C --> D[串成管線]\n  D --> E[輸出]',
  },
];
