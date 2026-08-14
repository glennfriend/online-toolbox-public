// sw.js — service worker:預快取整個 app(index.html + 25 支 JS,約 76K),
// 讓 curvelab「第二次起離線可用」。本工具零外部資源,離線後是全功能。
//
// 這支要顧一個別的工具沒有的問題:它的預快取有 27 個檔(其他三個是 7~10 個),
// 而 cache.addAll() 是「全有全無」—— 27 個請求裡只要一個逾時或斷線,整批都不會進快取,
// 而且沒有任何跡象,使用者只會在離線時發現進不去。所以這裡失敗要重試(見 precache)。
// 就算重試到底還是失敗,也讓 install 失敗、不留半殘的快取 —— 由頁面負責把這件事說出來。
//
// 更新規則:改了任何檔(index.html / js/*)就把 VERSION +1。

const VERSION = 3;   // 3:預快取失敗會重試;index.html 不再用 ?v= 查詢字串
const CACHE = `curvelab-v${VERSION}`;
const RETRIES = 3;

const SHELL = [
  './',
  './index.html',
  // 共用 library
  './js/theme.js', './js/num.js', './js/plot.js', './js/ui.js', './js/expr.js', './js/registry.js',
  // 各圖模組(與 index.html 的 files 陣列同步;新增圖檔時兩邊都要加)
  './js/graphs/line.js', './js/graphs/quadratic.js', './js/graphs/parabola.js', './js/graphs/inverse.js', './js/graphs/abs.js',
  './js/graphs/circle.js', './js/graphs/ellipse.js', './js/graphs/system.js', './js/graphs/roots.js', './js/graphs/pythagoras.js',
  './js/graphs/sine.js', './js/graphs/tan.js', './js/graphs/catenary.js', './js/graphs/cycloid.js', './js/graphs/spiral.js', './js/graphs/cardioid.js',
  './js/graphs/astroid.js', './js/graphs/lemniscate.js', './js/graphs/lissajous.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(precache().then(() => self.skipWaiting()));
});

// addAll 全有全無:一個檔失敗就整批不進快取。手機網路抖一下就會這樣,
// 所以重試幾次(間隔遞增)。都失敗就往外丟 —— install 失敗、SW 不會啟用,
// 舊版(若有)繼續服務,不會出現「快取只有一半」這種殘缺狀態。
async function precache() {
  const cache = await caches.open(CACHE);
  let lastErr;
  for (let i = 1; i <= RETRIES; i++) {
    try {
      await cache.addAll(SHELL);
      return;
    } catch (err) {
      lastErr = err;
      if (i < RETRIES) await new Promise((r) => setTimeout(r, i * 1000));
    }
  }
  throw lastErr;
}

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('curvelab-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;

  if (req.mode === 'navigate') {
    e.respondWith(caches.match('./index.html').then((hit) => hit || fetch(req)));
    return;
  }
  // index.html 已改成不加查詢字串,所以不再需要 ignoreSearch(跟 map / handbook 一致)
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
