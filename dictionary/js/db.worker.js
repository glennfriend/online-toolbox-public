// db.worker.js — OPFS SQLite 查詢層(跑在 module worker;SAHPool VFS 需要 worker 限定的同步存取)。
//
// 職責:首次把部署的 .db.gz 下載→解壓→匯入 OPFS(持久);之後比對版本,相同就直接用本機那份(免下載)。
// 主執行緒只透過 postMessage 下指令(init / suggest / lookup / clear),這裡回結果。

import sqlite3InitModule from '../vendor/sqlite-wasm/index.mjs';

const DBNAME = '/dictionary.db';
let sqlite3 = null, pool = null, DB = null;

async function ensureEngine() {
  if (!sqlite3) sqlite3 = await sqlite3InitModule();
  if (!pool) pool = await sqlite3.installOpfsSAHPoolVfs({ name: 'dictionary' });
}

// 確保 OPFS 裡是「指定版本」的 DB:本機版本相同就用;否則下載 gz、解壓、匯入。
async function init({ dbUrl, version }) {
  await ensureEngine();

  // 試開本機既有的;版本相同就直接用(免下載)
  try {
    const probe = new pool.OpfsSAHPoolDb(DBNAME);
    const v = probe.selectValue("SELECT value FROM meta WHERE key='version'");
    if (v === version) { DB = probe; return done(false); }
    probe.close();
  } catch (_) { /* 不存在 / 壞掉 / 無 meta → 視為要重新匯入 */ }

  // 下載 → 解壓(gzip)→ 匯入 OPFS
  const resp = await fetch(dbUrl);
  if (!resp.ok) throw new Error('下載字典失敗(HTTP ' + resp.status + ')');
  const buf = await new Response(resp.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  pool.importDb(DBNAME, new Uint8Array(buf));
  DB = new pool.OpfsSAHPoolDb(DBNAME);
  return done(true);

  function done(downloaded) {
    const v = DB.selectValue("SELECT value FROM meta WHERE key='version'");
    let counts = {}; try { counts = JSON.parse(DB.selectValue("SELECT value FROM meta WHERE key='counts'") || '{}'); } catch (_) {}
    return { version: v, downloaded, counts };
  }
}

// 前綴自動完成(走 wordlc 索引,依詞頻排序)
function suggest({ prefix, limit }) {
  const p = (prefix || '').toLowerCase().replace(/[%_\\]/g, '');
  if (!p) return { words: [] };
  const rows = DB.selectObjects(
    'SELECT word FROM words WHERE wordlc LIKE ? ORDER BY freq DESC, wordlc ASC LIMIT ?',
    [p + '%', limit || 10]
  );
  return { words: rows.map((r) => r.word) };
}

// 查一個單字 → 發音 / 詞頻 / 各詞性的釋義與例句
function lookup({ word }) {
  const w = (word || '').trim();
  if (!w) return { entry: null };
  const head = DB.selectObject(
    'SELECT word, ipa, freq FROM words WHERE wordlc = ? ORDER BY freq DESC LIMIT 1',
    [w.toLowerCase()]
  );
  if (!head) return { entry: null };
  const meanings = DB.selectObjects(
    'SELECT pos, definition, example FROM meanings WHERE word = ? ORDER BY ord',
    [head.word]
  );
  return { entry: { ...head, meanings } };
}

async function clear() {
  if (DB) { try { DB.close(); } catch (_) {} DB = null; }
  await ensureEngine();
  await pool.wipeFiles();
  return { cleared: true };
}

const HANDLERS = { init, suggest, lookup, clear };

self.onmessage = async (e) => {
  const { id, cmd, ...args } = e.data;
  try {
    const res = await HANDLERS[cmd](args);
    self.postMessage({ id, ok: true, ...res });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err && err.message || err) });
  }
};
