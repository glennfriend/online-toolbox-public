// ocr.js — OCR 引擎整合層(唯一碰 PaddleOCR / onnxruntime-web 的地方)。
//
// 用官方 @paddleocr/paddleocr-js,PP-OCRv5(lang:'ch' 單一模型同時辨識 繁體+簡體+英文)。
// 全程在瀏覽器跑(onnxruntime-web),無後端、無 API key;模型首次下載後由瀏覽器快取。
//
// 註:GitHub Pages 無法設定 COOP/COEP 標頭 → 不能用多執行緒 WASM(SharedArrayBuffer)。
//     故 backend:'auto'(WebGPU 優先,否則單執行緒 WASM 保底),不開 worker 多執行緒。
//
// 整合點集中於此:若日後要換引擎(Tesseract/其它)或自架模型,只改這支。

const LIB_URL = 'https://esm.sh/@paddleocr/paddleocr-js';   // 之後可改自架/釘版本

let _ocr = null;     // 已初始化的引擎(模型載入過就重用)
let _loading = null; // 初始化中的 promise(避免重複載入)

// 確保引擎就緒(首次會下載模型,之後重用)。onStatus 回報進度文字。
async function ensureEngine(onStatus) {
  if (_ocr) return _ocr;
  if (_loading) return _loading;
  _loading = (async () => {
    onStatus?.('載入模型中(首次約 20MB,之後瀏覽器快取、秒載入)…');
    const mod = await import(LIB_URL);
    const PaddleOCR = mod.PaddleOCR || mod.default?.PaddleOCR || mod.default;
    _ocr = await PaddleOCR.create({
      lang: 'ch',                 // 單一模型:簡體 + 繁體 + 拼音 + 英文
      ocrVersion: 'PP-OCRv5',
      ortOptions: { backend: 'auto' },   // WebGPU 優先,否則單執行緒 WASM
    });
    return _ocr;
  })();
  try { return await _loading; } finally { _loading = null; }
}

// 辨識一張圖(File / Blob)→ 回傳純文字(逐行)。onStatus 回報進度。
export async function recognize(blobOrFile, onStatus) {
  const ocr = await ensureEngine(onStatus);
  onStatus?.('辨識中…');
  const out = await ocr.predict(blobOrFile);
  const result = Array.isArray(out) ? out[0] : out;
  return linesOf(result);
}

// 從各種可能的回傳形狀抽出逐行文字(防禦式:欄位名跨版本可能不同)。
function linesOf(result) {
  const items = result?.items || result?.texts || result?.data || [];
  return items
    .map((it) => (typeof it === 'string' ? it : (it.text ?? it.transcription ?? it.rec_text ?? it.label ?? '')))
    .filter((s) => s && s.trim())
    .join('\n');
}
