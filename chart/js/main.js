// main.js — 殼層:貼資料 →(自動偵測/手動選)解析成統一表 → 顯示表 →
//           選 X / Y / 圖種(重複類別自動彙總)→ 出圖 → 匯出 PNG / SVG。
//
// 核心不認識任何特定格式或圖種:格式由 parse/ 提供、圖種由 charts/ 提供,兩者都可插拔。

import { loadECharts } from './echarts-loader.js';
import { parse } from './parse/index.js';
import { FORMAT_LABELS, detectFormat } from './detect.js';
import { numericColumns, firstStringColumn } from './table.js';
import { CHARTS, getChart } from './charts/index.js';

const qs = (s) => document.querySelector(s);
const input = qs('#input');
const formatBar = qs('#formats');
const chartBar = qs('#charttypes');
const config = qs('#config');
const preview = qs('#preview');
const mapBox = qs('#mapping');
const chartBox = qs('#chart');
const actions = qs('#actions');
const statusEl = qs('#status');
const toast = qs('#toast');

let echartsLib = null;   // 載入後的 echarts 全域
let chart = null;        // 顯示用的 echarts instance
let table = null;        // 目前解析出的統一表
let format = 'auto';     // 目前選的輸入格式
let chartId = 'bar';     // 目前選的圖種
let lastOption = null;   // 最近一次的 option(供匯出 SVG 重繪)
let colSig = '';         // 欄位簽章:變了才重設欄位對應、重建控制項
const map = { xIdx: 0, yIdxs: [], agg: 'sum' }; // 欄位對應

const SAMPLE = '水果,一月,二月\n蘋果,30,45\n香蕉,20,25\n橘子,15,30\n葡萄,28,18';

init();

async function init() {
  buildFormatButtons();
  buildChartButtons();
  qs('#download-png').addEventListener('click', downloadPng);
  qs('#download-svg').addEventListener('click', downloadSvg);

  let timer;
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(parseAndRender, 200); });
  window.addEventListener('resize', () => chart && chart.resize());

  setStatus('載入繪圖元件中…');
  try { echartsLib = await loadECharts(); }
  catch { setStatus('繪圖元件載入失敗(CDN 與本地皆無法載入)'); return; }
  chart = echartsLib.init(chartBox, null, { renderer: 'canvas' });

  input.value = SAMPLE;   // 預設帶一份範例,一開啟就看得到圖
  parseAndRender();
}

// ── 解析 + 重繪 ──
function parseAndRender() {
  const raw = input.value;
  if (!raw.trim()) { config.hidden = true; actions.hidden = true; chart && chart.clear(); setStatus(''); return; }

  let result;
  try { result = parse(raw, format); }
  catch (err) { config.hidden = true; actions.hidden = true; chart && chart.clear(); setStatus(''); showError(err.message); return; }

  table = result.table;
  if (format === 'auto') highlightFormat(result.usedFormat); // 反映偵測到的格式

  renderPreview(table);
  rebuildMappingIfColumnsChanged(table);
  config.hidden = false;
  renderChart();
}

function renderChart() {
  if (!table || !chart) return;
  if (!map.yIdxs.length) { chart.clear(); actions.hidden = true; showError('請至少勾選一個數值欄(Y)'); return; }
  const option = getChart(chartId).build(table, map);
  lastOption = option;
  chart.setOption(option, true);
  actions.hidden = false;
  setStatus(`已用「${getChart(chartId).name}」呈現 · ${table.rows.length} 列 · 重複類別以「${aggLabel(map.agg)}」合併`);
}

// ── 欄位對應(X / Y / 彙總方式)──
// 欄位結構沒變就保留使用者的選擇;變了才重設預設並重建控制項。
function rebuildMappingIfColumnsChanged(t) {
  const sig = t.columns.map((c) => c.name + ':' + c.type).join('|');
  if (sig === colSig) return;
  colSig = sig;

  const nums = numericColumns(t);
  map.xIdx = firstStringColumn(t);
  map.yIdxs = nums.length ? [nums.find((i) => i !== map.xIdx) ?? nums[0]] : [];
  map.agg = 'sum';
  buildMappingControls(t);
}

