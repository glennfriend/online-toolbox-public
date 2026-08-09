// saved.js — 「記住的搜尋」的存放層,只負責讀寫 localStorage,不碰 DOM。
//
// 跟 data/qa.md 完全無關:這是使用者自己的東西,清掉也不影響手冊內容。
// 每個函式都回傳新的陣列,呼叫端拿回傳值當作最新狀態,不要自己改傳進來的陣列。

const KEY = 'handbook.saved.v1';

export function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    // 存壞了(手動改過、舊格式)就當成沒有,不要讓整頁載不出來
    return Array.isArray(v) ? v.filter((s) => typeof s === 'string' && s.trim()) : [];
  } catch {
    return [];
  }
}

export function add(list, query) {
  const s = query.trim();
  if (!s || list.includes(s)) return list;   // 重複的就不再記一次
  return write([...list, s]);
}

export function remove(list, query) {
  return write(list.filter((s) => s !== query));
}

function write(list) {
  // 無痕模式或容量滿了會丟例外。記不起來就算了,不該讓搜尋本身壞掉。
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* 忽略 */ }
  return list;
}
