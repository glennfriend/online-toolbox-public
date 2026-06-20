// main.js — 殼層:水平步驟列、輸入(debounce)重算、取樣/上限的明確提示、串接 tags 與 mods。
//
// step0 是可編輯的輸入框;之後每個 step 是唯讀的轉換結果。改 step0 → 下游全部跟著重算。
// 版面方向用 LAYOUT 常數控制(目前左到右);改成上到下只要改這個常數 + CSS,step 邏輯不動。

import { computeStages } from './pipeline.js';
import { modsFor } from './mods/index.js';
import { countLines } from './lib/sample.js';
import { el } from './lib/dom.js';
import './tags/defs.js';     // 註冊 tags
import './mods/convert.js';  // 以下註冊 mods
import './mods/sort.js';
import './mods/json.js';
import './mods/stats.js';
import './mods/urls.js';

const LAYOUT = 'row'; // 'row' = 左到右(可改 'col' 上到下;見 styles.css 與 arrowIcon)

const EXAMPLE = '州,人口(百萬)\nCalifornia,39.4\nTexas,31.7\nFlorida,23.5\nNew York,20.0\nPennsylvania,13.1';

const flow = document.querySelector('#flow');
flow.classList.add(LAYOUT === 'row' ? 'flow-row' : 'flow-col');

let chain = [];   // 選定的 mod 序列;chain[k] = 把 step k 轉成 step k+1 的 modId

// ── step0(持久存在,打字時不重建,才不會掉游標)──
const step0 = el('div', 'step');
const tags0 = el('div', 'step-tags');
const banner0 = el('div', 'banner'); banner0.hidden = true;
const textarea = el('textarea', 'step-input');
textarea.spellcheck = false;
textarea.placeholder = '貼上資料(CSV / TSV / JSON / Markdown 表格 / 含網址的文字…)';
const mods0 = el('div', 'step-mods');
step0.append(tags0, banner0, textarea, mods0);
flow.append(step0);

let debounceTimer;
textarea.addEventListener('input', () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(render, 250); });

textarea.value = EXAMPLE;
render();

// ── 重算 + 重繪 ──
function render() {
  const stages = computeStages(textarea.value, chain);

  // step0 的 tags / 取樣橫幅 / 可用 mod(不動 textarea)
  renderTags(tags0, stages[0].tags);
  renderBanner(banner0, stages[0].sampling);
  renderMods(mods0, stages[0], 0);

  // 下游:移除 step0 之後的所有節點,重建 stages[1..]
  while (flow.lastChild !== step0) flow.removeChild(flow.lastChild);
  for (let i = 1; i < stages.length; i++) {
    flow.append(arrow(), makeStep(stages[i], i));
  }
}

// 點某 step 的 mod:把它設成「該 step 往下的轉換」,並砍掉更下游(路徑改變)。再點同一個 = 取消。
function chooseMod(stepIndex, modId) {
  const same = chain[stepIndex] === modId;
  chain = chain.slice(0, stepIndex);
  if (!same) chain.push(modId);
  render();
  scrollToEnd();
}

// ── 建立唯讀 step 卡 ──
function makeStep(stage, i) {
  const card = el('div', 'step');
  const tags = el('div', 'step-tags'); renderTags(tags, stage.tags);
  card.append(tags);

  if (stage.sampling) { const b = el('div', 'banner banner-soft'); b.textContent = '⚠ 此結果基於取樣資料'; card.append(b); }

  if (stage.error) {
    const e = el('div', 'step-error'); e.textContent = '❌ ' + stage.error; card.append(e);
  } else {
    const view = el('pre', 'step-view');
    const d = capDisplay(stage.input);
    view.textContent = d.text;
    card.append(view);
    if (d.capped) { const n = el('div', 'note'); n.textContent = `(顯示前 ${d.shown} 行,共 ${d.total} 行)`; card.append(n); }
    const mods = el('div', 'step-mods'); renderMods(mods, stage, i); card.append(mods);
  }
  return card;
}

// ── 小渲染 ──
function renderTags(container, tags) {
  container.innerHTML = '';
  const lab = el('span', 'tags-label'); lab.textContent = 'tags:'; container.append(lab);
  tags.forEach((t) => { const chip = el('span', 'tag'); chip.textContent = t; container.append(chip); });
}

function renderBanner(container, sampling) {
  if (!sampling) { container.hidden = true; return; }
  container.hidden = false;
  container.textContent = `⚠ 取樣模式:資料過大,只處理前 ${sampling.usedLines} 行(共 ${sampling.totalLines} 行)`;
}

function renderMods(container, stage, i) {
  container.innerHTML = '';
  const mods = modsFor(stage.tags);
  if (!mods.length) return;
  mods.forEach((m) => {
    const b = el('button', 'mod-btn' + (chain[i] === m.id ? ' active' : ''));
    b.type = 'button'; b.textContent = m.label;
    b.addEventListener('click', () => chooseMod(i, m.id));
    container.append(b);
  });
}

function arrow() {
  const a = el('div', 'arrow');
  a.textContent = LAYOUT === 'row' ? '→' : '↓';
  return a;
}

function scrollToEnd() {
  const last = flow.lastChild;
  if (last && last.scrollIntoView) last.scrollIntoView({ behavior: 'smooth', inline: 'end', block: 'nearest' });
}

// 唯讀顯示用的上限:太長就只顯示前面,並註明(避免畫面卡死、也不讓使用者誤以為全部)
function capDisplay(text) {
  const MAX_LINES = 800, MAX_BYTES = 80000;
  const total = countLines(text);
  if (text.length <= MAX_BYTES && total <= MAX_LINES) return { text, capped: false };
  let out = text.split('\n').slice(0, MAX_LINES).join('\n');
  if (out.length > MAX_BYTES) out = out.slice(0, MAX_BYTES);
  return { text: out, capped: true, shown: Math.min(MAX_LINES, total), total };
}
