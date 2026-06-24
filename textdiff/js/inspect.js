// inspect.js — 嚴格分析:把「看起來一樣、其實不同」的東西攤出來(這是勝過一般比對網站的重點)。
// 全部純函式,吃「原始」文字(含 \r,不要先正規化)。

import { INVISIBLE, isInvisible, u } from './unicode.js';

function lineEndings(raw) {
  const crlf = (raw.match(/\r\n/g) || []).length;
  const cr = (raw.match(/\r(?!\n)/g) || []).length;
  const lf = (raw.match(/(?:^|[^\r])\n/g) || []).length;
  const kinds = [];
  if (crlf) kinds.push('CRLF');
  if (lf) kinds.push('LF');
  if (cr) kinds.push('CR');
  return kinds.length ? kinds.join('+') : '—';
}

function scanInvisible(raw) {
  const m = new Map();
  for (const ch of raw) {
    const cp = ch.codePointAt(0);
    if (isInvisible(cp)) m.set(cp, (m.get(cp) || 0) + 1);
  }
  return m;
}

// 同形字疑慮:同一個「詞」混用不同文字系統(拉丁 + 西里爾/希臘)→ 很可能是肉眼相同的偽造字。
function scriptMix(raw) {
  const out = new Set();
  for (const w of raw.split(/\s+/)) {
    if (!w) continue;
    if (/\p{Script=Latin}/u.test(w) && /\p{Script=Cyrillic}|\p{Script=Greek}/u.test(w)) out.add(w);
  }
  return [...out];
}

export function strictReport(a, b) {
  const findings = [];

  // 總結論
  let verdict;
  if (a === b) verdict = { level: 'same', text: '完全相同(連 bytes 都一樣)' };
  else if (a.normalize('NFC') === b.normalize('NFC')) verdict = { level: 'warn', text: '畫面相同,但 Unicode 正規化不同(NFC / NFD)' };
  else if (a.replace(/\s/g, '') === b.replace(/\s/g, '')) verdict = { level: 'warn', text: '只差在空白/不可見字元(去掉空白後相同)' };
  else verdict = { level: 'diff', text: '內容不同' };

  // 行尾
  const ea = lineEndings(a), eb = lineEndings(b);
  if (ea !== eb) findings.push({ k: '行尾', v: `A=${ea}、B=${eb}(不一致)` });
  else if (ea.includes('+')) findings.push({ k: '行尾', v: `兩邊都混用 ${ea}` });

  // BOM
  const bom = [];
  if (a.charCodeAt(0) === 0xFEFF) bom.push('A');
  if (b.charCodeAt(0) === 0xFEFF) bom.push('B');
  if (bom.length) findings.push({ k: 'BOM', v: `${bom.join('、')} 開頭有 BOM(U+FEFF)` });

  // 隱形/危險字元(各邊)
  for (const [side, t] of [['A', a], ['B', b]]) {
    const f = scanInvisible(t);
    if (f.size) {
      const parts = [...f].map(([cp, n]) => `${u(cp)} ${INVISIBLE[cp][1]} ×${n}`);
      findings.push({ k: `隱形字元(${side})`, v: parts.join('、') });
    }
  }

  // 同形字疑慮
  const sm = [...new Set([...scriptMix(a), ...scriptMix(b)])];
  if (sm.length) findings.push({ k: '同形字疑慮', v: `混用不同文字系統(可能是肉眼相同的偽造字):${sm.slice(0, 6).join('  ')}` });

  // 尾端空白行數
  const trail = (t) => (t.split('\n').filter((l) => /[ \t ]+$/.test(l)).length);
  const ta = trail(a), tb = trail(b);
  if (ta || tb) findings.push({ k: '尾端空白', v: `A ${ta} 行、B ${tb} 行 結尾有多餘空白` });

  return { verdict, findings };
}
