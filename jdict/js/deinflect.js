// deinflect.js — 活用還原:把「食べなかった」還原成候選原形「食べる」(並記下經過哪些變化)。
//
// 自寫規則(不搬 10ten / Yomitan 的 GPL 程式碼)。做法:
//   1. 每條規則 = [活用後的字尾, 還原後的字尾, 適用的「詞類」, 還原後的「詞類」, 原因]
//   2. 從輸入字開始反覆套規則(可串接:食べさせられなかった → …ない → …られる → …させる → 食べる)
//   3. 產生的只是「候選」;真正採用前,由查詢端用 JMdict 詞性驗證(候選標 V1,詞條也得是 v1)
//      —— 這一步才是正確性的關鍵,規則寬一點沒關係,驗不過的候選會被丟掉。
// 純函式、不碰 DOM / DB,Node 測試腳本(build/test-deinflect.mjs)可直接 import。

// ── 詞類旗標 ──
export const T = {
  V1: 1,        // 一段動詞(食べる)
  V5: 2,        // 五段動詞(書く)
  V5KS: 4,      // 行く 類(行って/行った)
  VK: 8,        // 来る
  VS: 16,       // する(含 愛する 類)
  VSN: 32,      // 「名詞+する」的名詞部分(勉強)
  ADJI: 64,     // い形容詞(高い;也包含 ない/たい 這類活用像い形容詞的助動詞)
  STEM: 128,    // 連用形(ます形去掉ます:食べ / 書き)— 中間態,不對應詞條
  TE: 256,      // て形 — 中間態
  INIT: 512,    // 原始輸入(只有「詞尾」型規則能吃)
};
const V = T.V1 | T.V5 | T.V5KS | T.VK | T.VS;

// 詞類 ↔ JMdict 詞性 的驗證(查到詞條後用)
export function posMatches(type, posSet) {
  const has = (p) => posSet.has(p);
  const any = (pre) => [...posSet].some((p) => p.startsWith(pre));
  if ((type & T.V1) && (has('v1') || has('v1-s'))) return true;
  if ((type & T.V5) && any('v5')) return true;
  if ((type & T.V5KS) && has('v5k-s')) return true;
  if ((type & T.VK) && has('vk')) return true;
  if ((type & T.VS) && (has('vs-i') || has('vs-s'))) return true;
  if ((type & T.VSN) && (has('vs') || has('vs-c'))) return true;
  if ((type & T.ADJI) && (has('adj-i') || has('adj-ix'))) return true;
  return false;
}

// ── 規則 ──
const R = [];
const rule = (from, to, inT, outT, why) => R.push([from, to, inT, outT, why]);

// 五段各行:辭書形尾 / 未然(ない) / 連用(ます) / 假定・可能・命令(え段) / 意向(お段+う) / て形 / た形
const GODAN = [
  ['く', 'か', 'き', 'け', 'こう', 'いて', 'いた'],
  ['ぐ', 'が', 'ぎ', 'げ', 'ごう', 'いで', 'いだ'],
  ['す', 'さ', 'し', 'せ', 'そう', 'して', 'した'],
  ['つ', 'た', 'ち', 'て', 'とう', 'って', 'った'],
  ['ぬ', 'な', 'に', 'ね', 'のう', 'んで', 'んだ'],
  ['ぶ', 'ば', 'び', 'べ', 'ぼう', 'んで', 'んだ'],
  ['む', 'ま', 'み', 'め', 'もう', 'んで', 'んだ'],
  ['る', 'ら', 'り', 'れ', 'ろう', 'って', 'った'],
  ['う', 'わ', 'い', 'え', 'おう', 'って', 'った'],
];

// て形 / た形 系列(て・た・たら・たり)
const TE_FORMS = [
  // [て形, 辭書形尾, 詞類]
  ['て', 'る', T.V1 | T.VK],
  ['して', 'する', T.VS],
  ['きて', 'くる', T.VK],
  ['って', 'く', T.V5KS],
  ...GODAN.map((g) => [g[5], g[0], T.V5]),
];
for (const [te, base, outT] of TE_FORMS) {
  const ta = te.replace(/て$/, 'た').replace(/で$/, 'だ');
  rule(te, base, T.INIT | T.TE, outT, 'て形');
  rule(ta, base, T.INIT, outT, '過去');
  rule(ta + 'ら', base, T.INIT, outT, '假定(たら)');
  rule(ta + 'り', base, T.INIT, outT, '列舉(たり)');
}

