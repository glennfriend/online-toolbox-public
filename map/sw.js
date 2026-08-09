// sw.js — service worker:讓 map「第二次起離線可用」。
//
// 離線時能用什麼(誠實邊界):
//   ✓ 組清單 / 點詳情 / 路線順序計算(builtin.json + localStorage 都在本機)
//   ✗ 右側地圖畫面(Google 崁入 iframe,內容來自 Google 伺服器,無法快取)
//     → mapview.js 離線時改顯示說明,不留一塊死掉的 iframe
//   ✗ 搜尋加點(Nominatim)—— 本來就是外部服務,離線失敗照常顯示錯誤
//
// 快取策略分兩種:
//   • shell(HTML/CSS/JS)→ 預快取、快取優先;改檔要把 VERSION +1
//   • data/builtin.json → 網路優先、成功順手更新快取、失敗退快取:
//     這份資料常更新(新增景點美食),上線永遠拿最新,離線用最後一次拿到的,
//     而且「資料更新不需要動 VERSION」。

const VERSION = 2;   // 2:點位新增 url 欄位,詳情卡多出「官網 ↗」
const CACHE = `map-shell-v${VERSION}`;
const DATA_CACHE = 'map-data';          // 資料另放一桶:shell 換版時不必重抓資料

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './js/main.js',
  './js/store.js',
  './js/geo.js',
  './js/mapview.js',
  './js/io.js',
  './js/util.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(Promise.all([
    caches.open(CACHE).then((c) => c.addAll(SHELL)),
    // 資料也先抓一份,讓「上線開過一次」就具備離線能力
    caches.open(DATA_CACHE).then((c) => c.add('./data/builtin.json')).catch(() => {}),
  ]).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
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

  if (req.mode === 'navigate') {
    e.respondWith(caches.match('./index.html').then((hit) => hit || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
