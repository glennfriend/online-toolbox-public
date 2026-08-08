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

  el.list.innerHTML = '';
  for (const e of hits) {
    const card = document.createElement('article');
    card.className = 'card' + (query ? ' open' : '');

    const h = document.createElement('h2');
    h.className = 'card-q';
    h.textContent = e.q;
    h.addEventListener('click', () => card.classList.toggle('open'));

    const tagRow = document.createElement('div');
    tagRow.className = 'card-tags';
    e.tags.forEach((t) => { const s = document.createElement('span'); s.textContent = t; tagRow.appendChild(s); });

    const a = document.createElement('div');
    a.className = 'card-a';
    a.textContent = e.a;                     // textContent + CSS pre-line:內容永遠當純文字,安全又保留換行

    card.append(h, tagRow, a);
    el.list.appendChild(card);
  }
  if (!hits.length && entries.length) {
    el.list.innerHTML = '<p class="empty">沒有符合的資料。</p>';
  }
}
