// urls.js — 兩種網址萃取(各自獨立的 pipe,互不影響):
//   1) 萃取 urls:純文字裡夾帶的網址,直接用 regex 抓出來(原始、全部)。
//   2) 萃取有內容的連結:HTML 專用,解析 <a> 的「錨文字」當成「有內容」的判準,
//      濾掉 css/js/dtd/字型/icon 等資源型網址,輸出成 Markdown 連結。

import { defineMod } from './index.js';

// 純文字含網址、但不是 HTML、也不是「整段就是一個網址」時才有意義
defineMod({
  id: 'extract-urls',
  label: '萃取 urls',
  appliesTo: (tags) => tags.includes('has-urls') && !tags.includes('html') && !tags.includes('url'),
  run(input) {
    const found = input.match(/https?:\/\/[^\s)<>"']+/g) || [];
    const unique = [...new Set(found)];
    return unique.length ? unique.join('\n') : '(找不到網址)';
  },
});

// 資源型網址(不是「內容」):樣式/腳本/DTD/字型/小圖示等
const RESOURCE = /\.(css|js|mjs|dtd|ico|woff2?|ttf|otf|eot|map)(\?|#|$)/i;
const ICONISH = /(favicon|apple-touch|touch-icon|sprite|\/icons?\/|logo)/i;

defineMod({
  id: 'extract-content-links',
  label: '萃取有內容的連結',
  appliesTo: ['html'],
  run(input) {
    // DOMParser 只解析、不執行 script、不載入資源 → 安全
    const doc = new DOMParser().parseFromString(input, 'text/html');
    const out = [];
    const seen = new Set();
    doc.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      const text = (a.textContent || '').trim().replace(/\s+/g, ' ');
      if (!/^https?:\/\//i.test(href)) return;   // 只要絕對 http(s) 連結
      if (RESOURCE.test(href) || ICONISH.test(href)) return; // 資源/圖示 → 不是內容
      if (!text) return;                          // 沒有錨文字 → 不算「有內容」
      const key = text + '|' + href;
      if (seen.has(key)) return; seen.add(key);
      out.push(`[${text}](${href})`);
    });
    return out.length ? out.join('\n') : '(找不到有內容的連結)';
  },
});
