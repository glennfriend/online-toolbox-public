// main.js — 殼層:取圖(拖/貼/上傳)→ 預覽 → 呼叫 OCR → 顯示可複製文字。
// OCR 本身在 ocr.js(唯一碰 PaddleOCR 的地方)。

import { recognize } from './ocr.js';

const $ = (s) => document.querySelector(s);
const el = {
  drop: $('#drop'), file: $('#file'), preview: $('#preview'), pick: $('#pick'),
  run: $('#run'), clear: $('#clear'), copy: $('#copy'),
  status: $('#status'), result: $('#result'),
};

let currentBlob = null;   // 目前要辨識的圖
let previewUrl = null;
let busy = false;

function setStatus(msg, kind = '') { el.status.textContent = msg || ''; el.status.className = 'status' + (kind ? ' ' + kind : ''); }

function setImage(blob) {
  if (!blob || !blob.type?.startsWith('image/')) { setStatus('那不是圖片檔', 'err'); return; }
  currentBlob = blob;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(blob);
  el.preview.src = previewUrl;
  el.preview.hidden = false;
  el.drop.classList.add('has-img');
  el.run.disabled = false;
  setStatus('已載入圖片,按「辨識文字」開始');
}

function clearAll() {
  currentBlob = null;
  if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
  el.preview.removeAttribute('src'); el.preview.hidden = true;
  el.drop.classList.remove('has-img');
  el.run.disabled = true; el.copy.disabled = true;
  el.result.value = ''; setStatus('');
}

async function run() {
  if (!currentBlob || busy) return;
  busy = true; el.run.disabled = true;
  el.result.value = '';
  try {
    const text = await recognize(currentBlob, (m) => setStatus(m, 'work'));
    el.result.value = text;
    el.copy.disabled = !text;
    setStatus(text ? '完成' : '沒有辨識到文字(換清晰一點的圖試試)', text ? 'ok' : 'err');
  } catch (e) {
    console.error(e);
    setStatus('辨識失敗:' + (e?.message || e) + '(需要網路下載模型;若持續失敗請看 console)', 'err');
  } finally {
    busy = false; el.run.disabled = !currentBlob;
  }
}

// ── 取圖:選擇檔案 / 拖放 / 貼上 ──
// 大區塊只負責「拖曳 + 貼上」(點它不彈對話框,以免擋住貼上);選檔案走專屬按鈕。
el.pick.addEventListener('click', () => el.file.click());
el.file.addEventListener('change', (e) => { if (e.target.files[0]) setImage(e.target.files[0]); e.target.value = ''; });

el.drop.addEventListener('dragover', (e) => { e.preventDefault(); el.drop.classList.add('over'); });
el.drop.addEventListener('dragleave', () => el.drop.classList.remove('over'));
el.drop.addEventListener('drop', (e) => {
  e.preventDefault(); el.drop.classList.remove('over');
  const f = [...(e.dataTransfer.files || [])].find((x) => x.type.startsWith('image/'));
  if (f) setImage(f);
});

window.addEventListener('paste', (e) => {
  const item = [...(e.clipboardData?.items || [])].find((it) => it.type.startsWith('image/'));
  if (item) { const blob = item.getAsFile(); if (blob) setImage(blob); }
});

// ── 動作 ──
el.run.addEventListener('click', run);
el.clear.addEventListener('click', clearAll);
el.copy.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(el.result.value); setStatus('已複製', 'ok'); }
  catch { setStatus('複製失敗(請手動選取)', 'err'); }
});
