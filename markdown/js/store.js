// 文件庫(localStorage)。概念同 HackMD:多份筆記,開啟某份就是「正在編輯它」,
// 邊改邊自動存回那份(沒有暫存區、不走網址分享)。
//
// 資料形狀:{ docs: [{ id, title, content, createdAt, updatedAt }], currentId }
// 標題自動取內容第一行(去掉開頭 #)。

const KEY = 'markdown.docs.v1';

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.docs)) return s;
  } catch {}
  return { docs: [], currentId: null };
}

let state = load();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { console.error('[markdown] 儲存失敗(localStorage):', e); }
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function nowTs() { return Date.now(); }

function titleOf(content) {
  const line = (content || '').split('\n').map((s) => s.trim()).find(Boolean);
  if (!line) return '未命名';
  return line.replace(/^#+\s*/, '').slice(0, 40) || '未命名';
}

// 依「最近更新」排序的清單(畫側欄用)。
export function list() {
  return state.docs.slice().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getCurrent() {
  return state.docs.find((d) => d.id === state.currentId) || null;
}

export function open(id) {
  state.currentId = id;
  persist();
}

export function create(content = '') {
  const t = nowTs();
  const doc = { id: uid(), title: titleOf(content), content, createdAt: t, updatedAt: t };
  state.docs.push(doc);
  state.currentId = doc.id;
  persist();
  return doc;
}

export function update(id, content) {
  const d = state.docs.find((x) => x.id === id);
  if (!d) return;
  d.content = content;
  d.title = titleOf(content);
  d.updatedAt = nowTs();
  persist();
}

export function remove(id) {
  state.docs = state.docs.filter((d) => d.id !== id);
  if (state.currentId === id) state.currentId = list()[0]?.id || null;
  persist();
}
