// 功能 module:callout 容器(parse 型,markdown-it-container)。
//
//   ::: warning 標題(選填)
//   內容…
//   :::
// → 有顏色的提示框。支援 note / tip / warning / danger / info;標題省略則用預設字。

import { registerModule } from '../registry.js';

const LABELS = { note: 'Note', tip: 'Tip', warning: 'Warning', danger: 'Danger', info: 'Info' };
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

registerModule({
  name: 'callout',
  type: 'parse',
  css: `
.md-preview .callout { margin: 1em 0; border: 1px solid; border-radius: 8px; padding: .4em .9em; }
.md-preview .callout-title { font-weight: 600; margin: .35em 0; }
.md-preview .callout-body > :first-child { margin-top: 0; }
.md-preview .callout-body > :last-child { margin-bottom: 0; }
.md-preview .callout-note    { border-color: #93c5fd; background: #eff6ff; }
.md-preview .callout-note .callout-title    { color: #1e40af; }
.md-preview .callout-tip     { border-color: #6ee7b7; background: #ecfdf5; }
.md-preview .callout-tip .callout-title     { color: #065f46; }
.md-preview .callout-warning { border-color: #fcd34d; background: #fffbeb; }
.md-preview .callout-warning .callout-title { color: #92400e; }
.md-preview .callout-danger  { border-color: #fca5a5; background: #fef2f2; }
.md-preview .callout-danger .callout-title  { color: #991b1b; }
.md-preview .callout-info    { border-color: #67e8f9; background: #ecfeff; }
.md-preview .callout-info .callout-title    { color: #155e75; }
.md-preview .callout-note .callout-title::before    { content: 'ℹ️ '; }
.md-preview .callout-tip .callout-title::before     { content: '💡 '; }
.md-preview .callout-warning .callout-title::before { content: '⚠️ '; }
.md-preview .callout-danger .callout-title::before  { content: '⛔ '; }
.md-preview .callout-info .callout-title::before    { content: '📌 '; }
`,
  async apply(md) {
    const mod = await import('markdown-it-container');
    const container = mod.default || mod;
    md.use(container, 'callout', {
      validate: (params) => /^(note|tip|warning|danger|info)\b/i.test(params.trim()),
      render: (tokens, idx) => {
        const t = tokens[idx];
        if (t.nesting === 1) {
          const m = t.info.trim().match(/^(\w+)\s*(.*)$/);
          const type = (m && m[1] ? m[1] : 'note').toLowerCase();
          const title = (m && m[2] && m[2].trim()) || LABELS[type] || type;
          return `<div class="callout callout-${type}"><div class="callout-title">${esc(title)}</div><div class="callout-body">\n`;
        }
        return '</div></div>\n';
      },
    });
  },
});
