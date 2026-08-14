// sw.js — 讓字典「第二次起離線可用」。
//
// 離線快取思維(與 curvelab / map / handbook 一致):
//   • shell(HTML/CSS/JS/wasm)→ 邊用邊快取:install 盡力預熱(永不失敗),
//     fetch 再 cache-first、沒有就抓、抓到順手存。頁面每次都會載入整組 shell,
//     所以線上載過就會被存起來供離線用。單一檔被擋 / 逾時只影響那個檔,不會
//     像 cache.addAll 那樣「一個失敗整批不進快取」。
//   • data/(manifest.json 與 .db.gz)→ 一律走網路、不進 SW 快取:
//       - 資料的持久化由 OPFS 負責(db.worker.js),SW 再存一份 = 重複 13MB。
//       - manifest 要拿「網路最新版」才有意義;離線拿不到時由 main.js 的 boot()
//         退用 OPFS 既有資料(fail-soft),不是 SW 的事。
//   • 跨網域(發音 API 等)→ 不攔。
//
// 更新規則:改了 shell 任一檔就把 VERSION +1(activate 只清自己的舊版快取)。

const VERSION = 3;   // 3:shell 改用邊用邊快取(與其他工具一致)
const CACHE = `dictionary-shell-v${VERSION}`;

// 預熱清單 = 只是「盡力」給第一次造訪開頭;真正保證離線的是 fetch 邊用邊快取。
const SHELL = [
  './', './index.html', './styles.css',
  './js/main.js', './js/db.js', './js/db.worker.js', './js/pronounce.js',
  './vendor/sqlite-wasm/index.mjs', './vendor/sqlite-wasm/sqlite3.wasm',
];

self.addEventListener('install', (e) => {
  // allSettled:單一檔失敗(被封鎖器擋、逾時)不影響其他,整體永不 reject → 一定裝得起來。
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(SHELL.map((url) => c.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      // 只清自己的舊版。CacheStorage 是整個 origin 共用的,四個工具同在一個網域,
      // 若不用前綴限縮會刪掉別的工具的快取。
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('dictionary-shell-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;                       // 跨網域不攔(發音 API 等)
  if (!url.pathname.startsWith(scopePath())) return;                // 只管自己 scope 內
  if (url.pathname.includes('/data/')) return;                      // 資料一律走網路(見檔頭)

  if (req.mode === 'navigate') {
    e.respondWith(cacheFirst(req, './index.html'));
    return;
  }
  e.respondWith(cacheFirst(req, req));
});

// cache-first;沒有就抓、抓到成功順手存(邊用邊快取)。key 可與請求不同,
// 讓導覽把帶查詢字串的頁面網址正規化存成 './index.html'。
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
