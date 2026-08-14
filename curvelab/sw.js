// sw.js — service worker:預快取整個 app(index.html + 25 支 JS,約 76K),
// 讓 curvelab「第二次起離線可用」。本工具零外部資源,離線後是全功能。
//
// 這支要顧一個別的工具沒有的問題:它的預快取有 27 個檔(其他三個是 7~10 個),
// 而 cache.addAll() 是「全有全無」—— 27 個請求裡只要一個逾時或斷線,整批都不會進快取,
// 而且沒有任何跡象,使用者只會在離線時發現進不去。所以這裡失敗要重試(見 precache)。
// 就算重試到底還是失敗,也讓 install 失敗、不留半殘的快取 —— 由頁面負責把這件事說出來。
//
// 更新規則:改了任何檔(index.html / js/*)就把 VERSION +1。

const VERSION = 11;  // 11:補齊完成的訊息與舊紀錄的競態(用旗標,不只移除 div)
const CACHE = `curvelab-v${VERSION}`;
const DIAG = 'curvelab-diag';   // 失敗原因存這裡,下次載入頁面一定讀得到
// 重試刻意「短」:在 install 裡長時間空等(之前用過 1s→2s→4s)會讓 SW 一直閒置,
// 瀏覽器可能直接把它回收掉,install 就中斷在半路 —— 實測就卡在這裡。
// 真正負責復原的是「跨頁面續傳」:這次缺的,下次進站再補。
const RETRIES = 2;
const RETRY_WAIT = 400;
const BATCH = 4;     // 一次只同時抓 4 個(見 precache)

// 分兩級,因為這兩種東西「缺了」的後果完全不同:
//   CORE   少一個 → 整個 app 打不開,所以必須全部收齊才算安裝成功
//   GRAPHS 各張圖彼此獨立(app 的設計就是「一張圖一個檔」),缺一個只是少一張圖
//
// 這個區分是被實際情況逼出來的:有使用者的裝置固定抓不到某一支圖模組
// (重試 4 次都 NetworkError,而其他 26 個都成功、儲存空間也充足),
// 舊版把 27 個一律當必要,結果為了一張圖讓整個離線功能不能用 —— 那不合理。
const CORE = [
  './',
  './index.html',
  './js/theme.js', './js/num.js', './js/plot.js', './js/ui.js', './js/expr.js', './js/registry.js',
];
// 與 index.html 的 files 陣列同步;新增圖檔時兩邊都要加
const GRAPHS = [
  './js/graphs/line.js', './js/graphs/quadratic.js', './js/graphs/parabola.js', './js/graphs/inverse.js', './js/graphs/abs.js',
  './js/graphs/circle.js', './js/graphs/ellipse.js', './js/graphs/system.js', './js/graphs/roots.js', './js/graphs/pythagoras.js',
  './js/graphs/sine.js', './js/graphs/tan.js', './js/graphs/catenary.js', './js/graphs/cycloid.js', './js/graphs/spiral.js', './js/graphs/cardioid.js',
  './js/graphs/astroid.js', './js/graphs/lemniscate.js', './js/graphs/lissajous.js',
];
const SHELL = CORE.concat(GRAPHS);

self.addEventListener('install', (e) => {
  e.waitUntil(precache().then(() => self.skipWaiting()));
});

// 補齊的入口。這是必要的:install 只有在 sw.js 內容變更時才會被觸發,
// 所以「上次少抓的圖模組」不會自己補回來 —— 得由頁面每次載入時主動要求。
// precache() 本身可續傳又是幂等的,重複呼叫沒有副作用。
self.addEventListener('message', (e) => {
  if (e.data === 'topup') e.waitUntil(precache());
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
// install 的成敗只看 CORE:CORE 收齊就啟用(離線至少開得起來),
// GRAPHS 缺的只是少幾張圖,會回報但不阻擋 —— 而且因為可續傳,下次進站還會再試補齊。
async function precache() {
  const cache = await caches.open(CACHE);
  const missing = async (list) => {
    const out = [];
    for (const url of list) if (!(await cache.match(url))) out.push(url);
    return out;
  };

  const coreFailed = await fetchInto(cache, await missing(CORE));
  if (coreFailed.length) {
    await report(`離線功能沒有就緒:核心檔案缺 ${coreFailed.length} 個 —— ${coreFailed[0]}`);
    throw new Error(`core precache incomplete: ${coreFailed.length} failed`);
  }

  const graphFailed = await fetchInto(cache, await missing(GRAPHS));
  if (graphFailed.length) {
    // 注意這裡「不」throw:離線仍然可用,只是少幾張圖。誠實講清楚就好。
    await report(`離線可用,但少了 ${graphFailed.length}/${GRAPHS.length} 張圖:${graphFailed[0]}` +
                 `;其餘 ${SHELL.length - graphFailed.length} 個檔案已收齊,下次進站會再試著補`);
    return;
  }
  await caches.delete(DIAG);   // 全部收齊了,清掉上次留下的紀錄
  await announce({ type: 'precache-ok' });   // 讓頁面把先前顯示的警告收掉
}

// 回傳失敗清單(不 throw),讓同一批裡其他檔案照樣被收下來。
async function fetchInto(cache, urls) {
  const failed = [];
  for (let i = 0; i < urls.length; i += BATCH) {
    const batch = urls.slice(i, i + BATCH);
    const results = await Promise.all(batch.map((url) => addWithRetry(cache, url)));
    results.forEach((err, n) => { if (err) failed.push(`${batch[n]}(${err})`); });
  }
  return failed;
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
      if (i < RETRIES) await new Promise((r) => setTimeout(r, RETRY_WAIT));
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
  await announce({ type: 'precache-failed', detail: info });
}

async function announce(msg) {
  try {
    // includeUncontrolled 是必要的:安裝失敗時這個 SW 還沒控制任何頁面
    const cs = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    cs.forEach((c) => c.postMessage(msg));
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
      // 要排除 DIAG:它也叫 curvelab-*,但那是診斷紀錄,不是舊版快取。
      // (踩過:「圖模組缺幾個」屬於 install 成功,activate 會跑,結果剛寫好的
      //  診斷紀錄立刻被這裡刪掉,持久管道等於白做。)
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('curvelab-') && k !== CACHE && k !== DIAG).map((k) => caches.delete(k))))
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
