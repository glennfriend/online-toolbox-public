// sw.js — service worker:預快取整個 app(index.html + 25 支 JS,約 145K),
// 讓 curvelab「第二次起離線可用」。本工具零外部資源,離線後是全功能。
//
// 注意:index.html 用 ?v=Date.now() 動態載入 JS(每次查詢字串都不同),
// 所以快取比對一律 ignoreSearch —— 不然一個檔都對不上。
//
// 更新規則:改了任何檔(index.html / js/*)就把 VERSION +1。

const VERSION = 2;   // 2:手機版面(控制列可換行、切換鈕 2 欄網格)
const CACHE = `curvelab-v${VERSION}`;

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
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

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
  // ignoreSearch:吃掉 ?v=<timestamp>
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
