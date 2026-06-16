// git diff / unified diff → 上色 HTML。逐行依前綴判斷類型,像 git diff 一樣有 +/- 與顏色。

import { escapeHtml } from '../lib/dom.js';

export function renderDiff(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const body = lines
    .map((line) => `<span class="diff-line ${lineClass(line)}">${escapeHtml(line) || ' '}</span>`)
    .join('');
  return `<pre class="diff-view">${body}</pre>`;
}

function lineClass(line) {
  if (/^(diff --git|index |new file|deleted file|old mode|new mode|similarity |rename )/.test(line)) return 'diff-meta';
  if (line.startsWith('@@')) return 'diff-hunk';
  if (line.startsWith('+++') || line.startsWith('---')) return 'diff-file';
  if (line.startsWith('+')) return 'diff-add';
  if (line.startsWith('-')) return 'diff-del';
  return 'diff-ctx';
}
