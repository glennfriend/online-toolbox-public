// tags/index.js — tag 登記表 + 偵測 + 命中規則小工具。
//
// 每個 tag 自帶一個 match(text)->bool。多數 tag 是「多條 regex 任一中就算」(matchAny),
// 少數需要「幾條同時中」才算(matchAll)。不求極精確,只求不易誤判。
// 偵測跑在「已上限的輸入」(≤2MB)上,所以可以直接掃,不會慢。

const TAGS = [];
export function defineTag(tag) { TAGS.push(tag); }

// 任一條 regex 中 → 命中(大部分情況,如 url)
export function matchAny(regexes) { return (s) => regexes.some((re) => re.test(s)); }
// 全部 regex 都中 → 才命中(較嚴謹的結構/語意)
export function matchAll(regexes) { return (s) => regexes.every((re) => re.test(s)); }

// 回傳命中的 tag 名稱;'text' 為基底,永遠都在(讓「對任何文字都能用」的 mod 一直出現)
export function detectTags(text) {
  const found = ['text'];
  for (const tag of TAGS) {
    try { if (tag.match(text)) found.push(tag.name); } catch { /* 某 tag 判斷出錯就跳過 */ }
  }
  return found;
}
