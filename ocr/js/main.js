// main.js — 殼層:取圖(拖/貼/上傳,圖片或 PDF)→ 預覽 → 呼叫 OCR → 顯示可複製文字。
//
// 三個獨立模組各司其職,互不影響:
//   ocr.js        OCR 引擎(canvas → { text, lines, width, height })
//   modelcache.js 模型持久快取(由 ocr.js 使用)
//   preprocess.js 影像前處理(可選,純 canvas)
//   pdfdoc.js     PDF → canvas(可選,延遲載入 pdf.js)
//
// 「框疊原圖 + 低信心標記」只在「圖片模式」啟用(PDF 是多頁、預覽僅縮圖,框會對不上)。

import { ensureEngine, recognizeCanvas } from './ocr.js';
import { blobToCanvas, preprocess } from './preprocess.js';
import { isPdf, openPdf, renderPage, resolvePages } from './pdfdoc.js';

const LOW_CONF = 0.85;   // 行內最低字信心 < 此值 → 標為「低信心、優先校對」

const $ = (s) => document.querySelector(s);
const el = {
  drop: $('#drop'), file: $('#file'), preview: $('#preview'), overlay: $('#overlay'), pick: $('#pick'),
  run: $('#run'), clear: $('#clear'), copy: $('#copy'),
  prep: $('#prep'), pages: $('#pages'),
  status: $('#status'), result: $('#result'), proof: $('#proof'),
};

let current = null;       // { kind:'image', blob } | { kind:'pdf', doc, numPages }
let previewUrl = null;
let busy = false;
let lastImageResult = null;   // 圖片模式最後一次結果 { lines, width, height }(畫框用)
let highlightLine = -1;       // 目前閃示的行(校對清單點選)

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
    const canvas = await renderPage(doc, 1, 1.5);   // 第一頁當預覽縮圖
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
  clearOverlayAndProof();
}

function clearAll() {
  resetCurrent();
  el.preview.removeAttribute('src'); el.preview.hidden = true;
  el.drop.classList.remove('has-img');
  el.pages.hidden = true;
  el.run.disabled = true; el.copy.disabled = true;
  el.result.value = ''; setStatus('');
}

// 取得一張(已視需要前處理的)canvas → 辨識,回傳 { text, lines, width, height }。
async function ocrCanvas(canvas) {
  const c = el.prep.checked ? preprocess(canvas) : canvas;
  return recognizeCanvas(c, (m) => setStatus(m, 'work'));
}

async function run() {
  if (!current || busy) return;
  busy = true; el.run.disabled = true;
  el.result.value = ''; el.copy.disabled = true;
  clearOverlayAndProof();
  try {
    const res = current.kind === 'pdf' ? await runPdf() : await runImage();
    el.result.value = res.text;
    el.copy.disabled = !res.text;
    if (!res.text) {
      setStatus('沒有辨識到文字(換清晰一點的來源試試)', 'err');
    } else if (current?.kind === 'image') {
      const n = showImageAnnotations(res);
      setStatus(n > 0 ? `完成 · 低信心 ${n} 行(下方點一下校對)` : '完成 · 無低信心行', 'ok');
    } else {
      setStatus('完成', 'ok');
    }
  } catch (e) {
    console.error(e);
    setStatus('辨識失敗:' + (e?.message || e) + '(需要網路下載模型;若持續失敗請看 console)', 'err');
  } finally {
    busy = false; el.run.disabled = !current;
  }
}

async function runImage() {
  const canvas = await blobToCanvas(current.blob);
  return ocrCanvas(canvas);   // { text, lines, width, height }
}

