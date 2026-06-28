// 功能 module #2:程式碼區塊工具列(post 型,獨立於上色 module)。
//
// 在每個 <pre><code> 上方加一條工具列:左邊語言名、右邊「複製」鈕。
// 與 highlight module 互不相依:這個壞了不影響上色,反之亦然。

import { registerModule } from '../registry.js';

// 語言代碼 → 顯示名稱(沒對到就用原代碼)。
const LABELS = {
  js: 'JavaScript', javascript: 'JavaScript', ts: 'TypeScript', typescript: 'TypeScript',
  php: 'PHP', json: 'json', html: 'HTML', xml: 'HTML', css: 'CSS', scss: 'SCSS',
  py: 'Python', python: 'Python', bash: 'Bash', sh: 'Shell', shell: 'Shell',
  sql: 'SQL', go: 'Go', java: 'Java', c: 'C', cpp: 'C++', rust: 'Rust', ruby: 'Ruby',
  yaml: 'YAML', yml: 'YAML', md: 'Markdown', markdown: 'Markdown', diff: 'Diff',
};

// 取原始語言代碼:markdown-it 給的是第一個 language-xxx(highlight 之後可能再追加別的)。
function langOf(code) {
  const m = (code.className || '').match(/language-([\w+#-]+)/);
  return m ? m[1].toLowerCase() : '';
}

registerModule({
  name: 'codeblock-toolbar',
  type: 'post',
  css: `
.cb { margin: .8em 0; border: 1px solid #d0d7de; border-radius: 8px; overflow: hidden; }
.cb-bar { display: flex; align-items: center; justify-content: space-between; gap: .5rem; padding: .25em .6em; background: #f6f8fa; border-bottom: 1px solid #d8dee4; font-size: .78rem; }
.cb-lang { color: #57606a; }
.cb-copy { font: inherit; font-size: .76rem; cursor: pointer; border: 1px solid #d0d7de; border-radius: 6px; background: #fff; color: #24292f; padding: .1em .65em; }
.cb-copy:hover { background: #eef1f4; }
.cb > pre { margin: 0; border: 0; border-radius: 0; }
`,
  apply(root) {
    root.querySelectorAll('pre > code').forEach((code) => {
      const pre = code.parentElement;
      if (!pre || pre.parentElement?.classList?.contains('cb')) return;   // 已加過就跳過
      try {
        const lang = langOf(code);
        const wrap = document.createElement('div');
        wrap.className = 'cb';

        const bar = document.createElement('div');
        bar.className = 'cb-bar';
        const label = document.createElement('span');
        label.className = 'cb-lang';
        label.textContent = lang ? (LABELS[lang] || lang) : '';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cb-copy';
        btn.textContent = '複製';
        btn.addEventListener('click', () => copyCode(code, btn));
        bar.append(label, btn);

        pre.replaceWith(wrap);     // 把 pre 換成 wrap…
        wrap.append(bar, pre);     // …再把工具列 + pre 放進 wrap
      } catch (err) {
        console.error('[markdown] code 工具列失敗,保留原樣:', err);
      }
    });
  },
});

function copyCode(code, btn) {
  const text = code.textContent;
  const done = (msg) => { btn.textContent = msg; setTimeout(() => { btn.textContent = '複製'; }, 1200); };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => done('複製 (copyed)'), () => done('複製失敗'));
  } else {
    done('複製失敗');
  }
}
