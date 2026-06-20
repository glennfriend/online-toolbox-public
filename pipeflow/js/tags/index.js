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

// 回傳命中的 tag 名稱。若沒命中任何結構格式 → 回 ['text'],代表「純文字」。
// (所以 JSON 不會再掛 text;「永遠都能用」的 mod 改用 appliesTo:'*',不靠 text。)
export function detectTags(text) {
  const matched = [];
  for (const tag of TAGS) {
    try { if (tag.match(text)) matched.push(tag.name); } catch { /* 某 tag 判斷出錯就跳過 */ }
  }
  return matched.length ? matched : ['text'];
}

// 某個 tag 名稱的「真正意思」(給滑鼠提示用)。'text' 是合成出來的,單獨說明。
export function tagDesc(name) {
  if (name === 'text') return '純文字:沒有命中任何結構格式';
  const tag = TAGS.find((t) => t.name === name);
  return tag && tag.desc ? tag.desc : name;
}