async function runPdf() {
  const pageNos = resolvePages(el.pages.value, current.numPages);
  if (!pageNos.length) {
    setStatus(`此 PDF 只有 ${current.numPages} 頁,所選範圍沒有頁面`, 'err');
    return { text: '' };
  }
  await ensureEngine((m) => setStatus(m, 'work'));
  const parts = [];
  for (let i = 0; i < pageNos.length; i++) {
    const n = pageNos[i];
    setStatus(`辨識中… 第 ${n} 頁(${i + 1}/${pageNos.length})`, 'work');
    const canvas = await renderPage(current.doc, n, 2);
    const { text } = await ocrCanvas(canvas);
    parts.push({ n, text });
  }
  if (parts.length === 1) return { text: parts[0].text };
  return { text: parts.map((p) => `──── 第 ${p.n} 頁 ────\n${p.text}`).join('\n\n') };
}

// ── 框疊原圖 + 低信心校對清單(僅圖片模式) ──
// 回傳低信心行數(供狀態列顯示摘要)。
function showImageAnnotations(res) {
  lastImageResult = { lines: res.lines || [], width: res.width, height: res.height };
  const n = buildProof(res);
  drawOverlay();
  return n;
}

function clearOverlayAndProof() {
  lastImageResult = null; highlightLine = -1;
  el.overlay.hidden = true;
  el.proof.hidden = true; el.proof.innerHTML = '';
}

// 每行取「行內最低字信心」當該行信心(任一字沒把握就標起來)。
function lineConfidence(words) {
  return words.length ? Math.min(...words.map((w) => (typeof w.confidence === 'number' ? w.confidence : 1))) : 1;
}

// 渲染低信心行的可點清單;回傳低信心行數。摘要文字交由狀態列顯示,這裡只放可點的行。
function buildProof(res) {
  el.proof.innerHTML = '';
  const lines = res.lines || [];
  const textLines = (res.text || '').split('\n');
  const flagged = [];
  lines.forEach((words, i) => {
    if (!words.length) return;
    const conf = lineConfidence(words);
    if (conf < LOW_CONF) flagged.push({ i, conf, text: textLines[i] ?? words.map((w) => w.text).join('') });
  });

  if (!flagged.length) { el.proof.hidden = true; return 0; }
  el.proof.hidden = false;

  flagged.forEach((f) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'proof-row';
    const t = document.createElement('span');
    t.className = 'proof-text';
    t.textContent = `第 ${f.i + 1} 行  ${f.text || '(空白)'}`;
    const c = document.createElement('span');
    c.className = 'proof-conf';
    c.textContent = Math.round(f.conf * 100) + '%';
    row.append(t, c);
    row.addEventListener('click', () => focusLine(f.i));
    el.proof.appendChild(row);
  });
  return flagged.length;
}

// 計算圖片在預覽框內「實際顯示」的矩形(object-fit: contain 會留白),座標相對 #drop。
function imageContentRect() {
  const ir = el.preview.getBoundingClientRect();
  const pr = el.drop.getBoundingClientRect();
  const nw = el.preview.naturalWidth, nh = el.preview.naturalHeight;
  if (!nw || !nh || !ir.width || !ir.height) return null;
  const scale = Math.min(ir.width / nw, ir.height / nh);
  const w = nw * scale, h = nh * scale;
  // 絕對定位以 #drop 的「內距框」(border 內緣)為基準,故扣掉邊框寬(clientLeft/Top)。
  const originLeft = pr.left + el.drop.clientLeft;
  const originTop = pr.top + el.drop.clientTop;
  return { left: (ir.left - originLeft) + (ir.width - w) / 2, top: (ir.top - originTop) + (ir.height - h) / 2, width: w, height: h };
}

