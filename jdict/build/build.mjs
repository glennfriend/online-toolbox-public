// build.mjs — 把 raw/ 建成一個 SQLite 日文字典檔 + manifest + 報告。
//
// 真相來源 = 這支腳本的產物(部署的 .db)。瀏覽器 OPFS 只是唯讀快取。
// 跑法:  node jdict/build/build.mjs
// 產物:  jdict/data/jdict-<版本>.db.gz / manifest.json / build-report.md
//
// 結構:每個來源一個解析器在 sources/(可插拔),每個「角度」一張表:
//   entries(JMdict 主詞條)/ keys(搜尋鍵)/ gloss_fts(英文反查)/ zh(中文維基釋義)
//   / pitch(Kanjium 音調)/ kanji(KANJIDIC2)/ fold(繁體→新字體)/ meta
// 對不上、有歧義的資料一律不掛(不猜),數量寫進 build-report。

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { loadJmdict, priRank, isCommon } from './sources/jmdict.mjs';
import { loadKanjidic } from './sources/kanjidic2.mjs';
import { loadKanjium } from './sources/kanjium.mjs';
import { loadZhWiktionary } from './sources/zhwiktionary.mjs';
import { buildCharFold } from './sources/charfold.mjs';
import { makeKey, toHiragana } from '../js/normalize.js';

// schema 版號:改 build 結構/欄位/normalize.js 時手動 +1,確保版本一定變、使用者會重抓
const SCHEMA = 'v1';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');   // jdict/
const RAW = path.join(ROOT, 'raw');
const DATA = path.join(ROOT, 'data');
const SRC = {
  jmdict: path.join(RAW, 'jmdict', 'JMdict_e_examp.gz'),
  kanjidic: path.join(RAW, 'kanjidic2', 'kanjidic2.xml.gz'),
  kanjium: path.join(RAW, 'kanjium', 'accents.txt'),
  zhwikt: path.join(RAW, 'zhwiktionary', 'zhwiktionary-ja.jsonl.gz'),
};

const log = (...a) => console.log(...a);
const warnings = [];
const warn = (m) => { warnings.push(m); console.warn('⚠', m); };
const hira = (s) => toHiragana(s);

// ── 讀來源 ───────────────────────────────────────────────
log('讀 JMdict…');
const jm = loadJmdict(SRC.jmdict);
log('  詞條:', jm.entries.length, ' JMdict 日期:', jm.created);

log('讀 KANJIDIC2…');
const kd = loadKanjidic(SRC.kanjidic);
log('  漢字:', kd.chars.length);
const grades = new Map(kd.chars.filter((c) => c.grade).map((c) => [c.c, c.grade]));

log('建 字形折疊表(OpenCC tw→jp 逐字,KANJIDIC2 把關)…');
const fold = buildCharFold(grades);
log('  對照:', fold.size);

log('讀 Kanjium 音調…');
const kj = loadKanjium(SRC.kanjium);
log('  筆數:', kj.rows.length, ' 格式不認得而略過:', kj.bad);

log('讀 中文維基詞典(日語)…');
const zw = loadZhWiktionary(SRC.zhwikt);
log('  有結構的詞條:', zw.words.length);

// ── JMdict 索引(供各來源對接)─────────────────────────────
const byKanji = new Map();     // 寫法 → [entry]
const byReading = new Map();   // 讀音(平假名)→ [entry]
const push = (m, k, v) => { const a = m.get(k); if (a) { if (!a.includes(v)) a.push(v); } else m.set(k, [v]); };
for (const e of jm.entries) {
  for (const k of e.k) push(byKanji, k.t, e);
  for (const r of e.r) push(byReading, hira(r.t), e);
}
const readingsOf = (e) => new Set(e.r.map((r) => hira(r.t)));
// 「通常寫假名」:沒有漢字寫法 / 該讀音標 nokanji / 有義項標 uk
const kanaWord = (e, rh) => !e.k.length || e.r.some((r) => hira(r.t) === rh && r.nokanji) || e.s.some((s) => s.misc.includes('uk'));

