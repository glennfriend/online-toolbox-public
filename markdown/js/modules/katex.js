// 功能 module:數學公式(@vscode/markdown-it-katex,parse 型)。
// $...$ 行內、$$...$$ 區塊,用 KaTeX 渲染。plugin 會自動拉 katex;另需 katex 的 CSS。

import { registerModule } from '../registry.js';

const KATEX_CSS = 'https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.css';

function ensureCss() {
  if (document.getElementById('katex-css')) return;
  const link = document.createElement('link');
  link.id = 'katex-css';
  link.rel = 'stylesheet';
  link.href = KATEX_CSS;
  document.head.appendChild(link);
}

registerModule({
  name: 'katex',
  type: 'parse',
  async apply(md) {
    const mod = await import('@vscode/markdown-it-katex');
    md.use(mod.default || mod);
    ensureCss();
  },
});
