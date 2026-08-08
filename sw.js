// sw.js(根目錄)— 只做一件事:讓「入口頁 index.html」離線可開。
//
// 邊界(重要):這支的 scope 涵蓋整站,但 fetch 只攔「入口頁本身」,
// 其他所有請求(各工具的頁面與資源)一律放行 —— 各工具的離線由它們自己目錄裡的
// sw.js 負責(scope 更精確、優先權更高),彼此獨立、互不干擾。
//
// 更新規則:改了 index.html 就把 VERSION +1。

const VERSION = 3;   // 3:入口頁改為只列可離線工具(Dictionary / Curvelab)
const CACHE = `toolbox-index-v${VERSION}`;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('toolbox-index-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const scope = new URL(self.registration.scope).pathname;
  // 只攔入口頁本身;其他(含各工具目錄)一律放行
  if (url.pathname !== scope && url.pathname !== scope + 'index.html') return;
  e.respondWith(caches.match('./index.html').then((hit) => hit || fetch(req)));
});
