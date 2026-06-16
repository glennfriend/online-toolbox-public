// 共用小工具。刻意保持極小:只放「跨模組會重複用到」的純函式。

// 補零成兩位數字(日期 / 時間格式化會反覆用到)。
export function pad2(n) {
  return String(n).padStart(2, '0');
}

// HTML 跳脫。主控制器目前用 textContent 顯示答案(本身就安全),
// 這個 helper 留給「日後需要組 HTML 的 evaluator」使用,避免各自重寫。
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
