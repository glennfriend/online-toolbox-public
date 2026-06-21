// main.js — 殼層:載入字典 → 輸入框自動完成(Tab 補完 / Enter 查詢)→ 渲染字典卡。
//
// 顯示哪些「角度」由各 render 函式決定,目前 v1:發音 / 常用度 / 各詞性的定義與例句。
// 日後加新角度(同義 / 易混淆 / 押韻…)= 在 lookup 多查一張表 + 多一個 render 區塊,主流程不動。

import { db } from './db.js';
import { pronounce, prefetch } from './pronounce.js';

const MIN_PREFIX = 2;   // 打幾個字開始自動完成(2 比 4 好:短字也查得到、索引查詢本來就即時)
const MAX_SUGGEST = 10;

const $ = (s) => document.querySelector(s);
const input = $('#word');
const sugBox = $('#suggest');
const entryBox = $('#entry');
const statusEl = $('#status');
const versionEl = $('#version');
const rebuildBtn = $('#rebuild');

let ready = false;
let suggestions = [];
let active = -1;        // 目前選取的建議索引(-1 = 無)

boot();

async function boot() {
  setStatus('載入字典中…(第一次約 11MB,只載這一次,之後免下載)');
  try {
    const manifest = await (await fetch('data/manifest.json?t=' + Date.now())).json();
    const dbUrl = new URL('data/' + manifest.db, location.href).href;
    const res = await db.init(dbUrl, manifest.version);
    ready = true;
    setStatus('');
    versionEl.textContent = `資料版本 ${res.version}・${(res.counts.words || 0).toLocaleString()} 字` +
      (res.downloaded ? '(剛下載)' : '(本機快取)');
    input.disabled = false;
    input.focus();
  } catch (e) {
    setStatus('字典載入失敗:' + e.message);
  }
}

// ── 輸入 / 自動完成 ──
let t;
input.addEventListener('input', () => {
  clearTimeout(t);
  t = setTimeout(runSuggest, 100);
});

async function runSuggest() {
  if (!ready) return;
  const prefix = input.value.trim();
  if (prefix.length < MIN_PREFIX) return closeSuggest();
  try {
    const { words } = await db.suggest(prefix, MAX_SUGGEST);
    suggestions = words;
    active = -1;
    renderSuggest();
  } catch (_) { closeSuggest(); }
}

input.addEventListener('keydown', (e) => {
  const open = suggestions.length > 0 && !sugBox.hidden;
  if (e.key === 'ArrowDown' && open) { e.preventDefault(); active = (active + 1) % suggestions.length; renderSuggest(); }
  else if (e.key === 'ArrowUp' && open) { e.preventDefault(); active = (active <= 0 ? suggestions.length : active) - 1; renderSuggest(); }
  else if (e.key === 'Tab') {
    // 補完:填入選取(或第一個)建議,不查詢
    if (open) { e.preventDefault(); input.value = suggestions[active >= 0 ? active : 0]; closeSuggest(); }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const word = (open && active >= 0) ? suggestions[active] : input.value.trim();
    if (word) { input.value = word; closeSuggest(); search(word); }
  } else if (e.key === 'Escape') {
    closeSuggest();
  }
});

document.addEventListener('click', (e) => { if (!e.target.closest('.search-box')) closeSuggest(); });

function renderSuggest() {
  if (!suggestions.length) return closeSuggest();
  sugBox.innerHTML = '';
  suggestions.forEach((w, i) => {
    const item = document.createElement('div');
    item.className = 'suggest-item' + (i === active ? ' active' : '');
    item.textContent = w;
    item.addEventListener('mousedown', (ev) => { ev.preventDefault(); input.value = w; closeSuggest(); search(w); });
    sugBox.appendChild(item);
  });
  sugBox.hidden = false;
}

function closeSuggest() { sugBox.hidden = true; sugBox.innerHTML = ''; suggestions = []; active = -1; }

