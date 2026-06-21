// wordset.mjs — Wordset Dictionary(data/a.json … z.json + misc.json)。
// 逐檔讀(省記憶體),回傳 generator:每次吐一個 { word, meanings:[{pos, def, example}] }。

import fs from 'node:fs';
import path from 'node:path';

const FILES = 'abcdefghijklmnopqrstuvwxyz'.split('').concat('misc');

export function* loadWordset(dir) {
  for (const f of FILES) {
    const p = path.join(dir, f + '.json');
    if (!fs.existsSync(p)) continue;
    const obj = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const word of Object.keys(obj)) {
      const entry = obj[word];
      const meanings = (entry.meanings || [])
        .map((m) => ({ pos: m.speech_part || '', def: m.def || '', example: m.example || '' }))
        .filter((m) => m.def);
      if (meanings.length) yield { word, meanings };
    }
  }
}
