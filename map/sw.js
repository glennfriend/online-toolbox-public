// sw.js — 讓 map「第二次起離線可用」。
//
// 離線時能用什麼(誠實邊界):
//   ✓ 組清單 / 點詳情 / 路線順序計算(builtin.json + localStorage 都在本機)
//   ✗ 右側地圖畫面(Google 崁入 iframe,內容來自 Google 伺服器,無法快取)
//     → mapview.js 離線時改顯示說明,不留一塊死掉的 iframe
//   ✗ 搜尋加點(Nominatim)—— 外部服務,離線失敗照常顯示錯誤
//
// 快取策略分兩種:
//   • shell(HTML/CSS/JS)→ 邊用邊快取(與 curvelab / dictionary / handbook 一致):
//     install 盡力預熱(永不失敗),fetch cache-first、沒有就抓、抓到順手存。
//     單一檔被擋 / 逾時只影響那個檔,不會像 cache.addAll 那樣一個失敗整批不進快取。
//   • data/builtin.json → 網路優先、成功順手更新快取、失敗退快取:
//     這份資料常更新(新增景點美食),上線永遠拿最新,離線用最後一次拿到的,
//     而且「資料更新不需要動 VERSION」。放另一個 bucket,shell 換版時不必重抓資料。

const VERSION = 3;   // 3:shell 改用邊用邊快取(與其他工具一致)
const CACHE = `map-shell-v${VERSION}`;
const DATA_CACHE = 'map-data';

const SHELL = [
  './', './index.html', './styles.css',
  './js/main.js', './js/store.js', './js/geo.js', './js/mapview.js', './js/io.js', './js/util.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(Promise.all([
    // 盡力預熱 shell(allSettled → 單檔失敗不拖垮整體,install 永不 reject)
    caches.open(CACHE).then((c) => Promise.allSettled(SHELL.map((url) => c.add(url)))),
    // 資料也先抓一份,讓「上線開過一次」就具備離線能力
    caches.open(DATA_CACHE).then((c) => c.add('./data/builtin.json')).catch(() => {}),
  ]).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      // 只清自己的舊版 shell(CacheStorage 整個 origin 共用,要用前綴限縮;
      // 也不要動到 DATA_CACHE)
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('map-shell-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;                        // Google iframe / Nominatim 等不攔
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;

  // 資料:網路優先(拿最新)→ 成功更新快取 → 失敗退快取(離線)
  if (url.pathname.endsWith('/data/builtin.json')) {
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
