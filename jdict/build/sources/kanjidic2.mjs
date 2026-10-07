// kanjidic2.mjs — 解析 EDRDG 官方 kanjidic2.xml.gz(漢字:音訓讀、英文字義、筆畫、年級、舊 JLPT 級、新聞頻率)。
// 一樣是逐個 <character> 區塊用正規表示式取值(格式規律)。

import fs from 'node:fs';
import zlib from 'node:zlib';

const one = (b, re) => { const m = re.exec(b); return m ? m[1] : null; };
const many = (b, re) => [...b.matchAll(re)].map((m) => m[1]);

export function loadKanjidic(file) {
  const xml = zlib.gunzipSync(fs.readFileSync(file)).toString('utf8');
  const version = one(xml, /<database_version>([^<]+)</) || null;
  const created = one(xml, /<date_of_creation>([^<]+)</) || null;
  const chars = [];
  for (const blk of xml.split('<character>').slice(1)) {
    const c = one(blk, /<literal>([^<]+)<\/literal>/);
    chars.push({
      c,
      grade: +(one(blk, /<grade>(\d+)<\/grade>/) || 0) || null,
      strokes: +(one(blk, /<stroke_count>(\d+)<\/stroke_count>/) || 0) || null,   // 第一個 = 正確筆畫數
      freq: +(one(blk, /<freq>(\d+)<\/freq>/) || 0) || null,
      jlpt: +(one(blk, /<jlpt>(\d+)<\/jlpt>/) || 0) || null,                  // 舊制 1–4 級
      on: many(blk, /<reading r_type="ja_on">([^<]+)<\/reading>/g),
      kun: many(blk, /<reading r_type="ja_kun">([^<]+)<\/reading>/g),
      nanori: many(blk, /<nanori>([^<]+)<\/nanori>/g),
      meaning: many(blk, /<meaning>([^<]+)<\/meaning>/g),                       // 無 m_lang = 英文
    });
  }
  return { version, created, chars };
}
