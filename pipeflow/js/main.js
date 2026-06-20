// main.js — 殼層:水平步驟列、輸入(debounce)重算、取樣/上限的明確提示、串接 tags 與 mods。
//
// step0 是可編輯的輸入框;之後每個 step 是唯讀的轉換結果。改 step0 → 下游全部跟著重算。
// 版面方向用 LAYOUT 常數控制(目前左到右);改成上到下只要改這個常數 + CSS,step 邏輯不動。

import { computeStages } from './pipeline.js';
import { modsFor, getMod } from './mods/index.js';
import { tagDesc, tagHidden } from './tags/index.js';
import { countLines } from './lib/sample.js';
import { el } from './lib/dom.js';
import './tags/defs.js';     // 註冊 tags
import './mods/convert.js';  // 以下註冊 mods
import './mods/sort.js';
import './mods/json.js';
import './mods/stats.js';
import './mods/urls.js';
import './mods/diagram.js';   // 渲染類(Mermaid,外部 CDN)
import './mods/groupby.js';   // 分組加總(純 JS)
import './mods/schema.js';    // SQL Schema → ER 圖(純文字 → mermaid)
import './mods/sql.js';       // SQL 查詢(DuckDB-Wasm,外部 CDN;參數化 + 非同步)
import './mods/translate.js'; // 翻譯(Google 非官方端點 + MyMemory 備援;參數化 + 非同步)
import { EXAMPLES } from './examples.js';

const LAYOUT = 'row'; // 'row' = 左到右(可改 'col' 上到下;見 styles.css 與 arrowIcon)

const flow = document.querySelector('#flow');
flow.classList.add(LAYOUT === 'row' ? 'flow-row' : 'flow-col');

let chain = [];        // 選定的 mod 序列;每項 { id, param }(param 給參數化 mod,如 SQL 查詢)
let renderToken = 0;   // 非同步重算的防舊鎖:只讓最新一次 render 寫畫面

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

// 非同步處理(如 SQL/DuckDB、Mermaid 載入)時的「處理中…」指示,避免看起來像凍住
const statusEl = el('div', 'flow-status');
document.querySelector('.head').append(statusEl);
let busyTimer;

let debounceTimer;
textarea.addEventListener('input', () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(render, 250); });

buildExamples();
textarea.value = EXAMPLES[0].data;   // 預設帶第一個範例,一開啟就看得到
render();

// 範例按鈕:一點就載入,並清掉舊管線從頭開始
function buildExamples() {
  const bar = document.querySelector('#examples');
  EXAMPLES.forEach((ex) => {
    const b = el('button', 'ex-btn'); b.type = 'button'; b.textContent = ex.label;
    // 範例可預設一條管線(ex.chain),複製一份避免改到常數
    b.addEventListener('click', () => { chain = (ex.chain || []).map((c) => ({ ...c })); textarea.value = ex.data; render(); });
    bar.append(b);
  });
}

// ── 重算 + 重繪(非同步:有些 mod 如 SQL 要等外部 DuckDB)──
async function render() {
  const token = ++renderToken;
  // 若 200ms 內還沒算完(通常是等外部 SQL/Mermaid),顯示「處理中…」
  clearTimeout(busyTimer);
  busyTimer = setTimeout(() => { if (token === renderToken) statusEl.textContent = '處理中…(外部資源)'; }, 200);

  const stages = await computeStages(textarea.value, chain);
  if (token !== renderToken) return; // 期間又有新的 render → 丟棄這次舊結果
  clearTimeout(busyTimer); statusEl.textContent = '';

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
  const same = chain[stepIndex] && chain[stepIndex].id === modId;
  chain = chain.slice(0, stepIndex);
  if (!same) {
    const mod = getMod(modId);
    chain.push({ id: modId, param: mod && mod.param ? (mod.defaultParam || '') : undefined });
  }
  render();
  scrollToEnd();
}

// ── 建立唯讀 step 卡 ──
function makeStep(stage, i) {
  const card = el('div', 'step');
  const tags = el('div', 'step-tags'); renderTags(tags, stage.tags);
  card.append(tags);

  if (stage.sampling) { const b = el('div', 'banner banner-soft'); b.textContent = '⚠ 此結果基於取樣資料'; card.append(b); }

  // 這一步是由哪個 mod 產生的 → 顯示外部資源徽章 / 參數編輯器
  const srcMod = stage.srcMod ? getMod(stage.srcMod) : null;
  if (srcMod && srcMod.external) {
    const badge = el('div', 'ext-badge'); badge.textContent = '使用外部資源:' + srcMod.external; card.append(badge);
  }
  if (srcMod && srcMod.param) {
    const bar = el('div', 'param-bar');
    const pin = el('textarea', 'param-input'); pin.value = stage.param || ''; pin.spellcheck = false;
    if (srcMod.paramLabel) pin.placeholder = srcMod.paramLabel;
    const run = el('button', 'mod-btn'); run.type = 'button'; run.textContent = '執行';
    run.addEventListener('click', () => { chain[stage.chainIndex].param = pin.value; render(); });
    bar.append(pin, run); card.append(bar);
  }

  if (stage.error) {
    const e = el('div', 'step-error'); e.textContent = '❌ ' + stage.error; card.append(e);
  } else if (stage.renderId) {
    // 渲染類步驟:用圖顯示(資料仍是原本的文字)
    const dia = el('div', 'step-diagram');
    card.append(dia);
    const mod = getMod(stage.renderId);
    if (mod && mod.render) mod.render(stage.input, dia);   // 非同步畫圖,內部自理錯誤
    const mods = el('div', 'step-mods'); renderMods(mods, stage, i); card.append(mods);
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
  tags.filter((t) => !tagHidden(t)).forEach((t) => {
    const chip = el('span', 'tag'); chip.textContent = t; chip.title = tagDesc(t); container.append(chip);
  });
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
    const b = el('button', 'mod-btn' + (chain[i] && chain[i].id === m.id ? ' active' : ''));
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
