// main.js — 殼層:載入字典 → 兩個輸入框(commit 按 Enter / live 即時)→ 共用字典卡。
//
// 每個輸入框是一個獨立的 SearchBox 控制器(mode='commit'|'live'),共用同一個渲染與發音。
// 要拿掉 A/B 對比時:刪掉其中一欄的 HTML + 對應的 makeSearch(...) 呼叫即可,互不影響。

import { db } from './db.js';
import { pronounce } from './pronounce.js';

const MIN_PREFIX = 2;   // 打幾個字開始自動完成
const MAX_SUGGEST = 10;

const $ = (s) => document.querySelector(s);
const entryBox = $('#entry');
const statusEl = $('#status');
const versionEl = $('#version');
const rebuildBtn = $('#rebuild');

let ready = false;
let lastSearch = 0;   // 防舊鎖:多個查詢競態時,只讓最後一次寫畫面
let currentEntry = null;   // 目前顯示的字(切換分頁時用來重繪)

// 詞性中文(tab hover 顯示);未收錄的就原樣
const POS_ZH = {
  noun: '名詞', verb: '動詞', adjective: '形容詞', adverb: '副詞', pronoun: '代名詞',
  preposition: '介系詞', conjunction: '連接詞', interjection: '感嘆詞', determiner: '限定詞',
  article: '冠詞', numeral: '數詞', 'proper noun': '專有名詞',
};

// 分頁顯示模式(切換鍵狀態,記在 localStorage,回到網頁會記得)
let tabsMode = false;
try { tabsMode = localStorage.getItem('dict-tabs') === '1'; } catch (_) {}

// 網址跟著查到的字變化:…/dictionary/book(只算一次基底目錄)
const BASE = new URL('.', location.href);
function setUrl(word) {
  try { history.replaceState(null, '', new URL(encodeURIComponent(word), BASE).pathname); } catch (_) {}
}
// 開頁時從網址取要查的字:支援 ?w=book(404 轉址用)與 …/dictionary/book(直接路徑)
function initialWordFromUrl() {
  const q = new URLSearchParams(location.search).get('w');
  if (q) return q.trim();
  const rest = location.pathname.startsWith(BASE.pathname) ? location.pathname.slice(BASE.pathname.length) : '';
  const seg = decodeURIComponent((rest.split('/')[0] || '').trim());
  return (seg && seg !== 'index.html') ? seg : '';
}

boot();

async function boot() {
  setStatus('載入字典中…(第一次約 13MB,只載這一次,之後免下載)');
  try {
    const manifest = await (await fetch('data/manifest.json?t=' + Date.now())).json();
    const dbUrl = new URL('data/' + manifest.db, location.href).href;
    const res = await db.init(dbUrl, manifest.version);
    ready = true;
    setStatus('');
    versionEl.textContent = `資料版本 ${res.version}・${(res.counts.words || 0).toLocaleString()} 字` +
      (res.downloaded ? '(剛下載)' : '(本機快取)');
    boxes.forEach((b) => b.enable());
    const iw = initialWordFromUrl();
    if (iw) boxes[0].query(iw);   // 直接開 …/dictionary/book 或 ?w=book → 先查它
    boxes[0].focus();
  } catch (e) {
    setStatus('字典載入失敗:' + e.message);
  }
}

// ── 共用:查詢 + 渲染字典卡 ──
// quiet:true → 查不到就「什麼都不做」(即時模式用:沒命中就保留前一個結果)
function search(word, { quiet = false } = {}) {
  const w = (word || '').trim();
  if (!w) return;
  const my = ++lastSearch;
  db.lookup(w).then(({ entry }) => {
    if (my !== lastSearch) return;            // 已有更新的查詢 → 丟棄這次舊結果
    if (!entry) { if (!quiet) entryBox.innerHTML = `<div class="empty">查無此字「${esc(w)}」</div>`; return; }
    renderEntry(entry);
  }).catch((e) => { if (my === lastSearch && !quiet) entryBox.innerHTML = `<div class="empty">查詢失敗:${esc(e.message)}</div>`; });
}

