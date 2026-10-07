// db.worker.js — OPFS SQLite 查詢層(跑在 module worker;SAHPool VFS 需要 worker 限定的同步存取)。
//
// 職責:首次把部署的 .db.gz 下載→解壓→匯入 OPFS(持久);之後比對版本,相同就直接用本機那份(免下載)。
// 查詢:suggest(自動完成)/ lookup(查詞:精確 → 活用還原 → 英文反查 → 整句切詞)/ clear。
// 主執行緒只透過 postMessage 下指令,這裡回結果。

import sqlite3InitModule from '../vendor/sqlite-wasm/index.mjs';
import * as wanakana from '../vendor/wanakana/wanakana.js';
import { makeKey, hasJapanese, isLatin } from './normalize.js';
import { deinflect, posMatches } from './deinflect.js';

const DBNAME = '/jdict.db';
let sqlite3 = null, pool = null, DB = null;
let FOLD = new Map();            // 字形折疊表(繁體/舊字體 → 新字體),開庫時載入
const SENSE_MAX = 64;            // 與 build.mjs 一致:gloss_fts rowid = id*64 + 義項序

async function ensureEngine() {
  if (!sqlite3) sqlite3 = await sqlite3InitModule();
  if (!pool) pool = await sqlite3.installOpfsSAHPoolVfs({ name: 'jdict' });
}

function opened(downloaded) {
  FOLD = new Map(DB.selectArrays('SELECT src, dst FROM fold'));
  const v = DB.selectValue("SELECT value FROM meta WHERE key='version'");
  let counts = {}; try { counts = JSON.parse(DB.selectValue("SELECT value FROM meta WHERE key='counts'") || '{}'); } catch (_) {}
  let entities = {}; try { entities = JSON.parse(DB.selectValue("SELECT value FROM meta WHERE key='entities'") || '{}'); } catch (_) {}
  return { version: v, downloaded, counts, entities };
}