function buildMappingControls(t) {
  mapBox.innerHTML = '';

  // X(類別)
  const xSel = document.createElement('select');
  t.columns.forEach((c, i) => xSel.add(new Option(`${c.name}${c.type === 'number' ? ' (數值)' : ''}`, i)));
  xSel.value = map.xIdx;
  xSel.addEventListener('change', () => { map.xIdx = +xSel.value; renderChart(); });
  mapBox.appendChild(field('X(類別)', xSel));

  // Y(數值,可多選)
  const ys = document.createElement('div'); ys.className = 'checks';
  t.columns.forEach((c, i) => {
    const lab = document.createElement('label');
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.value = i; cb.checked = map.yIdxs.includes(i);
    cb.addEventListener('change', () => {
      map.yIdxs = [...ys.querySelectorAll('input:checked')].map((x) => +x.value).sort((a, b) => a - b);
      renderChart();
    });
    lab.append(cb, document.createTextNode(c.name));
    ys.appendChild(lab);
  });
  mapBox.appendChild(field('Y(數值)', ys));

  // 重複類別的彙總方式
  const aggSel = document.createElement('select');
  [['sum', '加總'], ['avg', '平均'], ['count', '計數']].forEach(([v, t2]) => aggSel.add(new Option(t2, v)));
  aggSel.value = map.agg;
  aggSel.addEventListener('change', () => { map.agg = aggSel.value; renderChart(); });
  mapBox.appendChild(field('重複類別', aggSel));
}

function field(label, control) {
  const wrap = document.createElement('label'); wrap.className = 'field';
  const span = document.createElement('span'); span.className = 'field-label'; span.textContent = label;
  wrap.append(span, control);
  return wrap;
}

// ── 表格預覽(只顯示前幾列,讓使用者確認解析正確)──
function renderPreview(t) {
  const MAX = 6;
  const head = '<tr>' + t.columns.map((c) => `<th>${esc(c.name)}<small>${c.type === 'number' ? '數值' : '文字'}</small></th>`).join('') + '</tr>';
  const body = t.rows.slice(0, MAX).map((r) => '<tr>' + r.map((cell) => `<td>${esc(cell)}</td>`).join('') + '</tr>').join('');
  const more = t.rows.length > MAX ? `<div class="more">…還有 ${t.rows.length - MAX} 列</div>` : '';
  preview.innerHTML = `<table class="preview-table"><thead>${head}</thead><tbody>${body}</tbody></table>${more}`;
}

// ── 格式 / 圖種按鈕(資料驅動,易擴充)──
function buildFormatButtons() {
  Object.entries(FORMAT_LABELS).forEach(([id, label]) => {
    const b = mkButton(label, () => { format = id; setActive(formatBar, id); parseAndRender(); });
    b.dataset.id = id;
    formatBar.appendChild(b);
  });
  setActive(formatBar, 'auto');
}

function buildChartButtons() {
  CHARTS.forEach((c) => {
    const b = mkButton(c.name, () => { chartId = c.id; setActive(chartBar, c.id); renderChart(); });
    b.dataset.id = c.id;
    chartBar.appendChild(b);
  });
  setActive(chartBar, chartId);
}

function highlightFormat(usedFmt) { setActive(formatBar, format === 'auto' ? 'auto' : usedFmt); }

function setActive(bar, id) {
  [...bar.children].forEach((b) => b.classList.toggle('active', b.dataset.id === id));
}

function mkButton(text, onClick) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'chip-btn'; b.textContent = text;
  b.addEventListener('click', onClick); return b;
}

// ── 匯出 ──
function downloadPng() {
  if (!chart) return;
  const url = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
  triggerDownload(url, filename('png'));
  showToast('已下載 PNG');
}

// SVG:用 SVG renderer 另開一個臨時 instance 重繪,取出 <svg> 字串。
function downloadSvg() {
  if (!echartsLib || !lastOption) return;
  const w = chartBox.clientWidth || 720, h = chartBox.clientHeight || 460;
  const tmp = document.createElement('div');
  tmp.style.cssText = `position:absolute;left:-9999px;top:0;width:${w}px;height:${h}px`;
  document.body.appendChild(tmp);
  const inst = echartsLib.init(tmp, null, { renderer: 'svg', width: w, height: h });
  inst.setOption(lastOption);
  const svg = tmp.querySelector('svg').outerHTML;
  inst.dispose(); tmp.remove();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  triggerDownload(url, filename('svg'));
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('已下載 SVG');
}

function triggerDownload(href, name) {
  const a = document.createElement('a'); a.href = href; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
}

function filename(ext) { return `chart-${chartId}.${ext}`; }

// ── 小工具 ──
function aggLabel(v) { return v === 'avg' ? '平均' : v === 'count' ? '計數' : '加總'; }
function setStatus(text) { statusEl.textContent = text; statusEl.classList.remove('err'); }
function showError(text) { statusEl.textContent = text; statusEl.classList.add('err'); }
function esc(s) { return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

let toastTimer;
function showToast(message) {
  toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}
