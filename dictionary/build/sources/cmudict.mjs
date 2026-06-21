// cmudict.mjs — CMU 發音字典(`word  PH1 PH2 …`)。回傳 Map(小寫word → IPA)。
// 變體拼法如 `word(2)` 只取主要(無括號)那一條;有括號的略過。

import fs from 'node:fs';
import { arpaToIpa } from './arpabet.mjs';

export function loadPronunciations(path) {
  const text = fs.readFileSync(path, 'utf8');
  const ipa = new Map();
  for (const line of text.split('\n')) {
    const l = line.trim();
    if (!l || l.startsWith(';;;')) continue;
    const sp = l.indexOf(' ');
    if (sp < 0) continue;
    let word = l.slice(0, sp);
    if (word.includes('(')) continue;            // 變體發音 word(2) → 跳過,只留主要
    const phonemes = l.slice(sp + 1).trim().split(/\s+/);
    word = word.toLowerCase();
    if (!ipa.has(word)) ipa.set(word, arpaToIpa(phonemes));
  }
  return ipa;
}
