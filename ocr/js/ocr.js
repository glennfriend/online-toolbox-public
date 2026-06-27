// ocr.js — OCR 引擎整合層(唯一碰 PaddleOCR / onnxruntime-web 的地方)。
//
// 用 ppu-paddle-ocr 的「瀏覽器專用」入口(/web),引擎 PP-OCRv6 small:
// 單一模型涵蓋 簡體 + 繁體 + 英文 + 50+ 語言。全程瀏覽器內跑、無後端、無 API key。
//
// 關鍵:onnxruntime-web 走 index.html 的 import map → 瀏覽器專用 bundle(ort.all.bundle.min.mjs),
//       避開 CDN 把 Node 版打包進來造成的 `process.binding` 錯誤。
// 設定照官方 demo(snowfluke)的無打包器 CDN 用法。
//
// 模型首次由函式庫預設來源 fetch、靠瀏覽器 HTTP 快取;WebGPU 可用就用、否則 WASM。
// GitHub Pages 無法設 COOP/COEP → WASM 為單執行緒(較慢但可動);未啟用 coi-serviceworker。
//
// 要換引擎或自架模型,只改這支 + index.html 的 import map。

const WEB_ENTRY = 'https://cdn.jsdelivr.net/npm/ppu-paddle-ocr@6.0.0/web/index.js';

let _svc = null;       // 已初始化的服務(模型載入過就重用)
let _loading = null;   // 初始化中的 promise(避免重複載入)

async function ensureService(onStatus) {
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

// 辨識一張圖(File / Blob)→ 回傳純文字。onStatus 回報進度。
export async function recognize(blobOrFile, onStatus) {
  const svc = await ensureService(onStatus);
  onStatus?.('辨識中…');
  const canvas = await blobToCanvas(blobOrFile);
  const result = await svc.recognize(canvas);
  return typeof result?.text === 'string' ? result.text : extractText(result);
}

// 圖片 → canvas(ppu-paddle-ocr/web 的 recognize 吃 HTMLCanvasElement)。
async function blobToCanvas(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    return c;
  } finally { URL.revokeObjectURL(url); }
}

// 後備:萬一回傳沒有 .text,從常見形狀抽逐行文字。
function extractText(result) {
  const lines = result?.lines || result?.boxes || result?.results || [];
  return lines.map((x) => (typeof x === 'string' ? x : (x.text ?? x.transcription ?? ''))).filter(Boolean).join('\n');
}
