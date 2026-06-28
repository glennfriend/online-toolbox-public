// pdfdoc.js — PDF 處理(獨立模組,只負責「PDF → canvas」)。
//
// 與影像流程(preprocess.js)完全分離:這裡壞了不影響貼圖/拖圖辨識,反之亦然。
// 共用的只有最後一步 recognizeCanvas()。
//
// 用 pdf.js(pdfjs-dist v6)的 ESM build,經 index.html 的 import map 載入;
// 為了讓「殼層離線也能開」,pdf.js 一律延遲載入(真的丟 PDF 進來才抓)。

// worker 用 URL 指定(非 import),版本要和 import map 的 pdfjs-dist 對齊。
const PDF_WORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.1.200/build/pdf.worker.min.mjs';

let _pdfjs = null;

async function lib() {
  if (_pdfjs) return _pdfjs;
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER;
  _pdfjs = pdfjs;
  return pdfjs;
}

// 判斷一個 File 是不是 PDF(看 MIME,退而看副檔名)。
export function isPdf(file) {
  return !!file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name || ''));
}

// 開啟 PDF,回傳 pdf.js 的 document(用 .numPages 取頁數、renderPage 取頁)。
export async function openPdf(file) {
  const pdfjs = await lib();
  const data = await file.arrayBuffer();
  return pdfjs.getDocument({ data }).promise;
}

// 把第 n 頁(1-based)render 成 canvas。scale 越大越清晰但越吃記憶體。
export async function renderPage(doc, n, scale = 2) {
  const page = await doc.getPage(n);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  return canvas;
}

// 把下拉選的範圍字串("1-3" / "11-20" / "all")換成實際要解析的頁碼陣列(clamp 到總頁數)。
export function resolvePages(rangeValue, total) {
  if (rangeValue === 'all') return seq(1, total);
  const [a, b] = rangeValue.split('-').map(Number);
  const from = Math.max(1, a);
  if (from > total) return [];           // 例:11-20 但只有 5 頁 → 無頁面
  return seq(from, Math.min(b, total));
}

function seq(from, to) {
  const out = [];
  for (let i = from; i <= to; i++) out.push(i);
  return out;
}
