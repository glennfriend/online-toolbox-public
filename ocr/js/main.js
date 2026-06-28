// main.js — 殼層:取圖(拖/貼/上傳,圖片或 PDF)→ 預覽 → 呼叫 OCR → 顯示可複製文字。
//
// 三個獨立模組各司其職,互不影響:
//   ocr.js        OCR 引擎(canvas → 文字)
//   preprocess.js 影像前處理(可選,純 canvas)
//   pdfdoc.js     PDF → canvas(可選,延遲載入 pdf.js)

import { ensureEngine, recognizeCanvas } from './ocr.js';
import { blobToCanvas, preprocess } from './preprocess.js';
import { isPdf, openPdf, renderPage, resolvePages } from './pdfdoc.js';

const $ = (s) => document.querySelector(s);
const el = {
  drop: $('#drop'), file: $('#file'), preview: $('#preview'), pick: $('#pick'),
  run: $('#run'), clear: $('#clear'), copy: $('#copy'),
  prep: $('#prep'), pages: $('#pages'),
  status: $('#status'), result: $('#result'),
};

let current = null;       // { kind:'image', blob } | { kind:'pdf', doc, numPages }
let previewUrl = null;
let busy = false;

function setStatus(msg, kind = '') { el.status.textContent = msg || ''; el.status.className = 'status' + (kind ? ' ' + kind : ''); }

function showPreviewSrc(src) {
  el.preview.src = src;
  el.preview.hidden = false;
  el.drop.classList.add('has-img');
}

// ── 取圖入口:依型別分流到圖片 / PDF ──
async function setFile(file) {
  if (!file) return;
  if (isPdf(file)) return setPdf(file);
  if (file.type?.startsWith('image/')) return setImage(file);
  setStatus('那不是圖片或 PDF', 'err');
}

function setImage(blob) {
  resetCurrent();
  current = { kind: 'image', blob };
  previewUrl = URL.createObjectURL(blob);
  showPreviewSrc(previewUrl);
  el.pages.hidden = true;
  el.run.disabled = false;
  setStatus('已載入圖片,按「辨識文字」(或按 Enter)');
}

async function setPdf(file) {
  resetCurrent();
  setStatus('讀取 PDF 中…', 'work');
  try {
    const doc = await openPdf(file);
    const numPages = doc.numPages;
    current = { kind: 'pdf', doc, numPages };
    // 用第一頁當預覽縮圖
    const canvas = await renderPage(doc, 1, 1.5);
    showPreviewSrc(canvas.toDataURL('image/png'));
    el.pages.hidden = false;
    el.run.disabled = false;
    setStatus(`PDF · 共 ${numPages} 頁,選範圍後按「辨識文字」`);
  } catch (e) {
    console.error(e);
    resetCurrent();
    setStatus('PDF 讀取失敗:' + (e?.message || e) + '(需要網路載入 pdf.js)', 'err');
  }
}

function resetCurrent() {
  current = null;
  if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
}

function clearAll() {
  resetCurrent();
  el.preview.removeAttribute('src'); el.preview.hidden = true;
  el.drop.classList.remove('has-img');
  el.pages.hidden = true;
  el.run.disabled = true; el.copy.disabled = true;
  el.result.value = ''; setStatus('');
}

// 取得一張(已視需要前處理的)canvas → 辨識。
async function ocrCanvas(canvas) {
  const c = el.prep.checked ? preprocess(canvas) : canvas;
  return recognizeCanvas(c, (m) => setStatus(m, 'work'));
}

async function run() {
  if (!current || busy) return;
  busy = true; el.run.disabled = true;
  el.result.value = ''; el.copy.disabled = true;
  try {
    const text = current.kind === 'pdf' ? await runPdf() : await runImage();
    el.result.value = text;
    el.copy.disabled = !text;
    setStatus(text ? '完成' : '沒有辨識到文字(換清晰一點的來源試試)', text ? 'ok' : 'err');
  } catch (e) {
    console.error(e);
    setStatus('辨識失敗:' + (e?.message || e) + '(需要網路下載模型;若持續失敗請看 console)', 'err');
  } finally {
    busy = false; el.run.disabled = !current;
  }
}

async function runImage() {
  const canvas = await blobToCanvas(current.blob);
  return ocrCanvas(canvas);
}

async function runPdf() {
  const pageNos = resolvePages(el.pages.value, current.numPages);
  if (!pageNos.length) {
    setStatus(`此 PDF 只有 ${current.numPages} 頁,所選範圍沒有頁面`, 'err');
    return '';
  }
  await ensureEngine((m) => setStatus(m, 'work'));   // 先把模型載好,進度才好報
  const parts = [];
  for (let i = 0; i < pageNos.length; i++) {
    const n = pageNos[i];
    setStatus(`辨識中… 第 ${n} 頁(${i + 1}/${pageNos.length})`, 'work');
    const canvas = await renderPage(current.doc, n, 2);
    const text = await ocrCanvas(canvas);
    parts.push({ n, text });
  }
  // 多頁時加頁碼分隔;單頁不加。
  if (parts.length === 1) return parts[0].text;
  return parts.map((p) => `──── 第 ${p.n} 頁 ────\n${p.text}`).join('\n\n');
}

// ── 取圖:選擇檔案 / 拖放 / 貼上 ──
// 大區塊只負責「拖曳 + 貼上」(點它不彈對話框,以免擋住貼上);選檔案走專屬按鈕。
el.pick.addEventListener('click', () => el.file.click());
el.file.addEventListener('change', (e) => { if (e.target.files[0]) setFile(e.target.files[0]); e.target.value = ''; });

el.drop.addEventListener('dragover', (e) => { e.preventDefault(); el.drop.classList.add('over'); });
el.drop.addEventListener('dragleave', () => el.drop.classList.remove('over'));
el.drop.addEventListener('drop', (e) => {
  e.preventDefault(); el.drop.classList.remove('over');
  const f = [...(e.dataTransfer.files || [])].find((x) => x.type.startsWith('image/') || isPdf(x));
  if (f) setFile(f);
});

window.addEventListener('paste', (e) => {
  const item = [...(e.clipboardData?.items || [])].find((it) => it.type.startsWith('image/'));
  if (item) { const blob = item.getAsFile(); if (blob) setImage(blob); }
});

// Enter 直接辨識(在結果文字框內編輯時不攔截,讓它正常換行)。
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey) return;
  if (document.activeElement === el.result) return;
  if (current && !busy) { e.preventDefault(); run(); }
});

// ── 動作 ──
el.run.addEventListener('click', run);
el.clear.addEventListener('click', clearAll);
el.copy.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(el.result.value); setStatus('已複製', 'ok'); }
  catch { setStatus('複製失敗(請手動選取)', 'err'); }
});
