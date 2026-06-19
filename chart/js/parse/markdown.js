// markdown.js — 解析 Markdown 表格成統一表。
//   | 水果 | 數量 |
//   |------|------|      ← 分隔線(略過)
//   | 蘋果 | 30   |

import { makeTable } from '../table.js';

export function parseMarkdown(raw) {
  const lines = raw.trim().split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.includes('|'));
  if (lines.length < 2) throw new Error('不是有效的 Markdown 表格');

  const cells = (line) => {
    let s = line.trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|')) s = s.slice(0, -1);
    return s.split('|').map((c) => c.trim());
  };

  const header = cells(lines[0]);
  // 第二列若是分隔線(只有 - : 空白)就跳過
  const isSep = (line) => /^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes('-');
  const body = lines.slice(isSep(lines[1]) ? 2 : 1).map(cells);
  if (!body.length) throw new Error('Markdown 表格沒有資料列');

  const width = header.length;
  const norm = body.map((r) => { const c = r.slice(0, width); while (c.length < width) c.push(''); return c; });
  return makeTable(header, norm);
}
