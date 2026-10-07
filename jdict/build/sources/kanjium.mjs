// kanjium.mjs — 解析 Kanjium accents.txt(音調核位置;CC BY-SA 4.0)。
// 格式:寫法 \t 讀音 \t 音調。讀音欄空白 = 純假名詞(寫法就是讀音)。
// 音調:「0」「0,2」;少數帶詞性「(副)0,(名)3」。這裡原樣拆成 [{pos, n}] 保留詞性註記。

import fs from 'node:fs';

export function parseAccent(raw) {
  const out = [];
  let pos = null;
  for (const part of raw.split(',')) {
    const m = /^(?:\(([^)]+)\))?(\d+)$/.exec(part.trim());
    if (!m) return null;                 // 格式不認得 → 整筆不收(不猜)
    if (m[1]) pos = m[1];
    out.push(pos ? [+m[2], pos] : [+m[2]]);
  }
  return out;
}

export function loadKanjium(file) {
  const rows = [];
  let bad = 0;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [w, r, a] = line.split('\t');
    const acc = a ? parseAccent(a) : null;
    if (!w || !acc) { bad++; continue; }
    rows.push({ w, r: r || w, kanaOnly: !r, acc });
  }
  return { rows, bad };
}
