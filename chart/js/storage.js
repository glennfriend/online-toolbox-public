// storage.js — 儲存庫:把輸入的資料存進 IndexedDB,可回填、刪除。
// (比照 scrapbook 的儲存,但只做純文字資料、不需要「暫存」。)
//
// item:{ id, title, payload, createdAt };payload 是原始輸入的文字。

import { openStore } from './lib/idb.js';

const store = openStore({ dbName: 'chart', storeName: 'items' });

// 取全部,依建立時間新 → 舊
export async function loadItems() {
  const items = await store.getAll();
  return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function addItem(payload) {
  const item = { id: newId(), title: deriveTitle(payload), payload, createdAt: new Date().toISOString() };
  await store.put(item);
  return item;
}

export async function removeItem(id) {
  await store.delete(id);
}

// 取一個好讀的標題:跳過只有括號/符號的行(例如 JSON 第一行的 "["),
// 取第一行有實際內容的,再清掉括號/引號/分隔符讓它乾淨。對四種格式都適用。
function deriveTitle(text) {
  const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
  const meaningful = lines.find((l) => l.replace(/[[\]{}|:,\-\s"']/g, '') !== '') || lines[0] || '(空白)';
  let t = meaningful
    .replace(/[[\]{}"|]/g, ' ')        // 括號 / 引號 / 表格分隔線 → 空白
    .replace(/\t/g, ' ')               // Tab → 空白
    .replace(/\s*([,:])\s*/g, '$1 ')   // 冒號 / 逗號 前後空白整理成「後面一個空白」
    .replace(/\s+/g, ' ')
    .replace(/^[\s,:]+|[\s,:]+$/g, '')
    .trim();
  if (!t) t = meaningful.trim();
  return t.length > 40 ? `${t.slice(0, 40)}…` : t;
}

function newId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
