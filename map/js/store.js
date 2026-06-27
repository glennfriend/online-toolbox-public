// store.js — user 自己的組存在 localStorage(內建組不在這裡、由版控 JSON 載入)。
// 形狀:{ userGroups: [{ id, name, points:[...] }], currentId }

const KEY = 'map.v1';

export function loadUser() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.userGroups)) return s;
  } catch { /* 壞掉或舊格式就當沒有 */ }
  return { userGroups: [], currentId: null };
}

export function saveUser(state) {
  localStorage.setItem(KEY, JSON.stringify({ userGroups: state.userGroups, currentId: state.currentId }));
}

export function uid(prefix = 'id') {
  return crypto.randomUUID ? crypto.randomUUID() : prefix + Date.now() + Math.random().toString(16).slice(2);
}
