// build.mjs — 把 raw/ 建成一個 SQLite 字典檔 + manifest + 報告。
//
// 真相來源 = 這支腳本的產物(部署的 .db)。瀏覽器 OPFS 只是唯讀快取。
// 跑法:  node dictionary/build/build.mjs
// 產物:  dictionary/data/dictionary-<版本>.db.gz / manifest.json / build-report.md
//
// 結構:每個來源一個解析器在 sources/(可插拔)。要加新「角度」=多一張表 + 多讀一個來源,不動既有。

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { loadFrequency } from './sources/frequency.mjs';
import { loadPronunciations } from './sources/cmudict.mjs';
import { loadWordset } from './sources/wordset.mjs';
import { loadEcdict } from './sources/ecdict.mjs';
import { createRequire } from 'node:module';
const OpenCC = createRequire(import.meta.url)('opencc-js');   // CJS,只在 build 用

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');   // dictionary/
const RAW = path.join(ROOT, 'raw');
const DATA = path.join(ROOT, 'data');

const log = (...a) => console.log(...a);
const warnings = [];
const warn = (m) => { warnings.push(m); console.warn('⚠', m); };

// ── 讀來源 ───────────────────────────────────────────────
log('讀 詞頻(Norvig)…');
const freq = loadFrequency(path.join(RAW, 'frequency-norvig', 'count_1w.txt'));
log('  詞頻詞數:', freq.size);

log('讀 發音(CMUdict)…');
const ipa = loadPronunciations(path.join(RAW, 'cmudict', 'cmudict.dict'));
log('  發音詞數:', ipa.size);

log('讀 英漢釋義(ECDICT)…');
const ecdict = loadEcdict(path.join(RAW, 'ecdict', 'ecdict.csv'));
log('  ECDICT 詞數:', ecdict.size);
const toTrad = OpenCC.Converter({ from: 'cn', to: 'twp' });   // 簡體 → 台灣繁體(詞組級,非逐字)

// ── 建 DB ────────────────────────────────────────────────
fs.mkdirSync(DATA, { recursive: true });
const tmpPath = path.join(DATA, '_build.tmp.db');
if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
const db = new DatabaseSync(tmpPath);

db.exec(`
  PRAGMA journal_mode = OFF;
  PRAGMA synchronous = OFF;
  CREATE TABLE meta     (key TEXT PRIMARY KEY, value TEXT);
  CREATE TABLE words    (word TEXT PRIMARY KEY, wordlc TEXT NOT NULL, freq INTEGER NOT NULL DEFAULT 0, ipa TEXT, cn TEXT, tag TEXT, source TEXT);
  CREATE TABLE meanings (word TEXT NOT NULL, ord INTEGER NOT NULL, pos TEXT, definition TEXT NOT NULL, example TEXT, source TEXT);
`);

const insWord = db.prepare('INSERT OR IGNORE INTO words(word,wordlc,freq,ipa,cn,tag,source) VALUES(?,?,?,?,?,?,?)');
const insMean = db.prepare('INSERT INTO meanings(word,ord,pos,definition,example,source) VALUES(?,?,?,?,?,?)');

log('讀 定義(Wordset)並寫入 DB…');
let nWords = 0, nMeanings = 0, nWithIpa = 0, nWithCn = 0;
db.exec('BEGIN');
for (const { word, meanings } of loadWordset(path.join(RAW, 'wordset', 'data'))) {
  const key = word.toLowerCase();
  const wIpa = ipa.get(key) || null;
  if (wIpa) nWithIpa++;
  const ecd = ecdict.get(key);
  const cn = ecd ? toTrad(ecd.cn) : null;      // 簡→繁(只在有釋義時,沒有就不寫)
  const tag = (ecd && ecd.tag) ? ecd.tag : null;
  if (cn) nWithCn++;
  insWord.run(word, key, freq.get(key) || 0, wIpa, cn, tag, 'wordset');
  meanings.forEach((m, i) => insMean.run(word, i, m.pos, m.def, m.example || null, 'wordset'));
  nWords++; nMeanings += meanings.length;
}
db.exec('COMMIT');
log(`  單字:${nWords}  釋義:${nMeanings}  有發音:${nWithIpa}  有繁中:${nWithCn}`);

if (nWords < 1000) warn(`單字數異常偏低(${nWords}),請檢查 wordset 來源`);
if (nWithIpa === 0) warn('沒有任何單字對到發音,請檢查 cmudict 來源');
if (nWithCn === 0) warn('沒有任何單字對到繁中釋義,請檢查 ecdict 來源 / OpenCC');

// 索引:wordlc 供前綴自動完成(LIKE 'abc%' 走索引);meanings 依 word 查
db.exec('CREATE INDEX idx_words_lc ON words(wordlc)');
db.exec('CREATE INDEX idx_meanings_word ON meanings(word)');

// ── 版本章 + meta ────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);            // build 腳本可用 Date(非 workflow)
// schema 版號:改 build 結構/欄位時手動 +1,確保版本一定變、使用者會重抓
const SCHEMA = 'v2';
const hash = crypto.createHash('sha1').update(`${SCHEMA}:${nWords}:${nMeanings}:${nWithIpa}:${nWithCn}:${freq.size}:${ipa.size}`).digest('hex').slice(0, 7);
const version = `${today}-${hash}`;
const builtAt = new Date().toISOString();
const setMeta = db.prepare('INSERT OR REPLACE INTO meta(key,value) VALUES(?,?)');
setMeta.run('version', version);
setMeta.run('built_at', builtAt);
setMeta.run('sources', 'wordset, cmudict, frequency-norvig, ecdict(opencc s2twp)');
setMeta.run('counts', JSON.stringify({ words: nWords, meanings: nMeanings, withIpa: nWithIpa, withCn: nWithCn }));

db.exec('VACUUM');
db.close();

// ── 壓縮 + 清舊 + manifest ───────────────────────────────
const dbBytes = fs.readFileSync(tmpPath);
const gz = zlib.gzipSync(dbBytes, { level: 9 });
// 清掉舊版產物
for (const f of fs.readdirSync(DATA)) {
  if (/^dictionary-.*\.db\.gz$/.test(f)) fs.unlinkSync(path.join(DATA, f));
}
const gzName = `dictionary-${version}.db.gz`;
fs.writeFileSync(path.join(DATA, gzName), gz);
fs.unlinkSync(tmpPath);

const manifest = {
  version,
  db: gzName,
  built_at: builtAt,
  db_bytes: dbBytes.length,
  gz_bytes: gz.length,
  sources: ['wordset', 'cmudict', 'frequency-norvig', 'ecdict'],
  counts: { words: nWords, meanings: nMeanings, withIpa: nWithIpa, withCn: nWithCn },
};
fs.writeFileSync(path.join(DATA, 'manifest.json'), JSON.stringify(manifest, null, 2));

const report = `# build-report

- 版本:\`${version}\`
- 建置時間:${builtAt}
- 來源:wordset(定義/詞性/例句)、cmudict(發音)、frequency-norvig(詞頻排序)、ecdict(繁中釋義,OpenCC s2twp 簡轉繁)

## 筆數
| 表 | 筆數 |
|---|---|
| words | ${nWords} |
| meanings | ${nMeanings} |
| 有發音(IPA)的單字 | ${nWithIpa} |
| 有繁中釋義的單字 | ${nWithCn}(${(nWithCn / nWords * 100).toFixed(1)}%) |

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
log('  產物:dictionary/data/', gzName, '+ manifest.json + build-report.md');
