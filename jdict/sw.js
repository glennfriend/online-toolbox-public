// sw.js — 讓日文字典「第二次起離線可用」。做法與 dictionary/sw.js 相同:
//   • shell(HTML/CSS/JS/wasm)→ 邊用邊快取:install 盡力預熱(永不失敗),fetch 走 cache-first、
//     沒有就抓、抓到順手存。
//   • data/(manifest.json 與 .db.gz)→ 一律走網路、不進 SW 快取:資料的持久化由 OPFS 負責
//     (db.worker.js),SW 再存一份 = 重複 26MB;離線拿不到 manifest 由 main.js 的 boot() 退用 OPFS。
//   • 跨網域(JapanesePod101 錄音等)→ 不攔。
//
// 更新規則:改了 shell 任一檔就把 VERSION +1(activate 只清自己的舊版快取)。

const VERSION = 1;
const CACHE = `jdict-shell-v${VERSION}`;

const SHELL = [
  './', './index.html', './styles.css',
  './js/main.js', './js/db.js', './js/db.worker.js', './js/pronounce.js', './js/labels.js',
  './js/normalize.js', './js/deinflect.js',
  './vendor/sqlite-wasm/index.mjs', './vendor/sqlite-wasm/sqlite3.wasm', './vendor/wanakana/wanakana.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(SHELL.map((url) => c.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      // 只清自己的舊版(CacheStorage 整個 origin 共用,各工具用前綴區隔)
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('jdict-shell-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (!url.pathname.startsWith(scopePath())) return;
  if (url.pathname.includes('/data/')) return;

  if (req.mode === 'navigate') {
    e.respondWith(cacheFirst(req, './index.html'));
    return;
  }
  e.respondWith(cacheFirst(req, req));
});

function cacheFirst(req, key) {
  return caches.match(key).then((hit) => {
    if (hit) return hit;
    return fetch(req).then((resp) => {
      if (resp && resp.ok) {
        const copy = resp.clone();
        caches.open(CACHE).then((c) => c.put(key, copy)).catch(() => {});
      }
      return resp;
    });
  });
}

function scopePath() {
  return new URL(self.registration.scope).pathname;
}
