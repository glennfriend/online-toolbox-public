// sw.js — 讓 handbook「第二次起離線可用」(主要情境就是手機隨手查)。
//
// 快取策略分兩種(與 curvelab / dictionary / map 一致):
//   • shell(HTML/CSS/JS)→ 邊用邊快取:install 盡力預熱(永不失敗),
//     fetch cache-first、沒有就抓、抓到順手存。單一檔被擋 / 逾時只影響那個檔,
//     不會像 cache.addAll 那樣一個失敗整批不進快取。
//   • data/qa.md → 網路優先、成功順手更新快取、離線退快取:
//     內容常新增修正,上線永遠拿最新,離線用最後一次拿到的,「資料更新不用動 VERSION」。

const VERSION = 7;   // 7:shell 改用邊用邊快取(與其他工具一致)
const CACHE = `handbook-shell-v${VERSION}`;
const DATA_CACHE = 'handbook-data';

const SHELL = [
  './', './index.html', './styles.css',
  './js/main.js', './js/parse.js', './js/saved.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(Promise.all([
    caches.open(CACHE).then((c) => Promise.allSettled(SHELL.map((url) => c.add(url)))),
    caches.open(DATA_CACHE).then((c) => c.add('./data/qa.md')).catch(() => {}),
  ]).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      // 只清自己的舊版 shell(CacheStorage 整個 origin 共用,要用前綴限縮;不動 DATA_CACHE)
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

  // shell:邊用邊快取
  if (req.mode === 'navigate') {
    e.respondWith(cacheFirst(req, './index.html'));
    return;
  }
  e.respondWith(cacheFirst(req, req));
});

// cache-first;沒有就抓、抓到成功順手存。key 可與請求不同(導覽正規化存成 './index.html')。
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