// 確保 OPFS 裡是「指定版本」的 DB:本機版本相同就用;否則下載 gz、解壓、匯入。
async function init({ dbUrl, version }) {
  await ensureEngine();
  try {
    const probe = new pool.OpfsSAHPoolDb(DBNAME);
    const v = probe.selectValue("SELECT value FROM meta WHERE key='version'");
    if (v === version) { DB = probe; return opened(false); }
    probe.close();
  } catch (_) { /* 不存在 / 壞掉 / 無 meta → 重新匯入 */ }

  const resp = await fetch(dbUrl);
  if (!resp.ok) throw new Error('下載字典失敗(HTTP ' + resp.status + ')');
  const buf = await new Response(resp.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  pool.importDb(DBNAME, new Uint8Array(buf));
  DB = new pool.OpfsSAHPoolDb(DBNAME);
  return opened(true);
}

// 離線退路:不比對版本,直接開 OPFS 既有的那份;沒有就丟錯。
async function openLocal() {
  await ensureEngine();
  const probe = new pool.OpfsSAHPoolDb(DBNAME);
  try {
    if (!probe.selectValue("SELECT value FROM meta WHERE key='version'")) throw new Error('no meta');
    DB = probe;
    return opened(false);
  } catch (_) {
    try { probe.close(); } catch (_) {}
    throw new Error('本機沒有既有的字典資料');
  }
}

// ── 小工具 ──
const key = (s) => makeKey(s, FOLD);
// 羅馬字 → 平假名(只在整串都轉得乾淨時才算)
function romajiKey(q) {
  if (!isLatin(q)) return null;
  const h = wanakana.toHiragana(q.normalize('NFKC').toLowerCase().replace(/\s+/g, ''));
  return /^[぀-ゟー]+$/.test(h) ? h : null;
}
// 自動完成用:打到一半的羅馬字(gak → がk)去掉尾巴沒轉完的子音,拿前面的假名當前綴
function romajiPrefix(q) {
  if (!isLatin(q)) return null;
  const h = wanakana.toHiragana(q.normalize('NFKC').toLowerCase().replace(/\s+/g, '')).replace(/[a-z']+$/, '');
  return /^[぀-ゟー]+$/.test(h) ? h : null;
}
const prefixEnd = (k) => k + '￿';

function idsByKey(k, limit = 50) {
  return DB.selectArrays('SELECT id FROM keys WHERE key = ? ORDER BY rank LIMIT ?', [k, limit]).map((r) => r[0]);
}
function hasKey(k) {
  return !!DB.selectValue('SELECT 1 FROM keys WHERE key = ? LIMIT 1', [k]);
}
// 活用還原:候選原形 → 查詞條 → 用 JMdict 詞性驗證(驗不過的丟掉)
function deinflected(q) {
  const out = [];
  const seen = new Set();
  for (const c of deinflect(key(q))) {
    const rows = DB.selectArrays(
      'SELECT e.id, e.pos FROM keys k JOIN entries e ON e.id = k.id WHERE k.key = ? ORDER BY k.rank LIMIT 20', [c.word]);
    for (const [id, pos] of rows) {
      if (seen.has(id)) continue;
      if (!posMatches(c.type, new Set(pos.split(' ')))) continue;
      seen.add(id);
      out.push({ id, base: c.word, reasons: c.reasons });
    }
  }
  return out;
}

function brief(data, zh) {
  if (zh && zh.length) return zh[0].senses[0].g;
  const s = data.s[0];
  return s ? s.g.map((g) => (Array.isArray(g) ? g[0] : g)).join('; ') : '';
}

// 載入完整詞條(含中文、音調)
function loadEntries(ids) {
  return ids.map((id) => {
    const row = DB.selectObject('SELECT id, rank, head, kana, data FROM entries WHERE id = ?', [id]);
    if (!row) return null;
    const zhRaw = DB.selectValue('SELECT data FROM zh WHERE id = ?', [id]);
    const pitch = DB.selectObjects('SELECT r, k, a FROM pitch WHERE id = ?', [id]).map((p) => ({ r: p.r, k: p.k, a: JSON.parse(p.a) }));
    return { id, rank: row.rank, head: row.head, kana: row.kana, data: JSON.parse(row.data), zh: zhRaw ? JSON.parse(zhRaw) : null, pitch };
  }).filter(Boolean);
}

// ── 自動完成 ──
// 日文/繁體漢字 → 鍵前綴;羅馬字 → 轉假名後的鍵前綴 + 英文釋義前綴(標「英」)
function suggest({ prefix, limit }) {
  const q = (prefix || '').trim();
  if (!q) return { items: [] };
  const lim = limit || 10;
  const keysToTry = [];
  if (hasJapanese(q)) keysToTry.push(key(q));
  const rk = romajiKey(q);
  const rp = rk || romajiPrefix(q);
  if (rp) keysToTry.push(rp);

  const items = [];
  const seen = new Set();
  for (const k of keysToTry) {
    const rows = DB.selectObjects(
      `SELECT e.id, e.head, e.kana, e.data, z.data AS zh, min(k.rank) AS r, min(length(k.key)) AS l
         FROM keys k JOIN entries e ON e.id = k.id LEFT JOIN zh z ON z.id = e.id
        WHERE k.key >= ? AND k.key < ?
        GROUP BY e.id ORDER BY (min(k.key) = ?) DESC, r, l LIMIT ?`,
      [k, prefixEnd(k), k, lim]);
    for (const r of rows) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      items.push({ id: r.id, head: r.head, kana: r.kana, brief: brief(JSON.parse(r.data), r.zh ? JSON.parse(r.zh) : null), via: 'ja' });
    }
  }
  // 拉丁字母輸入可能是羅馬字也可能是英文:
  //   羅馬字整串轉得乾淨(taberu)→ 日文在前、英文補後面;轉不乾淨(water → わてr)→ 兩邊各半
  //   日文先佔一部分(羅馬字整串轉得乾淨時多一點),英文接著放,還有空位再補回日文
  if (isLatin(q) && q.length >= 3) {
    const jaFirst = items.slice(0, rk ? 6 : 5);
    const jaIds = new Set(items.map((x) => x.id));
    const en = english(q, lim, true).filter((e) => !jaIds.has(e.id))
      .map((e) => ({ id: e.id, head: e.head, kana: e.kana, brief: brief(e.data, e.zh), via: 'en' }));
    return { items: [...jaFirst, ...en, ...items.slice(jaFirst.length)].slice(0, lim) };
  }
  return { items: items.slice(0, lim) };
}

// ── 英文反查(FTS5)──
// 先用 FTS 撈候選,再在 JS 依「釋義完全相同 > 開頭相同 > 包含」+ 義項順序 + 常用度重排
function english(q, limit, prefix = false) {
  const words = q.normalize('NFKC').toLowerCase().replace(/[^a-z0-9' -]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const match = words.map((w, i) => `"${w.replace(/"/g, '')}"` + (prefix && i === words.length - 1 ? '*' : '')).join(' ');
  let rows;
  try {
    // 候選放寬(常見字如 dog 會命中上千個義項;bm25 偏好短文,真正的「犬」不一定排在前面)
    rows = DB.selectArrays('SELECT rowid FROM gloss_fts WHERE gloss_fts MATCH ? LIMIT 4000', [match]);
  } catch (_) { return []; }
  const best = new Map();   // id → 最好的義項序
  for (const [rowid] of rows) {
    const id = Math.floor(rowid / SENSE_MAX), si = rowid % SENSE_MAX;
    if (!best.has(id) || si < best.get(id)) best.set(id, si);
  }
  const phrase = words.join(' ');
  const clean = (g) => {
    let s = (Array.isArray(g) ? g[0] : g).toLowerCase().replace(/^to /, '');
    while (/\([^()]*\)/.test(s)) s = s.replace(/\s*\([^()]*\)\s*/g, ' ');   // 巢狀括號:dog (Canis (lupus) familiaris)
    return s.replace(/\s+/g, ' ').trim();
  };
  // 常用度只分三級:JMdict 的 nfXX 只覆蓋部分常用詞(「本」是常用詞卻沒有 nf),細分反而誤導
  const tier = (rank) => (rank <= 50 ? 0 : rank <= 70 ? 20 : 50);
  // 先用輕量查詢打分(只讀 rank 與該義項釋義),最後只對前幾名載完整詞條
  const ids = [...best.keys()];
  const scored = [];
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    const rs = DB.selectArrays(`SELECT id, rank, head, data FROM entries WHERE id IN (${chunk.map(() => '?').join(',')})`, chunk);
    for (const [id, rank, head, data] of rs) {
      const si = best.get(id);
      const gl = (JSON.parse(data).s[si]?.g || []).map(clean);
      const at = gl.indexOf(phrase);
      const level = at >= 0 ? 0 : gl.some((g) => g.startsWith(phrase)) ? 1 : 2;
      // 同等級時:義項越前、詞越常用、命中的釋義越前、該義項釋義越少(越專指,
      // 如 食べる「to eat」勝過 喫する「to eat; to drink; to smoke…」)越前;
      // 片假名外來語(ブック、ハウス)稍微往後,讓本土詞(本、家)先出現
      const katakana = /^[゠-ヿー・]+$/.test(head) ? 25 : 0;
      scored.push({ id, score: level * 1000 + si * 40 + tier(rank) + Math.max(at, 0) * 15 + Math.min(gl.length, 4) * 8 + katakana });
    }
  }
  scored.sort((a, b) => a.score - b.score);
  return loadEntries(scored.slice(0, limit).map((s) => s.id));
}

// ── 整句切詞:從左往右,每個位置找「查得到(含活用還原)」的段,再往後看一段決定切哪裡 ──
// 只貪最長會切錯:「食べさせてもらいました」→ 食べさせても/らい/ました;
// 往後看一段:比較「這段 + 下一段最長」的長度平方和,取最大者 → 食べさせて/もらいました。
function segment(text) {
  const chars = [...text];
  const memo = new Map();
  // 位置 i 所有查得到的段(長的在前,最多 4 個)
  function matchesAt(i) {
    if (memo.has(i)) return memo.get(i);
    const out = [];
    if (i < chars.length && hasJapanese(chars[i])) {
      for (let L = Math.min(12, chars.length - i); L >= 1 && out.length < 4; L--) {
        if (!chars.slice(i, i + L).every(hasJapanese)) continue;
        const s = chars.slice(i, i + L).join('');
        if (hasKey(key(s))) { out.push({ L, text: s, base: s }); continue; }
        if (L >= 2) {
          const d = deinflected(s);
          if (d.length) out.push({ L, text: s, base: d[0].base, reasons: d[0].reasons });
        }
      }
    }
    memo.set(i, out);
    return out;
  }
  const segs = [];
  let i = 0;
  while (i < chars.length) {
    if (!hasJapanese(chars[i])) {   // 標點/空白/英數:原樣
      let j = i; while (j < chars.length && !hasJapanese(chars[j])) j++;
      segs.push({ text: chars.slice(i, j).join(''), plain: true });
      i = j; continue;
    }
    const cands = matchesAt(i);
    let found = null, bestScore = -1;
    for (const c of cands) {
      const next = matchesAt(i + c.L)[0];
      // 平方和:偏好「兩段都像樣」的切法(は/とても 勝過 はと/ても)
      const score = c.L * c.L + (next ? next.L * next.L : 0);
      if (score > bestScore) { bestScore = score; found = c; }   // 同分保留較長的(cands 已由長到短)
    }
    if (!found) found = { L: 1, text: chars[i], base: null };
    segs.push(found);
    i += found.L;
  }
  return segs;
}

// ── 查詢 ──
// 回傳 { groups:[{ kind, title, entries:[…] }], segments?, kanji:[…] }
function lookup({ query }) {
  const q = (query || '').trim();
  if (!q) return { groups: [] };
  const groups = [];
  const used = new Set();
  const take = (ids) => ids.filter((id) => !used.has(id) && used.add(id));

  const jpQ = hasJapanese(q) ? q : null;
  const rk = romajiKey(q);
  const qKeys = [jpQ && key(jpQ), rk].filter(Boolean);

  // 1) 精確
  const exact = take(qKeys.flatMap((k) => idsByKey(k)));
  if (exact.length) groups.push({ kind: 'exact', entries: loadEntries(exact) });

  // 2) 活用還原
  const src = jpQ || (rk ? rk : null);
  if (src) {
    const d = deinflected(src).filter((x) => !used.has(x.id));
    if (d.length) {
      const ents = loadEntries(take(d.map((x) => x.id)));
      for (const e of ents) { const x = d.find((y) => y.id === e.id); e.deinf = { from: q, base: x.base, reasons: x.reasons }; }
      groups.push({ kind: 'deinflect', entries: ents });
    }
  }

  // 3) 英文反查
  if (isLatin(q)) {
    const en = english(q, 30).filter((e) => !used.has(e.id) && used.add(e.id));
    if (en.length) groups.push({ kind: 'english', entries: en });
  }

  // 4) 整句:日文輸入、整串查不到 → 切詞,並列出第一個查得到的段
  let segments = null;
  if (jpQ && !groups.length && [...q].length >= 2) {
    segments = segment(q);
    const first = segments.find((s) => s.base);
    if (first) {
      const r = lookup({ query: first.text });
      groups.push(...r.groups);
    }
  }

  const top = groups[0]?.entries[0];
  return { groups, segments, kanji: top ? kanjiFor(top.id) : [] };
}

// 用 id 直接開某個詞條(點下拉建議時用,避免同音字跳到別的詞)
function entry({ id }) {
  return { groups: [{ kind: 'exact', entries: loadEntries([id]) }], kanji: kanjiFor(id) };
}

// 詞條代表寫法裡每個漢字的 KANJIDIC2 資訊
function kanjiFor(id) {
  const head = DB.selectValue('SELECT head FROM entries WHERE id = ?', [id]) || '';
  return [...new Set([...head].filter((c) => /[㐀-鿿豈-﫿々]/.test(c)))].map((c) => {
    const d = DB.selectValue('SELECT data FROM kanji WHERE c = ?', [c]);
    return d ? { c, ...JSON.parse(d) } : null;
  }).filter(Boolean);
}

async function clear() {
  if (DB) { try { DB.close(); } catch (_) {} DB = null; }
  await ensureEngine();
  await pool.wipeFiles();
  return { cleared: true };
}

const HANDLERS = { init, openLocal, suggest, lookup, entry, clear };

self.onmessage = async (e) => {
  const { id, cmd, ...args } = e.data;
  try {
    const res = await HANDLERS[cmd](args);
    self.postMessage({ id, ok: true, ...res });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err && err.message || err) });
  }
};
