// sw.js — service worker:把 app shell 預快取,讓字典「第二次起離線可用」。
//
// 邊界(這支只做一件事):
//   • shell(HTML/CSS/JS/wasm,約 1.5MB)→ 預快取,離線直接供應。
//   • data/(manifest.json 與 .db.gz)→ 一律直接走網路、不進快取:
//       - 資料的持久化由 OPFS 負責(db.worker.js),SW 再存一份 = 重複 13MB。
//       - manifest 必須拿到「網路上的最新版」才有意義;離線拿不到時,
//         由 main.js 的 boot() 退用 OPFS 既有資料(fail-soft),不是 SW 的事。
//   • 跨網域(發音 API 等)→ 不攔,維持原行為。
//
// 更新規則(重要):改了 shell 任一檔(index.html / styles.css / js/* / vendor/*)
// 就要把 VERSION +1 —— 瀏覽器發現 sw.js 內容變了才會裝新版、換新快取。
// 資料更新「不用」動 VERSION(manifest 比對本來就每次上線都做)。

const VERSION = 1;
const CACHE = `dictionary-shell-v${VERSION}`;

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './js/main.js',
  './js/db.js',
  './js/db.worker.js',
  './js/pronounce.js',
  './vendor/sqlite-wasm/index.mjs',
  './vendor/sqlite-wasm/sqlite3.wasm',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
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

  // 導航請求(重新整理/直接開網址)→ 給快取的 index.html
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('./index.html').then((hit) => hit || fetch(req)));
    return;
  }

  // shell:快取優先,沒中才走網路(shell 已全數預快取,沒中代表漏列 → 上線時仍可用,離線才會發現)
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req))
  );
});

function scopePath() {
  return new URL(self.registration.scope).pathname;
}
