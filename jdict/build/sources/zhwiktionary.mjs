// zhwiktionary.mjs — 解析中文維基詞典的日語詞條(kaikki.org wiktextract 抽取;CC BY-SA)。
//
// 只收「有詞性結構」的條目(名詞/動詞/形容詞…):
//   • pos=unknown 且沒有詞性標題的約 7.4 萬條,是機器人大量匯入的無結構資料
//     (釋義裡直接塞整段字典原文「寝転ぶ【ねころぶ】\n自五 横躺…」、例句有錯字),整批不收。
//   • soft-redirect / romanization / character(單字頁)/ name(人名地名)/ syllable 等也不收。
// 讀音:從 canonical 寫法的 ruby 組出來(漢字逐字標音);純假名詞讀音就是自己。
// 簡繁混用 → 釋義與例句翻譯用 OpenCC cn→tw(逐字+詞組,不做台灣慣用語替換)統一成繁體。

import fs from 'node:fs';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
const OpenCC = createRequire(import.meta.url)('opencc-js');

const KEEP_POS = new Set(['noun', 'verb', 'adj', 'adj_noun', 'adv', 'intj', 'phrase', 'proverb', 'suffix', 'prefix',
  'affix', 'particle', 'pron', 'conj', 'num', 'classifier', 'counter', 'adnominal', 'abbrev', 'contraction', 'postp']);

// canonical 寫法 + ruby → 讀音(ruby 依序對到寫法裡的漢字段;其他字原樣)
function rubyReading(form, ruby) {
  let out = '', i = 0;
  for (const [base, rd] of ruby) {
    const at = form.indexOf(base, i);
    if (at < 0) return null;
    out += form.slice(i, at) + rd;
    i = at + base.length;
  }
  return out + form.slice(i);
}

const RE_JUNK = /[\n【】]|==/;   // 混入的字典原文/維基標記 → 該釋義不收
const RE_KANA = /[぀-ヿ]/;

export function loadZhWiktionary(file) {
  const toTw = OpenCC.Converter({ from: 'cn', to: 'tw' });
  const lines = zlib.gunzipSync(fs.readFileSync(file)).toString('utf8').split('\n');
  const words = [];
  const stat = { lines: 0, kept: 0, skippedPos: 0, noSense: 0, junkGloss: 0 };
  for (const line of lines) {
    if (!line) continue;
    stat.lines++;
    const o = JSON.parse(line);
    if (o.lang_code !== 'ja') continue;
    if (!KEEP_POS.has(o.pos)) { stat.skippedPos++; continue; }

    const readings = new Set();
    for (const f of o.forms || []) {
      if ((f.tags || []).includes('canonical') && f.ruby && f.form) {
        let r = rubyReading(f.form, f.ruby);
        // 動詞條目的 canonical 常是「勉強する」:去掉詞頭以外的尾巴,讀音也去掉同一段
        const tail = f.form.startsWith(o.word) ? f.form.slice(o.word.length) : null;
        if (r && tail) r = r.endsWith(tail) ? r.slice(0, -tail.length) : null;
        if (r) readings.add(r);
      }
    }

    const senses = [];
    for (const s of o.senses || []) {
      if (s.form_of || s.alt_of) continue;                       // 「…的另一種寫法」不是釋義
      const gl = (s.glosses || []).at(-1);                        // 子義項取最細的那層
      if (!gl) continue;
      if (RE_JUNK.test(gl)) { stat.junkGloss++; continue; }
      const ex = (s.examples || [])
        // 例句要真的是日文(含假名);有些條目把中文說明寫在例句欄
        .filter((e) => e.text && e.translation && RE_KANA.test(e.text) && !RE_JUNK.test(e.text) && !RE_JUNK.test(e.translation))
        .slice(0, 2)
        .map((e) => [e.text, toTw(e.translation)]);
      senses.push({
        g: toTw(gl.replace(/[。.]$/, '')),
        tags: (s.tags || []).filter((t) => t !== 'no-gloss'),
        raw: (s.raw_tags || []).map(toTw),
        ex,
      });
    }
    if (!senses.length) { stat.noSense++; continue; }
    stat.kept++;
    words.push({ w: o.word, pos: o.pos, readings: [...readings], senses });
  }
  return { words, stat };
}
