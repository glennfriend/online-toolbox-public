// normalize.js — 搜尋鍵正規化。前端(worker 查詢)與 build(建索引)共用這一支,
// 兩邊的鍵一定一致;改這裡就要重新 build(build.mjs 的 SCHEMA +1)。
//
// 鍵 = NFKC(半形片假名→全形、全形英數→半形)→ 小寫 → 片假名→平假名 → 字形折疊(繁體/舊字體→新字體)。
// 純函式、不碰 DOM,Node 與瀏覽器都能 import。

// 片假名 ァ(30A1)–ヶ(30F6) → 平假名 ぁ(3041)–ゖ(3096);ヽヾ → ゝゞ。長音 ー 保留。
export function toHiragana(s) {
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (c >= 0x30A1 && c <= 0x30F6) out += String.fromCodePoint(c - 0x60);
    else if (c === 0x30FD || c === 0x30FE) out += String.fromCodePoint(c - 0x60);
    else out += ch;
  }
  return out;
}

// fold:Map(字→新字體),來自 DB 的 fold 表(build 由 sources/charfold.mjs 產生)
export function makeKey(s, fold) {
  let k = toHiragana(String(s || '').normalize('NFKC').toLowerCase().trim());
  if (fold && fold.size) {
    let o = '';
    for (const ch of k) o += fold.get(ch) || ch;
    k = o;
  }
  return k;
}

const RE_KANA = /[぀-ヿ]/;
const RE_KANJI = /[㐀-䶿一-鿿豈-﫿々〆ヶ]/;
export const hasJapanese = (s) => RE_KANA.test(s) || RE_KANJI.test(s);
export const hasKanji = (s) => RE_KANJI.test(s);
// 羅馬字/英文:只有拉丁字母、空白、連字號、撇號(全形英數先經 NFKC 變半形)
export const isLatin = (s) => /^[a-z' -]+$/i.test(String(s).normalize('NFKC').trim());
