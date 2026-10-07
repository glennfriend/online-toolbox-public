// charfold.mjs — 字形折疊表:台灣繁體/舊字體 → 日本新字體(逐字)。
//
// 用途:讓使用者用台灣繁體打「學習」也查得到「学習」。
// 做法:對每個 CJK 字單獨跑 OpenCC tw→jp,有變的就記成 src→dst。
//   • 只做「逐字」對照,不用 OpenCC 的詞組表 → 結果可預期、可存進 DB 讓前端用同一張表。
//   • 這張表同時套在「詞條寫法」與「使用者輸入」兩邊(見 js/normalize.js 的 makeKey),
//     所以就算某個日文字也被折疊(例:龍→竜),兩邊鍵仍一致,只是合併成同一把鍵,不會查不到。
//   • 一對多(日文 弁 = 繁體 辨/辯/瓣)在這個方向是「多對一」,天生沒問題。

import { createRequire } from 'node:module';
const OpenCC = createRequire(import.meta.url)('opencc-js');

// 要測的字:CJK 基本區 + 擴充 A + 相容表意字(日文舊字體常落在這)
const RANGES = [[0x3400, 0x4DBF], [0x4E00, 0x9FFF], [0xF900, 0xFAFF]];

// grades:KANJIDIC2 的 字→年級(1–8 常用、9–10 人名用)。用來擋掉 OpenCC 的錯對照:
//   • 來源字本身是常用漢字(年級 ≤ 8)→ 不折(例:OpenCC 把 著→着、核→覈、針→鍼,日文裡這些是不同的字)
//   • 目標字不是常用/人名用漢字 → 不折(例:參→蔘 是錯的,參 應對 参)
export function buildCharFold(grades) {
  const conv = OpenCC.Converter({ from: 'tw', to: 'jp' });
  const map = new Map();
  for (const [a, b] of RANGES) {
    for (let cp = a; cp <= b; cp++) {
      const c = String.fromCodePoint(cp);
      const d = conv(c);
      if (d === c || [...d].length !== 1) continue;
      if ((grades.get(c) || 99) <= 8) continue;
      if (!grades.has(d)) continue;
      map.set(c, d);
    }
  }
  // 收斂成一步到位(a→b、b→c 時讓 a 直接→c),確保 fold(fold(x)) === fold(x)
  for (const [k, v] of map) {
    let x = v, guard = 0;
    while (map.has(x) && map.get(x) !== x && guard++ < 5) x = map.get(x);
    map.set(k, x);
  }
  return map;
}
