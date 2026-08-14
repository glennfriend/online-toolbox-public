// sw.js — service worker:預快取整個 app(index.html + 25 支 JS,約 76K),
// 讓 curvelab「第二次起離線可用」。本工具零外部資源,離線後是全功能。
//
// 這支要顧一個別的工具沒有的問題:它的預快取有 27 個檔(其他三個是 7~10 個),
// 而 cache.addAll() 是「全有全無」—— 27 個請求裡只要一個逾時或斷線,整批都不會進快取,
// 而且沒有任何跡象,使用者只會在離線時發現進不去。所以這裡失敗要重試(見 precache)。
// 就算重試到底還是失敗,也讓 install 失敗、不留半殘的快取 —— 由頁面負責把這件事說出來。
//
// 更新規則:改了任何檔(index.html / js/*)就把 VERSION +1。

const VERSION = 6;   // 6:預快取可續傳(保留已抓到的,下次只補缺的);退避時間拉長
const CACHE = `curvelab-v${VERSION}`;
const DIAG = 'curvelab-diag';   // 失敗原因存這裡,下次載入頁面一定讀得到
const RETRIES = 4;
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
//
// 這裡的兩個關鍵設計:
//   • 一次只抓 BATCH 個、每個檔各自退避重試 —— 對不穩的連線友善得多
//   • 「可續傳」:已經在快取裡的就跳過,失敗時也保留已抓到的。
//     實測有使用者卡在單一檔案抓不到(NetworkError),舊版每次失敗就整批砍掉重練,
//     於是永遠得一次湊滿 27 個才會成功 —— 那是不會收斂的。保留進度之後,
//     下一次進站只需要補那幾個缺的,成功機率高得多。
//
// 但 install 仍然必須「收齊才算成功」:沒收齊就讓它失敗、SW 不啟用。
// 寧可離線時乾脆打不開,也不要啟用一個半殘的快取、讓你在莫名其妙的地方壞掉。
async function precache() {
  const cache = await caches.open(CACHE);
  const missing = [];
  for (const url of SHELL) {
    if (!(await cache.match(url))) missing.push(url);
  }
  if (!missing.length) { await caches.delete(DIAG); return; }

  const failed = [];
  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH);
    const results = await Promise.all(batch.map((url) => addWithRetry(cache, url)));
    results.forEach((err, n) => { if (err) failed.push(`${batch[n]}(${err})`); });
  }

  if (failed.length) {
    const done = SHELL.length - failed.length;
    await report(`快取不到 ${failed.length}/${SHELL.length} 個檔案:${failed[0]}` +
                 `${failed.length > 1 ? ` 等 ${failed.length} 個` : ''};已收齊 ${done} 個,下次進站只會補缺的`);
    throw new Error(`precache incomplete: ${failed.length} failed`);
  }
  await caches.delete(DIAG);   // 這次收齊了,清掉上次留下的失敗紀錄
}

// 成功回傳 null,失敗回傳錯誤描述(不 throw)—— 這樣同一批裡其他檔案還是會被收下來。
async function addWithRetry(cache, url) {
  let lastErr;
  for (let i = 1; i <= RETRIES; i++) {
    try {
      await cache.add(url);
      return null;
    } catch (err) {
      lastErr = err;
      // 退避拉長(1s → 2s → 4s):原本 0.5s / 1s 太急,連線斷一兩秒就三次全滅
      if (i < RETRIES) await new Promise((r) => setTimeout(r, Math.pow(2, i - 1) * 1000));
    }
  }
  return `重試 ${RETRIES} 次仍失敗:${lastErr && lastErr.message ? lastErr.message : lastErr}`;
}

// 把失敗的「具體原因」留下來。瀏覽器給的 install 錯誤只說「失敗」,不說哪個檔、
// 為什麼 —— 那樣沒辦法查。
//
// 這裡用兩個管道,因為單靠 postMessage 會漏:如果頁面是舊版(GitHub Pages 對
// index.html 設 10 分鐘快取,重新整理很可能還是拿到舊檔),它就沒有掛監聽,
// 訊息送出去等於丟進虛空。寫進快取則是持久的,下次載入一定讀得到。
async function report(detail) {
  const info = detail + await storageNote();
  try {
    const c = await caches.open(DIAG);
    await c.put('diag', new Response(info, { headers: { 'content-type': 'text/plain; charset=utf-8' } }));
  } catch { /* 連診斷都寫不進去,通常本身就是儲存空間的問題 */ }
  try {
    const cs = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    cs.forEach((c) => c.postMessage({ type: 'precache-failed', detail: info }));
  } catch { /* 回報失敗就算了,不要蓋掉原始錯誤 */ }
}

// 附上儲存空間用量:如果失敗其實是空間不足造成的,錯誤訊息本身通常看不出來。
async function storageNote() {
  try {
    if (!navigator.storage || !navigator.storage.estimate) return '';
    const e = await navigator.storage.estimate();
    const mb = (n) => Math.round((n || 0) / 1048576) + 'MB';
    return `(儲存空間 已用 ${mb(e.usage)} / 上限 ${mb(e.quota)})`;
  } catch {
    return '';
  }
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
