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
// 模型不靠瀏覽器 HTTP 快取,改由 modelcache.js 做「可控持久快取」(Cache API + 進度 + 版本/hash);
// 我們自己抓 buffer、餵進 PaddleOcrService(model 接受 ArrayBuffer),WebGPU 自動偵測不受影響。
// 要換引擎或自架模型,只改這支 + index.html 的 import map。

import { loadModels } from './modelcache.js';

const WEB_ENTRY = 'https://cdn.jsdelivr.net/npm/ppu-paddle-ocr@6.0.0/web/index.js';

let _svc = null;       // 已初始化的服務(模型載入過就重用)
let _loading = null;   // 初始化中的 promise(避免重複載入)

// 確保引擎與模型就緒(第一次會下載模型,之後從持久快取秒載入)。
export async function ensureEngine(onStatus) {
  if (_svc) return _svc;
  if (_loading) return _loading;
  _loading = (async () => {
    onStatus?.('準備引擎中…');
    // DEFAULT_MODEL = PP-OCRv6 small 的三個檔(偵測 / 辨識 / 字典)網址。
    const { PaddleOcrService, DEFAULT_MODEL } = await import(WEB_ENTRY);
    const model = await loadModels(DEFAULT_MODEL, (p) => onStatus?.(progressMsg(p)));
    onStatus?.('初始化引擎中…');
    const svc = new PaddleOcrService({ model });   // 餵入自己快取好的 buffer
    await svc.initialize();
    _svc = svc;
    return svc;
  })();
  try { return await _loading; } finally { _loading = null; }
}

// 把下載進度轉成狀態文字。
function progressMsg(p) {
  if (!p || p.phase === 'cache') return '從快取載入模型(秒載入)…';
  const mb = (b) => (b / 1048576).toFixed(1);
  if (p.total) return `下載模型 ${mb(p.loaded)} / ${mb(p.total)} MB(${Math.round((p.loaded / p.total) * 100)}%)…`;
  return `下載模型 ${mb(p.loaded)} MB…`;
}

// 辨識一張 canvas → 回傳 { text, lines, width, height }。
//   text   逐行純文字(放進 textarea)
//   lines  RecognitionResult[][]:每行一組 word,每個 word 帶 { text, box{x,y,width,height}, confidence }
//   width/height  這張 canvas 的尺寸(座標換算用;前處理放大後仍以此為準,比例不變)
// onStatus 回報進度。
export async function recognizeCanvas(canvas, onStatus) {
  const svc = await ensureEngine(onStatus);
  onStatus?.('辨識中…');
  const result = await svc.recognize(canvas);   // grouped:{ text, lines, confidence }
  const text = typeof result?.text === 'string' ? result.text : extractText(result);
  return { text, lines: Array.isArray(result?.lines) ? result.lines : [], width: canvas.width, height: canvas.height };
}

// 後備:萬一回傳沒有 .text,從常見形狀抽逐行文字。
function extractText(result) {
  const lines = result?.lines || result?.boxes || result?.results || [];
  return lines.map((x) => (typeof x === 'string' ? x : (x.text ?? x.transcription ?? ''))).filter(Boolean).join('\n');
}
