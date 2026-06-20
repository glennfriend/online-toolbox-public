// diagram.js — 渲染類 mod:把 Mermaid 原始碼「顯示成圖」。
//
// 與一般 transform mod 不同:它 kind:'render',不回傳新文字、不改資料,
// 只是把這一步的文字用圖呈現(資料仍是原本的 mermaid 原始碼)。
// 因此後續若要再轉換,仍以原始碼為準;這個渲染步驟本身視為「終點」。

import { defineMod } from './index.js';
import { renderMermaid } from '../lib/mermaid.js';

defineMod({
  id: 'mermaid-render',
  label: 'convert to Mermaid',
  kind: 'render',
  appliesTo: ['mermaid'],
  external: 'Mermaid (CDN)',
  // render 不回傳文字,而是把圖畫進 container(非同步,因為要先載入外部 Mermaid)
  async render(source, container) {
    container.textContent = '圖產生中…';
    try {
      container.innerHTML = await renderMermaid(source);
    } catch (e) {
      container.textContent = '';
      const err = document.createElement('div');
      err.className = 'step-error';
      err.textContent = '❌ ' + e.message;
      container.append(err);
    }
  },
});
