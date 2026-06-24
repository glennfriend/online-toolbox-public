// reveal.js — 把一段文字轉成 HTML,並把「不可見/危險字元」標成看得見(附碼點與說明)。
// 危險的隱形字元(零寬/NBSP/bidi…)一律標出來(否則根本看不到);一般空格只有開「顯示空白」時才標。

import { INVISIBLE, isInvisible, u, esc } from './unicode.js';

export function revealChar(ch, { showSpaces = false } = {}) {
  const cp = ch.codePointAt(0);
  if (ch === ' ') return showSpaces ? '<span class="ws" title="space U+0020">·</span>' : ' ';
  if (ch === '\t') return '<span class="ws" title="tab U+0009">⇥</span>';
  if (ch === '\r') return `<span class="inv" title="${u(cp)} CR 歸位">␍</span>`;
  if (isInvisible(cp)) { const [g, name] = INVISIBLE[cp]; return `<span class="inv" title="${u(cp)} ${esc(name)}">${g}</span>`; }
  if (cp < 0x20) return `<span class="inv" title="${u(cp)} 控制字元">␃</span>`;
  return esc(ch);
}

export function revealHtml(line, opts = {}) {
  let out = '';
  for (const ch of line) out += revealChar(ch, opts);
  return out;
}
