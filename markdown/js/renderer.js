// markdown-it 薄 adapter(核心可抽換)。
//
// 對外只暴露 render(text)→html 與 enhance(rootEl)。要換核心(remark / marked)只改這一支。
// 安全基線:html:false → 使用者寫的原始 HTML 一律 escape(從根本避免 XSS)。
// 核心延遲載入(用到才抓 CDN):外殼離線也能開,核心抓不到時誠實退回純文字。

import { applyMdModules, runPostModules } from './registry.js';

let _md = null;
let _loading = null;

async function instance() {
  if (_md) return _md;
  if (!_loading) {
    _loading = (async () => {
      const mod = await import('markdown-it');
      const markdownit = mod.default || mod;
      // breaks:true → 單一換行就斷行(像 HackMD/Obsidian,筆記更直覺);html:false 為安全基線。
      const md = markdownit({ html: false, linkify: true, typographer: false, breaks: true });
      await applyMdModules(md);   // 套用 parse / render 型 module(各自隔離;plugin 從 CDN 載入)
      _md = md;
      return md;
    })();
  }
  return _loading;
}

// markdown 文字 → 安全 HTML 字串。核心載入或解析失敗 → 退回 escape 純文字(誠實、且程式不掛)。
export async function render(text) {
  try {
    const md = await instance();
    return md.render(text ?? '');
  } catch (err) {
    console.error('[markdown] 核心載入或解析失敗,退回純文字安全模式:', err);
    return `<pre class="md-fallback">${escapeHtml(text ?? '')}</pre>`
      + '<p class="md-note">⚠ Markdown 核心(markdown-it)載入失敗 —— 需要網路載入 CDN;已退回純文字。</p>';
  }
}

// 對 render 後的預覽 DOM 跑 post 型 module(程式碼上色等)。
export async function enhance(rootEl) {
  await runPostModules(rootEl);
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
