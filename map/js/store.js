// store.js — 多組地點存在 localStorage(純資料層,不碰 DOM)。
// 狀態形狀:{ groups: [{ id, name, points: [{ id, emoji, title, note, lat, lng, z }] }], currentId }

const KEY = 'map.v1';

export function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.groups) && s.groups.length) return s;
  } catch { /* 壞掉就當沒有 */ }
  return null;
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function uid(prefix = 'id') {
  return crypto.randomUUID ? crypto.randomUUID() : prefix + Date.now() + Math.random().toString(16).slice(2);
}
