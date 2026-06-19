// detect.js — 猜輸入資料是哪一種格式(啟發式)。猜錯時使用者可在 UI 手動指定。
//
// 順序由最明確到最模糊:Markdown 表格 → JSON → TSV(有 Tab)→ CSV。

export const FORMAT_LABELS = {
  auto: '自動偵測',
  json: 'JSON',
  csv: 'CSV',
  tsv: 'TSV(Excel/Sheet)',
  markdown: 'Markdown 表格',
};

export function detectFormat(raw) {
  const text = raw.trim();
  if (!text) return 'csv';
  if (looksMarkdownTable(text)) return 'markdown';
  if (looksJson(text)) return 'json';
  if (text.includes('\t')) return 'tsv';
  return 'csv';
}

// Markdown 表格:含 | 分隔,且有一列是 |---|---| 這種分隔線。
function looksMarkdownTable(text) {
  return /\|/.test(text) && /^\s*\|?\s*:?-{2,}.*\|/m.test(text);
}

// JSON:開頭是 { 或 [,且能 JSON.parse。
function looksJson(text) {
  if (text[0] !== '{' && text[0] !== '[') return false;
  try { JSON.parse(text); return true; } catch { return false; }
}
