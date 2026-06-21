// frequency.mjs — Norvig 詞頻(count_1w.txt:`word\tcount`,已按次數遞減)。
// 回傳 Map(小寫word → count)。給自動完成排序用(常用字排前面)。

import fs from 'node:fs';

export function loadFrequency(path) {
  const text = fs.readFileSync(path, 'utf8');
  const freq = new Map();
  for (const line of text.split('\n')) {
    const tab = line.indexOf('\t');
    if (tab < 0) continue;
    const word = line.slice(0, tab).toLowerCase();
    const count = Number(line.slice(tab + 1).trim());
    if (word && Number.isFinite(count) && !freq.has(word)) freq.set(word, count);
  }
  return freq;
}