function drawOverlay() {
  const cv = el.overlay;
  if (!lastImageResult || el.preview.hidden || !el.preview.naturalWidth) { cv.hidden = true; return; }
  const rect = imageContentRect();
  if (!rect) { cv.hidden = true; return; }

  const dpr = window.devicePixelRatio || 1;
  cv.style.left = rect.left + 'px'; cv.style.top = rect.top + 'px';
  cv.style.width = rect.width + 'px'; cv.style.height = rect.height + 'px';
  cv.width = Math.max(1, Math.round(rect.width * dpr));
  cv.height = Math.max(1, Math.round(rect.height * dpr));
  cv.hidden = false;

  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.lineWidth = Math.max(1, 1.2 * dpr);
  const { lines, width: recW, height: recH } = lastImageResult;

  lines.forEach((words, i) => {
    const low = lineConfidence(words) < LOW_CONF;
    const hot = i === highlightLine;
    words.forEach((w) => {
      const b = w.box; if (!b) return;
      const x = (b.x / recW) * cv.width, y = (b.y / recH) * cv.height;
      const ww = (b.width / recW) * cv.width, hh = (b.height / recH) * cv.height;
      if (hot) { ctx.fillStyle = 'rgba(207,34,46,.28)'; ctx.fillRect(x, y, ww, hh); }
      ctx.strokeStyle = low ? 'rgba(207,34,46,.95)' : 'rgba(37,99,235,.5)';
      ctx.strokeRect(x, y, ww, hh);
    });
  });
}

// 點校對清單某行:閃示其框 + 在 textarea 選取該行並捲到可見。
function focusLine(i) {
  highlightLine = i; drawOverlay();
  setTimeout(() => { highlightLine = -1; drawOverlay(); }, 1300);

  const lines = el.result.value.split('\n');
  let start = 0;
  for (let k = 0; k < i && k < lines.length; k++) start += lines[k].length + 1;
  const end = start + (lines[i]?.length ?? 0);
  el.result.focus();
  el.result.setSelectionRange(start, end);
  const lineH = parseFloat(getComputedStyle(el.result).lineHeight) || 22;
  el.result.scrollTop = Math.max(0, i * lineH - el.result.clientHeight / 2);
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

// 視窗 / 版面變動時重畫框(預覽圖尺寸會變)。
window.addEventListener('resize', () => { if (lastImageResult) drawOverlay(); });

// ── 動作 ──
el.run.addEventListener('click', run);
el.clear.addEventListener('click', clearAll);
el.copy.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(el.result.value); setStatus('已複製', 'ok'); }
  catch { setStatus('複製失敗(請手動選取)', 'err'); }
});

// 在結果框「選取一段文字」就自動複製到剪貼簿,並去掉頭尾空白(不必再按「複製」)。
function copySelection() {
  const ta = el.result;
  let s = ta.selectionStart, e = ta.selectionEnd;
  if (s === e) return;                                   // 沒選取(只是點一下)→ 不動作
  const val = ta.value;
  while (s < e && /\s/.test(val[s])) s++;                // 縮掉頭尾空白
  while (e > s && /\s/.test(val[e - 1])) e--;
  if (s === e) return;                                   // 只選到空白 → 不複製
  const text = val.slice(s, e);
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => setStatus('已複製選取的文字', 'ok'), () => copyViaExec(s, e));
  } else {
    copyViaExec(s, e);
  }
}

// 後備:把選取縮到去空白後的範圍,用 execCommand 複製(同步、不需剪貼簿權限)。
function copyViaExec(s, e) {
  try {
    el.result.focus();
    el.result.setSelectionRange(s, e);
    const ok = document.execCommand && document.execCommand('copy');
    setStatus(ok ? '已複製選取的文字' : '自動複製失敗(請按 Ctrl/⌘ + C)', ok ? 'ok' : 'err');
  } catch { setStatus('自動複製失敗(請按 Ctrl/⌘ + C)', 'err'); }
}

// 放手時複製。拖選常落在文字框外才放開,故掛在 document、用焦點判斷是不是在結果框選取。
document.addEventListener('mouseup', () => { if (document.activeElement === el.result) copySelection(); });
el.result.addEventListener('keyup', copySelection);      // 鍵盤選取(Shift+方向鍵 / Ctrl+A);無選取自動略過
