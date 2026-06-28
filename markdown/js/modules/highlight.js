// 功能 module #1:程式碼上色(post 型,隔離最佳)。
//
// 對 render 後的 <pre><code class="language-xxx"> 套 highlight.js。
// highlight.js 的 common build 內含 js / json / php 與許多語言。
// highlight.js 延遲載入(用到才抓 CDN);載入失敗 → 程式碼維持原樣,不影響其它功能。
// 單一程式碼區塊上色失敗 → 只有那塊保留原樣,其它照常。

import { registerModule } from '../registry.js';

const THEME_CSS = 'https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github.css';

let _hljs = null;
let _loading = null;
function loadHljs() {
  if (_hljs) return Promise.resolve(_hljs);
  if (!_loading) _loading = import('highlight.js').then((m) => (_hljs = m.default || m));
  return _loading;
}

function ensureThemeCss() {
  if (document.getElementById('hljs-theme')) return;
  const link = document.createElement('link');
  link.id = 'hljs-theme';
  link.rel = 'stylesheet';
  link.href = THEME_CSS;
  document.head.appendChild(link);
}

registerModule({
  name: 'highlight',
  type: 'post',
  async apply(root) {
    const blocks = root.querySelectorAll('pre > code');
    if (!blocks.length) return;
    let hljs;
    try {
      hljs = await loadHljs();
    } catch (err) {
      console.error('[markdown] highlight.js 載入失敗(需網路),程式碼維持原樣:', err);
      return;
    }
    ensureThemeCss();
    blocks.forEach((block) => {
      try {
        hljs.highlightElement(block);
      } catch (err) {
        console.error('[markdown] 單一程式碼區塊上色失敗,保留原樣:', err);
      }
    });
  },
});
