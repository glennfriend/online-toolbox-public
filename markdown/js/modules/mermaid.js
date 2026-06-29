// 功能 module:Mermaid 圖(post 型)。
//
// 把 ```mermaid 區塊渲染成圖,並在上方加 5 顆匯出鈕:
//   原始碼(複製) / PNG(下載) / SVG(複製向量碼) / Base64(複製 <img> 內嵌碼) / 複製圖片(到剪貼簿)
// mermaid 延遲載入 CDN;載入或單張渲染失敗 → 保留該區塊原始碼,不影響其它。
//
// 注意:此 module 必須「先於」highlight / codeblock 註冊(main.js import 順序),
//       這樣 mermaid 區塊會先被換成圖,highlight/codeblock 就不會再去處理它。

import { registerModule } from '../registry.js';

let _mermaid = null;
let _loading = null;
let _seq = 0;

function loadMermaid() {
  if (_mermaid) return Promise.resolve(_mermaid);
  if (!_loading) {
    _loading = import('mermaid').then((m) => {
      const mermaid = m.default || m;
      const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        theme: dark ? 'dark' : 'default',
        htmlLabels: false,             // 用 <text> 而非 foreignObject,PNG / 剪貼簿才畫得出來
        flowchart: { htmlLabels: false },
      });
      return (_mermaid = mermaid);
    });
  }
  return _loading;
}

// ── SVG → 字串 / PNG ──
function svgToString(svg) {
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return new XMLSerializer().serializeToString(clone);
}
function svgSize(svg) {
  const box = svg.viewBox?.baseVal;
  const rect = svg.getBoundingClientRect();
  return { w: Math.ceil(box?.width || rect.width || 800), h: Math.ceil(box?.height || rect.height || 600) };
}
function svgToPngBlob(svg, scale = 2) {
  const { w, h } = svgSize(svg);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w * scale; canvas.height = h * scale;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
    };
    img.onerror = reject;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgToString(svg));
  });
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const blobToDataURL = (blob) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob);
});

// ── 按鈕 + 回饋 ──
function makeBtn(label, title, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'mm-btn'; btn.textContent = label;
  btn.title = title; btn.dataset.label = label;
  btn.addEventListener('click', () => onClick(btn));
  return btn;
}
function feedback(btn, status) {
  const label = btn.dataset.label;
  clearTimeout(btn._t);
  btn.textContent = `${label} (${status})`;
  btn.classList.add('copied');
  btn._t = setTimeout(() => { btn.textContent = label; btn.classList.remove('copied'); }, 1300);
}
async function copyText(text, btn) {
  try { await navigator.clipboard.writeText(text); feedback(btn, '已複製'); }
  catch { feedback(btn, '失敗'); }
}

function buildTools(source, svg) {
  const tools = document.createElement('div');
  tools.className = 'mm-tools';
  tools.append(
    makeBtn('原始碼', '複製 mermaid 原始碼', (btn) => copyText(source, btn)),
    makeBtn('PNG', '下載 PNG 圖檔', async (btn) => {
      try { downloadBlob(await svgToPngBlob(svg), 'diagram.png'); feedback(btn, '已下載'); }
      catch { feedback(btn, '失敗'); }
    }),
    makeBtn('SVG', '複製 <svg> 向量標記', (btn) => copyText(svgToString(svg), btn)),
    makeBtn('Base64', '複製 <img> base64 內嵌碼', async (btn) => {
      try { const url = await blobToDataURL(await svgToPngBlob(svg)); copyText(`<img src="${url}" alt="diagram">`, btn); }
      catch { feedback(btn, '失敗'); }
    }),
    makeBtn('複製圖片', '複製圖片(PNG)到剪貼簿', async (btn) => {
      try { const blob = await svgToPngBlob(svg); await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); feedback(btn, '已複製'); }
      catch { feedback(btn, '不支援'); }
    }),
  );
  return tools;
}

registerModule({
  name: 'mermaid',
  type: 'post',
  css: `
.md-preview .mm-wrap { margin: 1em 0; }
.md-preview .mm-tools { display: flex; gap: .4rem; flex-wrap: wrap; margin-bottom: .5rem; }
.md-preview .mm-btn { font: inherit; font-size: .76rem; line-height: 1; padding: .3em .7em; border: 1px solid var(--border, #d0d7de); border-radius: 5px; background: #fff; color: var(--muted, #57606a); cursor: pointer; opacity: .8; }
.md-preview .mm-btn:hover { color: var(--fg, #24292f); border-color: var(--accent, #2563eb); opacity: 1; }
.md-preview .mm-btn.copied { color: #1a7f37; border-color: #1a7f37; opacity: 1; }
.md-preview .mm-fig { text-align: center; overflow: auto; }
.md-preview .mm-fig svg { max-width: 100%; height: auto; }
`,
  async apply(root) {
    const codes = [...root.querySelectorAll('pre > code.language-mermaid')];
    if (!codes.length) return;
    let mermaid;
    try { mermaid = await loadMermaid(); }
    catch (err) { console.error('[markdown] mermaid 載入失敗(需網路),保留原始碼:', err); return; }

    for (const code of codes) {
      const pre = code.parentElement;
      const source = code.textContent;
      try {
        const { svg } = await mermaid.render(`mmd-${++_seq}`, source);
        const wrap = document.createElement('div');
        wrap.className = 'mm-wrap';
        const fig = document.createElement('div');
        fig.className = 'mm-fig';
        fig.innerHTML = svg;
        wrap.append(buildTools(source, fig.querySelector('svg')), fig);
        pre.replaceWith(wrap);
      } catch (err) {
        console.error('[markdown] mermaid 單張渲染失敗,保留原始碼:', err);
      }
    }
  },
});
