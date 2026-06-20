// urls.js — 兩種網址萃取(各自獨立的 pipe,互不影響):
//   1) 萃取 urls:純文字裡夾帶的網址,直接用 regex 抓出來(原始、全部)。
//   2) 萃取有內容的連結:HTML 專用,解析 <a> 的「錨文字」當成「有內容」的判準,
//      濾掉 css/js/dtd/字型/icon 等資源型網址,輸出成 Markdown 連結。

import { defineMod } from './index.js';

// 把抓到的「候選網址」修掉尾巴混進來的內文字元。
//   • 括號平衡:URL 可以含成對的 ( )(如維基 ..._(disambiguation));但「沒關閉的 (」之後、
//     或「多出來的 )」之前,多半是文章內容(例:c(重複…、結尾的 )),從那裡切掉。
//   • 去尾端標點:句尾的 . , ! ? : ; 與中文標點不算網址的一部分。
// 這樣比「粗暴排除某些字元」更準:既不會吞掉後面的中文,也不會切斷正常含括號的網址。
function cleanUrl(u) {
  let depth = 0, openAt = -1;
  for (let i = 0; i < u.length; i++) {
    if (u[i] === '(') { if (depth === 0) openAt = i; depth++; }
    else if (u[i] === ')') {
      depth--;
      if (depth < 0) { u = u.slice(0, i); depth = 0; break; } // 多出來的 ) → 切掉
    }
  }
  if (depth > 0 && openAt >= 0) u = u.slice(0, openAt);        // 沒關閉的 ( → 切掉
  return u.replace(/[.,;:!?'"’”，。、；：！？]+$/u, '');         // 尾端標點(') 由上面的括號平衡處理)
}

// 純文字含網址、但不是 HTML、也不是「整段就是一個網址」時才有意義
defineMod({
  id: 'extract-urls',
  label: '萃取 urls',
  appliesTo: (tags) => tags.includes('has-urls') && !tags.includes('html') && !tags.includes('url'),
  run(input) {
    // 允許成對括號;只在空白、角括號/引號、中文標點處斷開(尾巴再交給 cleanUrl 修)
    const found = input.match(/https?:\/\/[^\s<>"'，。、；：！？「」『』【】（）《》]+/g) || [];
    const cleaned = found.map(cleanUrl).filter(Boolean);
    const unique = [...new Set(cleaned)];
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
