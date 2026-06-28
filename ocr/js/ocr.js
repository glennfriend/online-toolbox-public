// ocr.js — OCR 引擎整合層(唯一碰 PaddleOCR / onnxruntime-web 的地方)。
//
// 對外只有兩個函式:ensureEngine(預載引擎) 與 recognizeCanvas(canvas → 文字)。
// 「拿到 canvas」這件事(從圖檔、從貼上、從 PDF 頁、經不經前處理)都在殼層處理,
// 引擎層只認 canvas:canvas 進、文字出。
//
// 引擎:ppu-paddle-ocr 的「瀏覽器專用」入口(/web),PP-OCRv6 small:
//   單一模型涵蓋 簡體 + 繁體 + 英文 + 50+ 語言。全程瀏覽器內跑、無後端、無 API key。
//
// 關鍵:onnxruntime-web 走 index.html 的 import map → 瀏覽器專用 bundle(ort.all.bundle.min.mjs),
//       避開 CDN 把 Node 版打包進來造成的 `process.binding` 錯誤。設定照官方 demo 的無打包器 CDN 用法。
//
// 模型首次由函式庫預設來源 fetch、靠瀏覽器 HTTP 快取;WebGPU 可用就用、否則 WASM。
// 要換引擎或自架模型,只改這支 + index.html 的 import map。

const WEB_ENTRY = 'https://cdn.jsdelivr.net/npm/ppu-paddle-ocr@6.0.0/web/index.js';

let _svc = null;       // 已初始化的服務(模型載入過就重用)
let _loading = null;   // 初始化中的 promise(避免重複載入)

// 確保引擎與模型就緒(第一次會下載模型,之後重用)。
export async function ensureEngine(onStatus) {
  if (_svc) return _svc;
  if (_loading) return _loading;
  _loading = (async () => {
    onStatus?.('載入引擎與模型中(首次數十 MB,之後瀏覽器快取、秒載入)…');
    const { PaddleOcrService } = await import(WEB_ENTRY);
    const svc = new PaddleOcrService();   // 預設 PP-OCRv6 small:繁 + 簡 + 英 單一模型
    await svc.initialize();               // 偵測模型在此載入(一次性)
    _svc = svc;
    return svc;
  })();
  try { return await _loading; } finally { _loading = null; }
}

// 辨識一張 canvas → 回傳純文字。onStatus 回報進度。
export async function recognizeCanvas(canvas, onStatus) {
  const svc = await ensureEngine(onStatus);
  onStatus?.('辨識中…');
  const result = await svc.recognize(canvas);
  return typeof result?.text === 'string' ? result.text : extractText(result);
}

// 後備:萬一回傳沒有 .text,從常見形狀抽逐行文字。
function extractText(result) {
  const lines = result?.lines || result?.boxes || result?.results || [];
  return lines.map((x) => (typeof x === 'string' ? x : (x.text ?? x.transcription ?? ''))).filter(Boolean).join('\n');
}
