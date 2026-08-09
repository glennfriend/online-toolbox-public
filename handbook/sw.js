// sw.js — service worker:讓 handbook「第二次起離線可用」(它的主要使用情境就是手機隨手查)。
//
// 快取策略分兩種(同 map 的做法):
//   • shell(HTML/CSS/JS)→ 預快取、快取優先;改檔要把 VERSION +1
//   • data/qa.md → 網路優先、成功順手更新快取、離線退快取:
//     內容常新增修正,上線永遠拿最新,離線用最後一次拿到的,「資料更新不用動 VERSION」。

const VERSION = 2;   // 2:版面精簡(移除大標與展開箭頭,tags 併入標題行)
const CACHE = `handbook-shell-v${VERSION}`;
const DATA_CACHE = 'handbook-data';

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './js/main.js',
  './js/parse.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(Promise.all([
    caches.open(CACHE).then((c) => c.addAll(SHELL)),
    caches.open(DATA_CACHE).then((c) => c.add('./data/qa.md')).catch(() => {}),
  ]).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('handbook-shell-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;

  // 資料:網路優先 → 成功更新快取 → 失敗退快取(離線)
  if (url.pathname.endsWith('/data/qa.md')) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(DATA_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req, { cacheName: DATA_CACHE }))
    );
    return;
  }

  if (req.mode === 'navigate') {
    e.respondWith(caches.match('./index.html').then((hit) => hit || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