// ── 中文釋義對接 ────────────────────────────────────────
const zhMap = new Map();       // entry id → [{pos, senses}]
const zhStat = { matched: 0, noMatch: 0, ambiguous: 0 };
for (const w of zw.words) {
  let cands;
  if (/[^぀-ヿー]/.test(w.w)) {
    cands = byKanji.get(w.w) || [];
    if (w.readings.length) {
      const want = new Set(w.readings.map(hira));
      cands = cands.filter((e) => [...readingsOf(e)].some((r) => want.has(r)));
    }
  } else {
    const rh = hira(w.w);
    cands = (byReading.get(rh) || []).filter((e) => kanaWord(e, rh));
  }
  if (!cands.length) { zhStat.noMatch++; continue; }
  if (cands.length > 1) { zhStat.ambiguous++; continue; }   // 對到多個詞條 → 分不清是哪個,不掛
  const id = cands[0].id;
  if (!zhMap.has(id)) zhMap.set(id, []);
  zhMap.get(id).push({ pos: w.pos, senses: w.senses });
  zhStat.matched++;
}
log(`  中文釋義:對上 ${zhStat.matched}、對不到 ${zhStat.noMatch}、有歧義不掛 ${zhStat.ambiguous};涵蓋詞條 ${zhMap.size}`);

// ── 音調對接 ────────────────────────────────────────────
const pitchRows = [];          // [id, 讀音, 寫法, 音調JSON]
const pStat = { matched: 0, noMatch: 0, ambiguous: 0 };
for (const row of kj.rows) {
  const rh = hira(row.r);
  let cands;
  if (row.kanaOnly) {
    cands = (byReading.get(rh) || []).filter((e) => kanaWord(e, rh));
    if (cands.length > 1) { pStat.ambiguous++; continue; }
  } else {
    cands = (byKanji.get(row.w) || []).filter((e) => readingsOf(e).has(rh));
  }
  if (!cands.length) { pStat.noMatch++; continue; }
  for (const e of cands) {
    const r = e.r.find((x) => hira(x.t) === rh).t;     // 存 JMdict 那邊的讀音寫法
    pitchRows.push([e.id, r, row.kanaOnly ? '' : row.w, JSON.stringify(row.acc)]);
  }
  pStat.matched++;
}
log(`  音調:對上 ${pStat.matched}、對不到 ${pStat.noMatch}、有歧義不掛 ${pStat.ambiguous}`);

// ── 建 DB ────────────────────────────────────────────────
fs.mkdirSync(DATA, { recursive: true });
const tmpPath = path.join(DATA, '_build.tmp.db');
if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
const db = new DatabaseSync(tmpPath);
db.exec(`
  PRAGMA journal_mode = OFF;
  PRAGMA synchronous = OFF;
  PRAGMA page_size = 4096;
  CREATE TABLE meta    (key TEXT PRIMARY KEY, value TEXT);
  CREATE TABLE entries (id INTEGER PRIMARY KEY, rank INTEGER NOT NULL, head TEXT NOT NULL, kana TEXT NOT NULL,
                        pos TEXT NOT NULL, data TEXT NOT NULL);
  CREATE TABLE keys    (key TEXT NOT NULL, id INTEGER NOT NULL, rank INTEGER NOT NULL, PRIMARY KEY (key, id)) WITHOUT ROWID;
  CREATE TABLE zh      (id INTEGER PRIMARY KEY, data TEXT NOT NULL);
  CREATE TABLE pitch   (id INTEGER NOT NULL, r TEXT NOT NULL, k TEXT NOT NULL, a TEXT NOT NULL, PRIMARY KEY (id, r, k)) WITHOUT ROWID;
  CREATE TABLE kanji   (c TEXT PRIMARY KEY, data TEXT NOT NULL) WITHOUT ROWID;
  CREATE TABLE fold    (src TEXT PRIMARY KEY, dst TEXT NOT NULL) WITHOUT ROWID;
  CREATE VIRTUAL TABLE gloss_fts USING fts5(text, content='', columnsize=0, detail=column);
`);

const IRREG = new Set(['iK', 'ik', 'io', 'oK', 'ok', 'rK', 'rk', 'sK', 'sk', 'ateji']);
const HIDE = new Set(['sK', 'sk']);   // 只供搜尋、不顯示
const SENSE_MAX = 64;                 // gloss_fts rowid = id*64 + 義項序

const insE = db.prepare('INSERT INTO entries(id,rank,head,kana,pos,data) VALUES(?,?,?,?,?,?)');
const insK = db.prepare('INSERT INTO keys(key,id,rank) VALUES(?,?,?) ON CONFLICT(key,id) DO UPDATE SET rank=min(rank,excluded.rank)');
const insF = db.prepare('INSERT INTO gloss_fts(rowid,text) VALUES(?,?)');
const insZ = db.prepare('INSERT INTO zh(id,data) VALUES(?,?)');

let nKeys = 0, nCommon = 0, nCommonZh = 0, nEx = 0, nFts = 0, nTooManySenses = 0;
const compact = (o) => { for (const k of Object.keys(o)) if (o[k] == null || (Array.isArray(o[k]) && !o[k].length)) delete o[k]; return o; };

