// 功能 module #2:程式碼區塊複製鈕(post 型,獨立於上色 module)。
//
// 風格:右上角浮一顆「= 語言名」的按鈕(沒有分隔線、不佔上方一排);點它複製整段程式碼,
// 回饋顯示「語言 (已複製)」。與 highlight module 互不相依。

import { registerModule } from '../registry.js';

// 語言代碼 → 顯示名稱(沒對到就用原代碼)。
const LABELS = {
  js: 'JavaScript', javascript: 'JavaScript', ts: 'TypeScript', typescript: 'TypeScript',
  php: 'PHP', json: 'json', html: 'HTML', xml: 'HTML', css: 'CSS', scss: 'SCSS',
  py: 'Python', python: 'Python', bash: 'Bash', sh: 'Shell', shell: 'Shell',
  sql: 'SQL', go: 'Go', java: 'Java', c: 'C', cpp: 'C++', rust: 'Rust', ruby: 'Ruby',
  yaml: 'YAML', yml: 'YAML', md: 'Markdown', markdown: 'Markdown', diff: 'Diff',
};

function langOf(code) {
  const m = (code.className || '').match(/language-([\w+#-]+)/);
  return m ? m[1].toLowerCase() : '';
}

function copyCode(code, btn) {
  const text = code.textContent;
  const done = (msg) => {
    btn.textContent = msg;
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = btn.dataset.label; btn.classList.remove('copied'); }, 1300);
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => done(`${btn.dataset.label} (已複製)`), () => done('複製失敗'));
  } else {
    done('複製失敗');
  }
}

registerModule({
  name: 'codeblock-copy',
  type: 'post',
  css: `
.md-preview .cb { position: relative; margin: .9em 0; }
.md-preview .cb > pre { margin: 0; }
.md-preview .cb-copy { position: absolute; top: .4rem; right: .4rem; z-index: 2; font: inherit; font-size: .74rem; line-height: 1; cursor: pointer; border: 1px solid var(--border, #d0d7de); border-radius: 5px; background: #fff; color: var(--muted, #57606a); padding: .28em .6em; opacity: .5; transition: opacity .15s, color .15s, border-color .15s; }
.md-preview .cb:hover .cb-copy, .md-preview .cb-copy:focus { opacity: 1; }
.md-preview .cb-copy:hover { color: var(--fg, #24292f); border-color: var(--accent, #2563eb); opacity: 1; }
.md-preview .cb-copy.copied { color: #1a7f37; border-color: #1a7f37; opacity: 1; }
`,
  apply(root) {
    root.querySelectorAll('pre > code').forEach((code) => {
      const pre = code.parentElement;
      if (!pre || pre.parentElement?.classList?.contains('cb')) return;   // 已處理過
      try {
        const lang = langOf(code);
        const label = lang ? (LABELS[lang] || lang) : '複製';
        const wrap = document.createElement('div');
        wrap.className = 'cb';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cb-copy';
        btn.textContent = label;
        btn.title = '複製程式碼';
        btn.dataset.label = label;
        btn.addEventListener('click', () => copyCode(code, btn));
        pre.replaceWith(wrap);
        wrap.append(btn, pre);
      } catch (err) {
        console.error('[markdown] code 複製鈕失敗,保留原樣:', err);
      }
    });
  },
});