// 五段
for (const [dict, a, i, e, o] of GODAN) {
  rule(a + 'ない', dict, T.ADJI, T.V5, '否定');
  rule(a + 'ず', dict, T.INIT, T.V5, '否定(ず)');
  rule(a + 'ずに', dict, T.INIT, T.V5, '否定(ずに)');
  rule(i, dict, T.STEM, T.V5, '連用形');
  rule(e + 'ば', dict, T.INIT, T.V5, '假定(ば)');
  rule(e + 'る', dict, T.V1, T.V5, '可能');
  rule(e, dict, T.INIT, T.V5, '命令');
  rule(o, dict, T.INIT, T.V5, '意向');
  rule(a + 'れる', dict, T.V1, T.V5, '被動');
  rule(a + 'せる', dict, T.V1, T.V5, '使役');
  if (dict !== 'す') rule(a + 'される', dict, T.V1, T.V5, '使役被動');
}

// 一段(輸出 V1|VK:来る 的漢字寫法「来」活用跟一段同形 → 交給詞性驗證分辨)
const V1K = T.V1 | T.VK;
rule('ない', 'る', T.ADJI, V1K, '否定');
rule('ず', 'る', T.INIT, V1K, '否定(ず)');
rule('ずに', 'る', T.INIT, V1K, '否定(ずに)');
rule('', 'る', T.STEM, V1K, '連用形');
rule('れば', 'る', T.INIT, V1K, '假定(ば)');
rule('られる', 'る', T.V1, V1K | T.V5, '可能/被動');   // V5:取られる → 取る(ら行被動)
rule('れる', 'る', T.V1, T.V1, '可能(ら抜き)');
rule('させる', 'る', T.V1, V1K, '使役');
rule('ろ', 'る', T.INIT, V1K, '命令');
rule('よ', 'る', T.INIT, T.V1, '命令(文語)');
rule('よう', 'る', T.INIT, V1K, '意向');

// する
rule('しない', 'する', T.ADJI, T.VS, '否定');
rule('せず', 'する', T.INIT, T.VS, '否定(ず)');
rule('せずに', 'する', T.INIT, T.VS, '否定(ずに)');
rule('し', 'する', T.STEM, T.VS, '連用形');
rule('すれば', 'する', T.INIT, T.VS, '假定(ば)');
rule('できる', 'する', T.V1, T.VS, '可能');
rule('される', 'する', T.V1, T.VS, '被動');
rule('させる', 'する', T.V1, T.VS, '使役');
rule('しろ', 'する', T.INIT, T.VS, '命令');
rule('せよ', 'する', T.INIT, T.VS, '命令(文語)');
rule('しよう', 'する', T.INIT, T.VS, '意向');
rule('する', '', T.VS, T.VSN, 'する動詞');
rule('できる', '', T.V1, T.VSN, '可能(できる)');   // 勉強できる → 勉強

// 来る(假名寫法)
rule('こない', 'くる', T.ADJI, T.VK, '否定');
rule('き', 'くる', T.STEM, T.VK, '連用形');
rule('くれば', 'くる', T.INIT, T.VK, '假定(ば)');
rule('こられる', 'くる', T.V1, T.VK, '可能/被動');
rule('こさせる', 'くる', T.V1, T.VK, '使役');
rule('こい', 'くる', T.INIT, T.VK, '命令');
rule('こよう', 'くる', T.INIT, T.VK, '意向');
rule('来い', '来る', T.INIT, T.VK, '命令');

// ます 系列 → 連用形
rule('ます', '', T.INIT, T.STEM, '丁寧');
rule('ました', '', T.INIT, T.STEM, '丁寧過去');
rule('ません', '', T.INIT, T.STEM, '丁寧否定');
rule('ませんでした', '', T.INIT, T.STEM, '丁寧過去否定');
rule('ましょう', '', T.INIT, T.STEM, '丁寧意向');
rule('まして', '', T.INIT, T.STEM, '丁寧て形');
rule('ませ', '', T.INIT, T.STEM, '丁寧命令');
// 接在連用形後面的
rule('たい', '', T.ADJI, T.STEM, '想要(たい)');
rule('たがる', '', T.V5, T.STEM, '想要(たがる)');
rule('ながら', '', T.INIT, T.STEM, '一邊(ながら)');
rule('なさい', '', T.INIT, T.STEM, '命令(なさい)');
rule('すぎる', '', T.V1, T.STEM, '過度(すぎる)');
rule('やすい', '', T.ADJI, T.STEM, '容易(やすい)');
rule('にくい', '', T.ADJI, T.STEM, '困難(にくい)');
rule('そう', '', T.INIT, T.STEM, '樣態(そう)');
rule('に', '', T.INIT, T.STEM, '目的(に)');