db.exec('BEGIN');
for (const e of jm.entries) {
  const allPri = [...e.k.flatMap((k) => k.pri), ...e.r.flatMap((r) => r.pri)];
  const rank = priRank(allPri);
  if (isCommon(allPri)) { nCommon++; if (zhMap.has(e.id)) nCommonZh++; }

  const data = {
    k: e.k.map((k) => compact({ t: k.t, i: k.inf, c: isCommon(k.pri) ? 1 : null })),
    r: e.r.map((r) => compact({ t: r.t, i: r.inf, c: isCommon(r.pri) ? 1 : null, nk: r.nokanji ? 1 : null, rs: r.restr })),
    s: e.s.map((s) => {
      nEx += s.ex.length;
      return compact({
        p: s.pos, m: s.misc, f: s.field, d: s.dial, n: s.info, sk: s.stagk, sr: s.stagr, x: s.xref, a: s.ant, l: s.ls,
        g: s.gloss.map(([t, ty]) => (ty ? [t, ty] : t)),
        e: s.ex,
      });
    }),
  };

  const shownK = e.k.filter((k) => !k.inf.some((i) => HIDE.has(i)));
  const shownR = e.r.filter((r) => !r.inf.some((i) => HIDE.has(i)));
  const goodK = shownK.find((k) => !k.inf.some((i) => IRREG.has(i))) || shownK[0];
  const kana = (shownR[0] || e.r[0]).t;
  const head = goodK ? goodK.t : kana;

  const zh = zhMap.get(e.id);
  const pos = [...new Set(e.s.flatMap((s) => s.pos))].join(' ');

  insE.run(e.id, rank, head, kana, pos, JSON.stringify(data));
  if (zh) insZ.run(e.id, JSON.stringify(zh));

  for (const k of e.k) { insK.run(makeKey(k.t, fold), e.id, rank + (k.inf.some((i) => IRREG.has(i)) ? 300 : 0)); nKeys++; }
  for (const r of e.r) { insK.run(makeKey(r.t, fold), e.id, rank + (r.inf.some((i) => IRREG.has(i)) ? 300 : 0)); nKeys++; }

  e.s.forEach((s, i) => {
    if (i >= SENSE_MAX) { nTooManySenses++; return; }
    const text = s.gloss.map((g) => g[0]).join('; ');
    if (text) { insF.run(e.id * SENSE_MAX + i, text); nFts++; }
  });
}
db.exec('COMMIT');

db.exec('BEGIN');
const insP = db.prepare('INSERT OR IGNORE INTO pitch(id,r,k,a) VALUES(?,?,?,?)');
for (const p of pitchRows) insP.run(...p);
const insC = db.prepare('INSERT INTO kanji(c,data) VALUES(?,?)');
for (const c of kd.chars) {
  insC.run(c.c, JSON.stringify(compact({ g: c.grade, s: c.strokes, f: c.freq, j: c.jlpt, on: c.on, kun: c.kun, na: c.nanori, m: c.meaning })));
}
const insFold = db.prepare('INSERT INTO fold(src,dst) VALUES(?,?)');
for (const [a, b] of fold) insFold.run(a, b);
db.exec('COMMIT');
db.exec("INSERT INTO gloss_fts(gloss_fts) VALUES('optimize')");

const counts = {
  entries: jm.entries.length, common: nCommon, commonZh: nCommonZh, keys: nKeys, examples: nEx,
  zh: zhMap.size, pitch: pitchRows.length, kanji: kd.chars.length, fold: fold.size, fts: nFts,
};
log('  ', counts);
if (counts.entries < 150000) warn(`詞條數異常偏低(${counts.entries}),請檢查 JMdict 來源`);
if (counts.zh < 10000) warn(`中文釋義涵蓋偏低(${counts.zh}),請檢查中文維基詞典來源/對接`);
if (counts.pitch < 50000) warn(`音調筆數偏低(${counts.pitch}),請檢查 Kanjium 來源/對接`);
if (nTooManySenses) warn(`有 ${nTooManySenses} 個義項超過 ${SENSE_MAX} 個/詞條,未進英文反查索引`);

