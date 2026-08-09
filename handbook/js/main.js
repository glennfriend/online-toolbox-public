// main.js — 殼層:載入 data/qa.md → 搜尋框 + tag 篩選 + 問答卡清單。
//
// 管理刻意不做在頁面上:data/qa.md 就是唯一真相(格式見 parse.js),
// 要新增/校正內容 → 改那個檔(或請 AI 改);頁面永遠唯讀。

import { parseQA, matches } from './parse.js';

const $ = (s) => document.querySelector(s);
const el = { q: $('#q'), tags: $('#tags'), list: $('#list'), status: $('#status') };

let entries = [];
let activeTag = null;   // 目前點選的 tag(單選;再點一次取消)

init();

// 離線支援:sw.js 預快取 shell、qa.md 網路優先離線退快取。失敗不影響線上。
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

async function init() {
  try {
    const res = await fetch('data/qa.md');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    entries = parseQA(await res.text());
    renderTags();
    render();
  } catch (e) {
    el.status.textContent = '資料載入失敗:' + e.message + '(第一次使用需要網路)';
  }
}

let timer;
el.q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(render, 150); });

// ── tag 列:依出現次數排序;點選 = 篩選(單選),再點 = 取消 ──
function renderTags() {
  const count = new Map();
  entries.forEach((e) => e.tags.forEach((t) => count.set(t, (count.get(t) || 0) + 1)));
  const tags = [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hant'));

  el.tags.innerHTML = '';
  for (const [tag, n] of tags) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tag' + (tag === activeTag ? ' active' : '');
    b.textContent = `${tag} ${n}`;
    b.addEventListener('click', () => { activeTag = (activeTag === tag) ? null : tag; renderTags(); render(); });
    el.tags.appendChild(b);
  }
}

// ── 清單:搜尋(空白分隔 AND)+ tag 篩選;有搜尋字時符合的卡自動展開 ──
function render() {
  const query = el.q.value.trim();
  const hits = entries.filter((e) =>
    (!activeTag || e.tags.includes(activeTag)) && (!query || matches(e, query))
  );

  el.status.textContent = (query || activeTag)
    ? `符合 ${hits.length} 筆(共 ${entries.length} 筆)`
    : `共 ${entries.length} 筆`;

  const terms = query.split(/\s+/).filter(Boolean);

  el.list.innerHTML = '';
  for (const e of hits) {
    const card = document.createElement('article');
    card.className = 'card' + (query ? ' open' : '');

    // 標題 + tags 同一行(tags 接在問題後面,最大化顯示區)
    const h = document.createElement('h2');
    h.className = 'card-q';
    appendMarked(h, e.q, terms);
    e.tags.forEach((t) => { const s = document.createElement('span'); s.className = 'qtag'; s.textContent = t; h.appendChild(s); });
    h.addEventListener('click', () => card.classList.toggle('open'));

    const a = document.createElement('div');
    a.className = 'card-a';
    appendMarked(a, e.a, terms);             // 純文字 + CSS pre-line,只有命中的字被包進 .hl

    card.append(h, a);
    el.list.appendChild(card);
  }
  if (!hits.length && entries.length) {
    el.list.innerHTML = '<p class="empty">沒有符合的資料。</p>';
  }
}

// ── 搜尋字highlight ──
// 把 text 接到 el 底下,命中搜尋詞的片段用 <span class="hl"> 包起來。
// 全程 createTextNode / createElement,不碰 innerHTML —— 內容依然當純文字處理,
// 不會因為加了 highlight 就變成可被注入 HTML 的破口。
function appendMarked(el, text, terms) {
  const ranges = matchRanges(text, terms);
  if (!ranges.length) { el.appendChild(document.createTextNode(text)); return; }
  let at = 0;
  for (const [s, e] of ranges) {
    if (s > at) el.appendChild(document.createTextNode(text.slice(at, s)));
    const m = document.createElement('span');
    m.className = 'hl';
    m.textContent = text.slice(s, e);
    el.appendChild(m);
    at = e;
  }
  if (at < text.length) el.appendChild(document.createTextNode(text.slice(at)));
}

// 找出所有搜尋詞在 text 裡的位置(不分大小寫),重疊的併成一段,並依位置排序。
function matchRanges(text, terms) {
  if (!terms.length) return [];
  // 少數字元轉小寫後長度會變(例如 İ → i̇),那樣索引會對不上原字串。
  // 遇到就退回「區分大小寫」比對,寧可少 highlight 幾個字,也不要標錯位置。
  let hay = text.toLowerCase();
  const caseSensitive = hay.length !== text.length;
  if (caseSensitive) hay = text;

  const hits = [];
  for (const t of terms) {
    const needle = caseSensitive ? t : t.toLowerCase();
    if (!needle) continue;
    let i = hay.indexOf(needle);
    while (i !== -1) { hits.push([i, i + needle.length]); i = hay.indexOf(needle, i + needle.length); }
  }
  if (!hits.length) return [];

  hits.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const out = [hits[0]];
  for (let i = 1; i < hits.length; i++) {
    const last = out[out.length - 1];
    if (hits[i][0] <= last[1]) last[1] = Math.max(last[1], hits[i][1]);   // 兩個詞重疊 → 併成一段
    else out.push(hits[i]);
  }
  return out;
}
