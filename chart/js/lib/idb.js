// idb.js — 通用的 IndexedDB 封裝(與任何特定資料無關,可重用)。
// 把事件式、囉嗦的原生 IndexedDB 包成乾淨的 Promise 介面。
//
//   const store = openStore({ dbName: 'chart', storeName: 'items' });
//   await store.put({ id: '1', text: 'hi' });
//   const all = await store.getAll();

export function openStore({ dbName, storeName, version = 1, keyPath = 'id' }) {
  const dbPromise = openDatabase(dbName, storeName, version, keyPath);
  const run = (mode, operation) => runOnStore(dbPromise, storeName, mode, operation);
  return {
    getAll: () => run('readonly', (store) => store.getAll()),
    get: (key) => run('readonly', (store) => store.get(key)),
    put: (value) => run('readwrite', (store) => store.put(value)),
    delete: (key) => run('readwrite', (store) => store.delete(key)),
    clear: () => run('readwrite', (store) => store.clear()),
  };
}

function openDatabase(dbName, storeName, version, keyPath) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, version);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName, { keyPath });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runOnStore(dbPromise, storeName, mode, operation) {
  return dbPromise.then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const request = operation(tx.objectStore(storeName));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}
