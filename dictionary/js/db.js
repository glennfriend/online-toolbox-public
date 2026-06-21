// db.js — 主執行緒這端的查詢 API,把呼叫轉成 postMessage 給 db.worker.js,回傳 Promise。
// 其他程式只認得這幾個方法,不用碰 worker 細節。

let worker = null;
let seq = 0;
const pending = new Map();

function ensureWorker() {
  if (worker) return;
  worker = new Worker(new URL('./db.worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = (e) => {
    const { id, ok, error, ...rest } = e.data;
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    ok ? p.resolve(rest) : p.reject(new Error(error || 'worker error'));
  };
  worker.onerror = (e) => {
    const err = new Error('字典 worker 載入失敗:' + (e.message || '未知'));
    pending.forEach((p) => p.reject(err));
    pending.clear();
  };
}

function call(cmd, args = {}) {
  ensureWorker();
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, cmd, ...args });
  });
}

export const db = {
  init: (dbUrl, version) => call('init', { dbUrl, version }),
  suggest: (prefix, limit) => call('suggest', { prefix, limit }),
  lookup: (word) => call('lookup', { word }),
  clear: () => call('clear'),
};
