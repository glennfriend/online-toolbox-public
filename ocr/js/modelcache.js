// modelcache.js — 模型檔的「可控持久快取」(獨立模組,與引擎無關)。
//
// 解決原本「靠瀏覽器 HTTP 快取」的三個痛點:
//   ① 顯示下載進度    — 串流讀取,回報已下載 / 總量 / %。
//   ② 版本可控、可比對 — 記 manifest(版本號 + 各檔網址 + SHA-256 + 大小);
//                        版本或網址對不上就清掉重抓。想強制所有人重抓 → 把 MANIFEST_VERSION +1。
//   ③ 不被無聲清掉    — 用 Cache API 並請求 navigator.storage.persist()(持久化儲存)。
//
// 介面:給一組 URL,回傳同 key 的 ArrayBuffer。引擎層(ocr.js)再把 buffer 餵進 PaddleOcrService。
// 注意:我們不直接快取跨來源的原始 Response(會是 opaque、讀不回),而是把 bytes 重新包成
//       同源 Response 存入,確保日後讀得回來。

const CACHE_NAME = 'ocr-models';
const MANIFEST_VERSION = 1;                       // ← 想讓所有使用者重抓模型時,改這個數字
const MANIFEST_KEY = 'https://ocr.local/__manifest__';

// 主入口。urls = { detection, recognition, charactersDictionary }(皆為網址字串)。
// onProgress({ phase:'cache'|'download', loaded, total, file }) 回報進度。回傳同 key 的 ArrayBuffer。
export async function loadModels(urls, onProgress) {
  const entries = Object.entries(urls);
  const cache = await openCacheSafe();

  // 命中且版本/網址相符 → 直接用快取(秒載入)。
  if (cache && (await manifestValid(cache, urls))) {
    const cached = await readAllFromCache(cache, entries).catch(() => null);
    if (cached) { onProgress?.({ phase: 'cache' }); return cached; }
  }

  // 失效 / 缺檔 / 沒快取 → 下載(帶進度)。
  if (cache) { try { await caches.delete(CACHE_NAME); } catch {} }
  const cacheW = await openCacheSafe();
  const { buffers, shas, sizes } = await downloadAll(entries, onProgress);

  // best-effort 寫入快取 + manifest(寫入失敗不影響本次辨識)。
  if (cacheW) {
    try {
      for (const [key, url] of entries) await cacheW.put(url, new Response(buffers[key]));
      await cacheW.put(MANIFEST_KEY, new Response(
        JSON.stringify({ v: MANIFEST_VERSION, urls, shas, sizes }),
        { headers: { 'content-type': 'application/json' } },
      ));
    } catch (e) {
      console.warn('寫入模型快取失敗(不影響本次辨識):', e);
    }
  }
  return buffers;
}

// ── 內部 ──

async function openCacheSafe() {
  try {
    if (!('caches' in self)) return null;
    await requestPersist();
    return await caches.open(CACHE_NAME);
  } catch { return null; }
}

// 請求持久化儲存,讓快取不會在空間吃緊時被無聲清掉。
async function requestPersist() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {}
}

// manifest 版本與每個網址都相符才算有效。
async function manifestValid(cache, urls) {
  try {
    const res = await cache.match(MANIFEST_KEY);
    if (!res) return false;
    const m = await res.json();
    if (m.v !== MANIFEST_VERSION) return false;
    return Object.keys(urls).every((k) => m.urls?.[k] === urls[k]);
  } catch { return false; }
}

// 三個檔全部讀得回來才算成功;任一缺失回 null(觸發重抓)。
async function readAllFromCache(cache, entries) {
  const buffers = {};
  for (const [key, url] of entries) {
    const res = await cache.match(url);
    if (!res) return null;
    buffers[key] = await res.arrayBuffer();
  }
  return buffers;
}

// 下載全部檔案,串流回報進度,並算每個檔的 SHA-256。
async function downloadAll(entries, onProgress) {
  // 先抓 header 估總量(LFS / CDN 通常有 content-length;沒有就只報已下載量)。
  const responses = {};
  let total = 0, knownTotal = true;
  for (const [key, url] of entries) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`模型下載失敗(HTTP ${res.status}):${url}`);
    responses[key] = res;
    const len = Number(res.headers.get('content-length'));
    if (len > 0) total += len; else knownTotal = false;
  }

  let loaded = 0;
  const buffers = {}, shas = {}, sizes = {};
  for (const [key] of entries) {
    const buf = await streamToBuffer(responses[key], (n) => {
      loaded += n;
      onProgress?.({ phase: 'download', loaded, total: knownTotal ? total : null, file: key });
    });
    buffers[key] = buf;
    sizes[key] = buf.byteLength;
    shas[key] = await sha256(buf);
  }
  return { buffers, shas, sizes };
}

// 串流讀取 Response → ArrayBuffer,每個 chunk 回報長度(用於進度)。
async function streamToBuffer(res, onChunk) {
  const reader = res.body?.getReader?.();
  if (!reader) { const b = await res.arrayBuffer(); onChunk?.(b.byteLength); return b; }
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
    onChunk?.(value.byteLength);
  }
  const out = new Uint8Array(size);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.byteLength; }
  return out.buffer;
}

async function sha256(buf) {
  try {
    const h = await crypto.subtle.digest('SHA-256', buf);
    return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch { return null; }
}
