// 文件庫(localStorage)。概念同 HackMD:多份筆記,開啟某份就是「正在編輯它」,
// 邊改邊自動存回那份(沒有暫存區、不走網址分享)。
//
// 資料形狀:{ docs: [{ id, title, content, createdAt, updatedAt }], currentId }
// 標題自動取內容第一行(去掉開頭 #)。

const KEY = 'markdown.docs.v1';

// 內建文件:固定 id、不可刪除、清單置頂。慣例:內建 id 一律以 "__" 開頭。
export const DEMO_ID = '__demo__';
export function isProtected(id) { return typeof id === 'string' && id.startsWith('__'); }

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

// 清單:內建文件置頂(依建立順序,demo 最前),其餘使用者文件依「最近更新」。
export function list() {
  const builtins = state.docs.filter((d) => isProtected(d.id)).sort((a, b) => a.createdAt - b.createdAt);
  const userDocs = state.docs.filter((d) => !isProtected(d.id)).sort((a, b) => b.updatedAt - a.updatedAt);
  return [...builtins, ...userDocs];
}

// 確保某個「固定 id」的內建文件存在(不存在才建,已存在則保留使用者編輯)。
export function ensureBuiltin(id, content) {
  if (state.docs.some((d) => d.id === id)) return;
  const t = nowTs();
  state.docs.push({ id, title: titleOf(content), content, createdAt: t, updatedAt: t });
  persist();
}

export function getCurrent() {
  return state.docs.find((d) => d.id === state.currentId) || null;
}

export function exists(id) {
  return state.docs.some((d) => d.id === id);
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
  if (isProtected(id)) return;   // 內建示範文件不可刪
  state.docs = state.docs.filter((d) => d.id !== id);
  if (state.currentId === id) state.currentId = list()[0]?.id || null;
  persist();
}