// ── 查詢 + 渲染 ──
async function search(word) {
  entryBox.innerHTML = '';
  try {
    const { entry } = await db.lookup(word);
    if (!entry) { entryBox.innerHTML = `<div class="empty">查無此字「${esc(word)}」</div>`; return; }
    renderEntry(entry);
  } catch (e) {
    entryBox.innerHTML = `<div class="empty">查詢失敗:${esc(e.message)}</div>`;
  }
}

function renderEntry(entry) {
  const head = document.createElement('div');
  head.className = 'entry-head';
  const cam = 'https://dictionary.cambridge.org/dictionary/english/' + encodeURIComponent(entry.word);
  const parts = [`<span class="headword">${esc(entry.word)}</span>`];
  parts.push(`<button class="speak" type="button" title="發音" aria-label="發音">🔊</button>`);
  if (entry.ipa) parts.push(`<span class="ipa">/${esc(entry.ipa)}/</span>`);
  parts.push(`<a class="more-pron" href="${cam}" target="_blank" rel="noopener">劍橋發音 ↗</a>`);
  parts.push(`<span class="freq">${freqLabel(entry.freq)}</span>`);
  head.innerHTML = parts.join('');
  head.querySelector('.speak').addEventListener('click', () => pronounce(entry.word));
  prefetch(entry.word);   // 先抓真人錄音網址,讓點擊能即時播
  entryBox.appendChild(head);

  // 繁中釋義(主角:看不懂英文時先看這個);可能含多行(不同詞性)
  if (entry.cn) {
    const cn = document.createElement('div');
    cn.className = 'cn';
    cn.innerHTML = String(entry.cn).split('\n').map((l) => esc(l.trim())).filter(Boolean).map((l) => `<div>${l}</div>`).join('');
    entryBox.appendChild(cn);
  }

  // 難度標籤(國中 / 高中 / 四級 / 六級 / 考研 / TOEFL / IELTS / GRE)
  if (entry.tag) {
    const TAGS = { zk: '國中', gk: '高中', cet4: '四級', cet6: '六級', ky: '考研', toefl: 'TOEFL', ielts: 'IELTS', gre: 'GRE' };
    const badges = entry.tag.split(/\s+/).filter(Boolean).map((t) => `<span class="tag-badge">${esc(TAGS[t] || t)}</span>`).join('');
    if (badges) { const box = document.createElement('div'); box.className = 'tags'; box.innerHTML = badges; entryBox.appendChild(box); }
  }

  // 依詞性分組(連續相同 pos 併為一組)
  let curPos = null, list = null;
  entry.meanings.forEach((m) => {
    if (m.pos !== curPos) {
      curPos = m.pos;
      const group = document.createElement('div');
      group.className = 'pos-group';
      group.innerHTML = `<div class="pos">${esc(m.pos || '—')}</div>`;
      list = document.createElement('ol'); list.className = 'defs';
      group.appendChild(list);
      entryBox.appendChild(group);
    }
    const li = document.createElement('li');
    li.innerHTML = `<span class="def">${esc(m.definition)}</span>` +
      (m.example ? `<span class="eg">“${esc(m.example)}”</span>` : '');
    list.appendChild(li);
  });
}

// 詞頻 → 常用度標籤(粗略分級;0 表示不在詞頻表)
function freqLabel(f) {
  if (!f) return '常用度 —';
  if (f > 1e8) return '常用度 ★★★★★';
  if (f > 1e7) return '常用度 ★★★★';
  if (f > 1e6) return '常用度 ★★★';
  if (f > 1e5) return '常用度 ★★';
  return '常用度 ★';
}

rebuildBtn.addEventListener('click', async () => {
  if (!confirm('清除本機快取的字典資料?下次會重新下載最新版。')) return;
  try { await db.clear(); location.reload(); }
  catch (e) { setStatus('清除失敗:' + e.message); }
});

function setStatus(text) { statusEl.textContent = text; statusEl.hidden = !text; }
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