// て形後接(→ て形中間態)
rule('ている', 'て', T.V1, T.TE, '進行/狀態(ている)');
rule('でいる', 'で', T.V1, T.TE, '進行/狀態(ている)');
rule('てる', 'て', T.V1, T.TE, '進行/狀態(てる)');
rule('でる', 'で', T.V1, T.TE, '進行/狀態(てる)');
rule('てある', 'て', T.V5, T.TE, '狀態(てある)');
rule('ておく', 'て', T.V5, T.TE, '預先(ておく)');
rule('でおく', 'で', T.V5, T.TE, '預先(ておく)');
rule('とく', 'て', T.V5, T.TE, '預先(とく)');
rule('どく', 'で', T.V5, T.TE, '預先(とく)');
rule('てしまう', 'て', T.V5, T.TE, '完了(てしまう)');
rule('でしまう', 'で', T.V5, T.TE, '完了(てしまう)');
rule('ちゃう', 'て', T.V5, T.TE, '完了(ちゃう)');
rule('じゃう', 'で', T.V5, T.TE, '完了(じゃう)');
rule('てみる', 'て', T.V1, T.TE, '嘗試(てみる)');
rule('でみる', 'で', T.V1, T.TE, '嘗試(てみる)');
rule('ていく', 'て', T.V5KS, T.TE, '(ていく)');
rule('てくる', 'て', T.VK, T.TE, '(てくる)');
rule('てください', 'て', T.INIT, T.TE, '請求(てください)');
rule('でください', 'で', T.INIT, T.TE, '請求(てください)');
rule('ては', 'て', T.INIT, T.TE, '(ては)');
rule('ちゃ', 'て', T.INIT, T.TE, '(ちゃ)');
rule('じゃ', 'で', T.INIT, T.TE, '(じゃ)');
rule('ても', 'て', T.INIT, T.TE, '即使(ても)');
rule('でも', 'で', T.INIT, T.TE, '即使(ても)');

// い形容詞(也套用在 ない/たい 等)
rule('かった', 'い', T.INIT, T.ADJI, '過去');
rule('くない', 'い', T.ADJI, T.ADJI, '否定');
rule('くて', 'い', T.INIT | T.TE, T.ADJI, 'て形');
rule('く', 'い', T.INIT, T.ADJI, '副詞形');
rule('ければ', 'い', T.INIT, T.ADJI, '假定(ば)');
rule('かったら', 'い', T.INIT, T.ADJI, '假定(たら)');
rule('かったり', 'い', T.INIT, T.ADJI, '列舉(たり)');
rule('かろう', 'い', T.INIT, T.ADJI, '推量');
rule('さ', 'い', T.INIT, T.ADJI, '名詞化');
rule('そう', 'い', T.INIT, T.ADJI, '樣態(そう)');
rule('すぎる', 'い', T.V1, T.ADJI, '過度(すぎる)');
rule('くなる', 'い', T.V5, T.ADJI, '變得(くなる)');
rule('くありません', 'い', T.INIT, T.ADJI, '丁寧否定');
rule('ないで', 'ない', T.INIT, T.ADJI, '否定て形(ないで)');
rule('なきゃ', 'ない', T.INIT, T.ADJI, '必須(なきゃ)');
rule('なくちゃ', 'ない', T.INIT, T.ADJI, '必須(なくちゃ)');

// 依字尾長度排序(長的先試),同一字尾保留宣告順
R.sort((a, b) => b[0].length - a[0].length);
export const RULES = R;

// ── 主函式 ──
// 回傳候選陣列:[{ word, type, reasons:[…] }](不含輸入本身)
export function deinflect(input, { maxDepth = 6, max = 300 } = {}) {
  const out = [];
  const seen = new Map();           // word → 已出現過的 type 位元(避免重複)
  const queue = [{ word: input, type: 0x3FF, reasons: [] }];   // 輸入:什麼詞類都可能
  seen.set(input, 0x3FF);
  while (queue.length && out.length < max) {
    const cur = queue.shift();
    if (cur.reasons.length >= maxDepth) continue;
    for (const [from, to, inT, outT, why] of R) {
      if (!(cur.type & inT)) continue;
      if (!cur.word.endsWith(from)) continue;
      const stem = cur.word.slice(0, cur.word.length - from.length);
      const word = stem + to;
      if (!word || (to === '' && !stem)) continue;
      if (!stem && from !== '' && to !== '' && word.length < 2) continue;
      const prev = seen.get(word) || 0;
      if ((prev & outT) === outT) continue;
      seen.set(word, prev | outT);
      const cand = { word, type: outT, reasons: [why, ...cur.reasons] };
      // 中間態(連用形 / て形)不對應詞條,只繼續往下還原
      if (!(outT & ~(T.STEM | T.TE))) { queue.push(cand); continue; }
      out.push(cand);
      queue.push(cand);
    }
  }
  return out;
}