function renderEntry(entry) {
  currentEntry = entry;
  entryBox.innerHTML = '';
  setUrl(entry.word);   // 查到真的字 → 網址跟著變

  const head = document.createElement('div');
  head.className = 'entry-head';
  const cam = 'https://dictionary.cambridge.org/dictionary/english/' + encodeURIComponent(entry.word);
  const parts = [`<span class="headword">${esc(entry.word)}</span>`];
  parts.push(`<button class="speak" type="button" title="發音" aria-label="發音">🔊</button>`);
  if (entry.ipa) parts.push(`<span class="ipa">/${esc(entry.ipa)}/</span>`);
  parts.push(`<a class="more-pron" href="${cam}" target="_blank" rel="noopener">劍橋發音 ↗</a>`);
  parts.push(`<span class="freq">${freqLabel(entry.freq)}</span>`);
  head.innerHTML = parts.join('');
  head.querySelector('.speak').addEventListener('click', () => pronounce(entry.word));  // 點了才打發音 API
  entryBox.appendChild(head);

  if (entry.cn) {
    const cn = document.createElement('div');
    cn.className = 'cn';
    cn.innerHTML = String(entry.cn).split('\n').map((l) => esc(l.trim())).filter(Boolean).map((l) => `<div>${l}</div>`).join('');
    entryBox.appendChild(cn);
  }

  if (entry.tag) {
    const TAGS = { zk: '國中', gk: '高中', cet4: '四級', cet6: '六級', ky: '考研', toefl: 'TOEFL', ielts: 'IELTS', gre: 'GRE' };
    const badges = entry.tag.split(/\s+/).filter(Boolean).map((t) => `<span class="tag-badge">${esc(TAGS[t] || t)}</span>`).join('');
    if (badges) { const box = document.createElement('div'); box.className = 'tags'; box.innerHTML = badges; entryBox.appendChild(box); }
  }

  // 依詞性分組(保留出現順序)
  const groups = [];
  const at = new Map();
  entry.meanings.forEach((m) => {
    const key = m.pos || '—';
    if (!at.has(key)) { at.set(key, groups.length); groups.push({ pos: key, items: [] }); }
    groups[at.get(key)].items.push(m);
  });
  if (!groups.length) return;

  const defsList = (items) => {
    const ol = document.createElement('ol'); ol.className = 'defs';
    items.forEach((m) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="def">${esc(m.definition)}</span>` + (m.example ? `<span class="eg">“${esc(m.example)}”</span>` : '');
      ol.appendChild(li);
    });
    return ol;
  };

  if (tabsMode) {
    // 分頁:tab 列(滑過即切換、hover 顯示中文詞性)+ 單一內容面板
    const strip = document.createElement('div'); strip.className = 'tabs-strip';
    const panel = document.createElement('div'); panel.className = 'tab-panel';
    const show = (g, tab) => { strip.querySelectorAll('.tab').forEach((t) => t.classList.remove('active')); tab.classList.add('active'); panel.innerHTML = ''; panel.appendChild(defsList(g.items)); };
    groups.forEach((g, i) => {
      const tab = document.createElement('div');
      tab.className = 'tab' + (i === 0 ? ' active' : '');
      tab.textContent = g.pos;
      tab.title = POS_ZH[g.pos] || g.pos;
      const act = () => show(g, tab);
      tab.addEventListener('mouseenter', act);   // 移到哪個就切哪個(不用點)
      tab.addEventListener('click', act);
      strip.appendChild(tab);
    });
    entryBox.appendChild(strip); entryBox.appendChild(panel);
    panel.appendChild(defsList(groups[0].items));
  } else {
    // 堆疊:每個詞性一張卡
    groups.forEach((g) => {
      const group = document.createElement('div'); group.className = 'pos-group';
      group.innerHTML = `<div class="pos">${esc(g.pos)}</div>`;
      group.appendChild(defsList(g.items));
      entryBox.appendChild(group);
    });
  }
}

function freqLabel(f) {
  if (!f) return '常用度 —';
  if (f > 1e8) return '常用度 ★★★★★';
  if (f > 1e7) return '常用度 ★★★★';
  if (f > 1e6) return '常用度 ★★★';
  if (f > 1e5) return '常用度 ★★';
  return '常用度 ★';
}

// ── 一個輸入框的控制器(自動完成 + 鍵盤 + 依模式查詢)──
function makeSearch(boxEl) {
  const mode = boxEl.dataset.mode;          // 'commit' | 'live'
  const input = boxEl.querySelector('.word');
  const sugBox = boxEl.querySelector('.suggest');
  const goBtn = boxEl.querySelector('.go-btn');
  let suggestions = [], active = -1, t;

  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(onType, 120); });

  async function onType() {
    if (!ready) return;
    const v = input.value.trim();
    if (v.length >= MIN_PREFIX) {
      try { const { words } = await db.suggest(v, MAX_SUGGEST); suggestions = words; active = -1; renderSuggest(); }
      catch (_) { closeSuggest(); }
    } else closeSuggest();
    if (mode === 'live' && v) search(v, { quiet: true });   // 即時:命中才換,沒命中保留前一個
  }

  input.addEventListener('keydown', (e) => {
    const open = suggestions.length > 0 && !sugBox.hidden;
    if (e.key === 'ArrowDown' && open) { e.preventDefault(); active = (active + 1) % suggestions.length; renderSuggest(); preview(); }
    else if (e.key === 'ArrowUp' && open) { e.preventDefault(); active = (active <= 0 ? suggestions.length : active) - 1; renderSuggest(); preview(); }
    else if (e.key === 'Tab') { if (open) { e.preventDefault(); input.value = suggestions[active >= 0 ? active : 0].word; closeSuggest(); if (mode === 'live') search(input.value); } }
    else if (e.key === 'Enter') { e.preventDefault(); const w = (open && active >= 0) ? suggestions[active].word : input.value.trim(); if (w) { input.value = w; closeSuggest(); search(w); } }
    else if (e.key === 'Escape') closeSuggest();
  });

  if (goBtn) goBtn.addEventListener('click', () => { const w = input.value.trim(); if (w) { closeSuggest(); search(w); } });

  function renderSuggest() {
    if (!suggestions.length) return closeSuggest();
    sugBox.innerHTML = '';
    suggestions.forEach((s, i) => {
      const item = document.createElement('div');
      item.className = 'suggest-item' + (i === active ? ' active' : '');
      // 英文(左)+ 中文(右);中文整行不斷行,超出下拉右緣由 CSS overflow 直接切掉
      item.innerHTML = `<span class="sw">${esc(s.word)}</span>` + (s.cn ? `<span class="sc">${esc(s.cn.replace(/\n/g, ' / '))}</span>` : '');
      item.addEventListener('mousedown', (ev) => { ev.preventDefault(); input.value = s.word; closeSuggest(); search(s.word); });
      sugBox.appendChild(item);
    });
    sugBox.hidden = false;
  }
  function closeSuggest() { sugBox.hidden = true; sugBox.innerHTML = ''; suggestions = []; active = -1; }
  // 方向鍵移到反白項時,即時預覽該字(本機查詢、不打外部;quiet:查不到也不報錯)
  function preview() { if (active >= 0 && suggestions[active]) search(suggestions[active].word, { quiet: true }); }

  return {
    enable: () => { input.disabled = false; },
    focus: () => input.focus(),
    query: (w) => { input.value = w; closeSuggest(); search(w); },
  };
}

const boxes = [...document.querySelectorAll('.search-box')].map(makeSearch);

// 點到搜尋框以外 → 關掉所有下拉
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-box')) document.querySelectorAll('.suggest').forEach((s) => { s.hidden = true; s.innerHTML = ''; });
});

// 分頁切換鍵:狀態記在 localStorage;切換時把目前這個字重繪成新版面
const tabsToggle = document.querySelector('#tabs-toggle');
tabsToggle.checked = tabsMode;
tabsToggle.addEventListener('change', () => {
  tabsMode = tabsToggle.checked;
  try { localStorage.setItem('dict-tabs', tabsMode ? '1' : '0'); } catch (_) {}
  if (currentEntry) renderEntry(currentEntry);
});

rebuildBtn.addEventListener('click', async () => {
  if (!confirm('清除本機快取的字典資料?下次會重新下載最新版。')) return;
  try { await db.clear(); location.reload(); }
  catch (e) { setStatus('清除失敗:' + e.message); }
});

function setStatus(text) { statusEl.textContent = text; statusEl.hidden = !text; }
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
