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

function deriveTitle(text) {
  const firstLine = text.split('\n').map((s) => s.trim()).find(Boolean) || '(空白)';
  return firstLine.length > 40 ? `${firstLine.slice(0, 40)}…` : firstLine;
}

function newId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
