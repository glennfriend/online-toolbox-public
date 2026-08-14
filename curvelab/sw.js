// sw.js — 讓 curvelab「第二次起離線可用」。本工具零外部資源,離線後是全功能。
//
// ── 想清楚後重寫的離線思維 ──
// 先前的錯誤:把「離線就緒」當成「安裝時一次原子式快取全部 27 個檔」。這個模型很脆弱,
// 而且遇到「單一檔案被擋掉」時根本無解 —— cache.addAll 全有全無,少一個就整批失敗;
// 就算改成分批 / 重試 / 兩級,被擋的那個檔「任何快取策略都拿不到」,硬湊也湊不齊。
//   實際成因:內容封鎖器 / Firefox 追蹤保護會「依檔名」擋掉某些請求,回 NetworkError
//   (使用者手機上就是 tan.js 每次固定被擋,其他 26 個都正常、儲存空間也充足)。
//
// 正確做法是「邊用邊快取」(runtime caching),而不是「安裝時強求一次到位」:
//   1. install:盡力預熱(Promise.allSettled,單檔失敗不影響其他,整體永不失敗)
//              —— 給第一次造訪一個開頭,而且 install 一定成功、SW 一定啟用。
//   2. fetch:cache-first,沒有就抓、抓到成功就順手存起來。頁面每次載入都會請求
//              全部模組,所以只要線上成功載過一次,就會被存進快取供離線使用。
//
// 這樣被擋的單一檔(例如 tan.js)只會讓「那一張圖」離線時打不開,其餘照常;
// 不需要重試 / 分批 / 回報 / 續傳那一整套機制。哪天它能被抓到(換網路、關封鎖器),
// 下次載入就自動補進快取。簡單、自癒、對外部封鎖器天生容忍。
//
// 更新規則:改了任何檔(index.html / js/*)就把 VERSION +1(activate 會清掉舊版快取)。

const VERSION = 13;   // 13:改用「邊用邊快取」;導覽也自我快取(不再依賴 install 預快取)
const CACHE = `curvelab-v${VERSION}`;

// 預熱清單 = app 的全部檔案(與 index.html 的 files 陣列同步;新增圖檔時兩邊都要加)。
// 只是「盡力」預熱,不是必須全中 —— 真正保證離線可用的是下面的 fetch 邊用邊快取。
const SHELL = [
  './', './index.html',
  './js/theme.js', './js/num.js', './js/plot.js', './js/ui.js', './js/expr.js', './js/registry.js',
  './js/graphs/line.js', './js/graphs/quadratic.js', './js/graphs/parabola.js', './js/graphs/inverse.js', './js/graphs/abs.js',
  './js/graphs/circle.js', './js/graphs/ellipse.js', './js/graphs/system.js', './js/graphs/roots.js', './js/graphs/pythagoras.js',
  './js/graphs/sine.js', './js/graphs/tan.js', './js/graphs/catenary.js', './js/graphs/cycloid.js', './js/graphs/spiral.js', './js/graphs/cardioid.js',
  './js/graphs/astroid.js', './js/graphs/lemniscate.js', './js/graphs/lissajous.js',
];

self.addEventListener('install', (e) => {
  // 盡力預熱:allSettled 讓單一檔失敗(被封鎖器擋、逾時)不會拖垮其他,整體永不 reject。
  // install 因此一定成功、SW 一定啟用,不會再出現「一個檔害整個離線功能裝不起來」。
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(SHELL.map((url) => c.add(url))))
      .then(() => self.skipWaiting())
  );
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
  if (url.origin !== location.origin) return;                        // 跨網域不攔
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;

  // 導覽:一律回同一份 index.html。cache-first,沒有就抓、抓到順手存成 './index.html'。
  // 「存」這一步很關鍵 —— 離線導覽要靠這份快取,不能只讀不寫,否則第一次線上進站
  // 沒被存下來,離線就打不開(踩過這個洞:曾經只讀不寫,結果 index.html 沒進快取)。
  if (req.mode === 'navigate') {
    e.respondWith(cacheFirst(req, './index.html'));
    return;
  }

  // 其餘同源 GET:cache-first,沒有就抓、抓到順手存。這就是「邊用邊快取」,
  // 讓「線上載過的檔」自動變成「離線可用的檔」,不必在安裝時強求一次到位。
  e.respondWith(cacheFirst(req, req));
});

// key 可以跟實際請求不同(導覽時把帶查詢字串的頁面網址,正規化存成 './index.html')。
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
