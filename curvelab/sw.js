// sw.js — service worker:預快取整個 app(index.html + 25 支 JS,約 76K),
// 讓 curvelab「第二次起離線可用」。本工具零外部資源,離線後是全功能。
//
// 這支要顧一個別的工具沒有的問題:它的預快取有 27 個檔(其他三個是 7~10 個),
// 而 cache.addAll() 是「全有全無」—— 27 個請求裡只要一個逾時或斷線,整批都不會進快取,
// 而且沒有任何跡象,使用者只會在離線時發現進不去。所以這裡失敗要重試(見 precache)。
// 就算重試到底還是失敗,也讓 install 失敗、不留半殘的快取 —— 由頁面負責把這件事說出來。
//
// 更新規則:改了任何檔(index.html / js/*)就把 VERSION +1。

const VERSION = 4;   // 4:預快取改分批 + 逐檔重試;失敗會把具體原因回報給頁面
const CACHE = `curvelab-v${VERSION}`;
const RETRIES = 3;
const BATCH = 4;     // 一次只同時抓 4 個(見 precache)

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

// 刻意不用 cache.addAll():它會把 27 個請求「同時」發出去,手機網路上很容易有幾個
// 逾時或被中斷,而它又是全有全無 —— 失敗一個,27 個全部白做,而且不會告訴你是哪一個。
// 這裡改成一次只抓 BATCH 個、每個檔各自重試,對不穩的連線友善得多。
// 代價是全部抓完的時間變長一些(27 個小檔共約 76K,可接受)。
async function precache() {
  const cache = await caches.open(CACHE);
  try {
    for (let i = 0; i < SHELL.length; i += BATCH) {
      await Promise.all(SHELL.slice(i, i + BATCH).map((url) => addWithRetry(cache, url)));
    }
  } catch (err) {
    // 不留半殘的快取:寧可完全沒有,也不要只有一半 —— 一半會讓離線時壞在莫名其妙的地方
    await caches.delete(CACHE);
    await report(err.message || String(err));
    throw err;
  }
}

async function addWithRetry(cache, url) {
  let lastErr;
  for (let i = 1; i <= RETRIES; i++) {
    try {
      await cache.add(url);
      return;
    } catch (err) {
      lastErr = err;
      if (i < RETRIES) await new Promise((r) => setTimeout(r, i * 500));
    }
  }
  throw new Error(`快取不到 ${url}(重試 ${RETRIES} 次):${lastErr && lastErr.message ? lastErr.message : lastErr}`);
}

// 把失敗的「具體原因」送回頁面。瀏覽器給的 install 錯誤訊息只說「失敗」,
// 不說哪個檔、為什麼 —— 那樣沒辦法查。includeUncontrolled 是必要的:
// 安裝失敗時這個 SW 還沒控制任何頁面。
async function report(detail) {
  try {
    const cs = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    cs.forEach((c) => c.postMessage({ type: 'precache-failed', detail }));
  } catch { /* 回報本身失敗就算了,不要蓋掉原始錯誤 */ }
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