// ── 版本章 + meta ────────────────────────────────────────
// 版本 = 日期 + (schema + 原始檔 + build 腳本 + normalize.js)的雜湊
// → 原始資料、解析規則、搜尋鍵任一改變,版本必變,使用者下次上線會重抓
const h = crypto.createHash('sha1').update(SCHEMA);
for (const f of Object.values(SRC)) h.update(fs.readFileSync(f));
const BUILD = path.join(ROOT, 'build');
h.update(fs.readFileSync(path.join(BUILD, 'build.mjs')));
for (const f of fs.readdirSync(path.join(BUILD, 'sources')).sort()) h.update(fs.readFileSync(path.join(BUILD, 'sources', f)));
h.update(fs.readFileSync(path.join(ROOT, 'js', 'normalize.js')));
const today = new Date().toISOString().slice(0, 10);
const version = `${today}-${h.digest('hex').slice(0, 7)}`;
const builtAt = new Date().toISOString();
const SOURCES = 'JMdict(EDRDG)、KANJIDIC2(EDRDG)、Kanjium、中文維基詞典(kaikki.org)';
const setMeta = db.prepare('INSERT OR REPLACE INTO meta(key,value) VALUES(?,?)');
setMeta.run('version', version);
setMeta.run('built_at', builtAt);
setMeta.run('sources', SOURCES);
setMeta.run('counts', JSON.stringify(counts));
setMeta.run('entities', JSON.stringify(jm.entities));
setMeta.run('jmdict_created', jm.created || '');
setMeta.run('kanjidic_version', `${kd.version || ''} ${kd.created || ''}`.trim());

db.exec('VACUUM');
db.close();

// ── 壓縮 + 清舊 + manifest ───────────────────────────────
const dbBytes = fs.readFileSync(tmpPath);
const gz = zlib.gzipSync(dbBytes, { level: 9 });
for (const f of fs.readdirSync(DATA)) if (/^jdict-.*\.db\.gz$/.test(f)) fs.unlinkSync(path.join(DATA, f));
const gzName = `jdict-${version}.db.gz`;
fs.writeFileSync(path.join(DATA, gzName), gz);
fs.unlinkSync(tmpPath);

const manifest = { version, db: gzName, built_at: builtAt, db_bytes: dbBytes.length, gz_bytes: gz.length, counts };
fs.writeFileSync(path.join(DATA, 'manifest.json'), JSON.stringify(manifest, null, 2));

const pct = (a, b) => (a / b * 100).toFixed(1) + '%';
const report = `# build-report

- 版本:\`${version}\`
- 建置時間:${builtAt}
- 來源:${SOURCES}
- JMdict 日期:${jm.created};KANJIDIC2:${kd.version} / ${kd.created}

## 筆數
| 表 | 筆數 |
|---|---|
| entries(JMdict 詞條) | ${counts.entries} |
| 其中常用詞(news1/ichi1/spec/gai1) | ${counts.common} |
| keys(搜尋鍵:寫法+讀音) | ${counts.keys} |
| 精選例句(JMdict) | ${counts.examples} |
| zh(有繁中釋義的詞條) | ${counts.zh}(全部的 ${pct(counts.zh, counts.entries)};常用詞的 ${pct(counts.commonZh, counts.common)}) |
| pitch(音調列) | ${counts.pitch} |
| kanji(KANJIDIC2) | ${counts.kanji} |
| fold(繁體→新字體對照) | ${counts.fold} |
| gloss_fts(英文反查義項) | ${counts.fts} |

## 對接結果(對不上 / 有歧義的一律不掛,不猜)
| 來源 | 對上 | 對不到 | 有歧義不掛 |
|---|---|---|---|
| 中文維基詞典(${zw.words.length} 條有結構詞條) | ${zhStat.matched} | ${zhStat.noMatch} | ${zhStat.ambiguous} |
| Kanjium 音調(${kj.rows.length} 筆;格式不認得略過 ${kj.bad}) | ${pStat.matched} | ${pStat.noMatch} | ${pStat.ambiguous} |

中文維基詞典原始 ${zw.stat.lines} 條日語資料中:非詞性結構(機器人匯入/轉址/羅馬字/單字/人名…)略過 ${zw.stat.skippedPos}、
無可用釋義 ${zw.stat.noSense}、混入字典原文的釋義丟棄 ${zw.stat.junkGloss}。

## 檔案大小
- 未壓縮 DB:${(dbBytes.length / 1048576).toFixed(1)} MB
- gzip 後:${(gz.length / 1048576).toFixed(1)} MB(部署/下載的就是這個)

## 警告
${warnings.length ? warnings.map((w) => '- ⚠ ' + w).join('\n') : '- 無'}
`;
fs.writeFileSync(path.join(DATA, 'build-report.md'), report);

log('\n✅ 完成');
log('  版本:', version);
log('  DB:', (dbBytes.length / 1048576).toFixed(1), 'MB → gz', (gz.length / 1048576).toFixed(1), 'MB');
