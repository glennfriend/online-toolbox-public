// main.js — 殼層:載入字典 → 搜尋框(即時 + Enter)→ 渲染詞條卡 / 整句切詞 / 漢字卡。
//
// 分工:查詢邏輯全在 worker(db.worker.js),這裡只管 UI。
// 渲染拆成小函式(renderCard / renderZh / renderSenses / renderPitch / renderKanji),要加新「角度」= 多一個函式。

import { db } from './db.js';
import { pronounce, hasJapaneseVoice } from './pronounce.js';
import { POS, MISC, FIELD, DIAL, LANG, GLOSS_TYPE, WK_POS, WK_TAG, label } from './labels.js';

const MIN_PREFIX = 1;   // 日文一個字就能補完(英文/羅馬字在 worker 端另判)
const MAX_SUGGEST = 10;

const $ = (s) => document.querySelector(s);
const resultBox = $('#entry');
const statusEl = $('#status');
const versionEl = $('#version');
const rebuildBtn = $('#rebuild');

let ready = false;
let lastSearch = 0;      // 防舊鎖:多個查詢競態時,只讓最後一次寫畫面
let ENT = {};            // JMdict 代碼 → 英文說明(中文標籤沒列到時的退路)

// 網址跟著查詢變化:…/jdict/食べる(只算一次基底目錄)
const BASE = new URL('.', location.href);
function setUrl(q) {
  try { history.replaceState(null, '', new URL(encodeURIComponent(q), BASE).pathname); } catch (_) {}
}
// 開頁時從網址取要查的字:支援 ?w=…(404 轉址用)與 …/jdict/…(直接路徑)
function initialQueryFromUrl() {
  const q = new URLSearchParams(location.search).get('w');
  if (q) return q.trim();
  const rest = location.pathname.startsWith(BASE.pathname) ? location.pathname.slice(BASE.pathname.length) : '';
  const seg = decodeURIComponent((rest.split('/')[0] || '').trim());
  return (seg && seg !== 'index.html') ? seg : '';
}

boot();

// 離線支援:sw.js 讓 shell 離線可開;persist() 降低 OPFS 被瀏覽器清掉的機率(盡力而為)。
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

async function boot() {
  setStatus('載入字典中…(第一次約 26MB,只載這一次,之後免下載)');
  try {
    const manifest = await (await fetch('data/manifest.json?t=' + Date.now())).json();
    const dbUrl = new URL('data/' + manifest.db, location.href).href;
    onReady(await db.init(dbUrl, manifest.version), '');
  } catch (e) {
    // 拿不到 manifest(離線 / 伺服器掛)→ 退用 OPFS 既有資料;連本機都沒有才算真的失敗
    try {
      onReady(await db.openLocal(), '・離線(未檢查更新)');
    } catch (_) {
      setStatus('字典載入失敗:' + e.message + '(本機也沒有既有資料 —— 第一次使用需要網路)');
    }
  }

  function onReady(res, suffix) {
    ready = true;
    ENT = res.entities || {};
    setStatus('');
    const c = res.counts || {};
    versionEl.textContent = `資料版本 ${res.version}・${(c.entries || 0).toLocaleString()} 詞條・繁中 ${(c.zh || 0).toLocaleString()}` +
      (res.downloaded ? '(剛下載)' : '(本機快取)') + suffix;
    // 下載完成後請求持久化(Firefox 會詢問使用者;Chrome 自動判斷)
    if (res.downloaded && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    box.enable();
    const iq = initialQueryFromUrl();
    if (iq) box.query(iq);
    box.focus();
  }
}

// ── 查詢 + 渲染 ──
// quiet:true → 查不到就保留前一個結果(即時模式用)
function search(q, { quiet = false } = {}) {
  const w = (q || '').trim();
  if (!w) return;
  const my = ++lastSearch;
  db.lookup(w).then((res) => {
    if (my !== lastSearch) return;
    if (!res.groups.length && !res.segments) {
      if (!quiet) resultBox.innerHTML = `<div class="empty">查無「${esc(w)}」</div>`;
      return;
    }
    render(res, w);
    setUrl(w);
  }).catch((e) => { if (my === lastSearch && !quiet) resultBox.innerHTML = `<div class="empty">查詢失敗:${esc(e.message)}</div>`; });
}

function openEntry(id, head) {
  const my = ++lastSearch;
  db.entry(id).then((res) => { if (my === lastSearch) { render(res, head); setUrl(head); } });
}

const GROUP_TITLE = { deinflect: '活用還原', english: '英文意思符合' };

function render(res, q) {
  resultBox.innerHTML = '';
  if (res.segments) resultBox.appendChild(renderSegments(res.segments));
  for (const g of res.groups) {
    if (GROUP_TITLE[g.kind]) {
      const h = document.createElement('div');
      h.className = 'group-title';
      h.textContent = GROUP_TITLE[g.kind];
      resultBox.appendChild(h);
    }
    g.entries.forEach((e) => resultBox.appendChild(renderCard(e)));
  }
  if (res.kanji && res.kanji.length) resultBox.appendChild(renderKanji(res.kanji));
}

// 整句切詞:每段一顆按鈕,點了查那段(活用形查原形)
function renderSegments(segs) {
  const box = document.createElement('div');
  box.className = 'segments';
  segs.forEach((s) => {
    if (s.plain || !s.base) { const sp = document.createElement('span'); sp.className = 'seg-plain'; sp.textContent = s.text; box.appendChild(sp); return; }
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'seg';
    b.textContent = s.text;
    if (s.reasons) b.title = `${s.base}(${s.reasons.join(' → ')})`;
    b.addEventListener('click', () => {
      box.querySelectorAll('.seg').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      const my = ++lastSearch;
      db.lookup(s.text).then((r) => {
        if (my !== lastSearch) return;
        const keep = box;
        render({ ...r, segments: null }, s.text);
        resultBox.prepend(keep);
      });
    });
    box.appendChild(b);
  });
  const first = box.querySelector('.seg');
  if (first) first.classList.add('active');
  return box;
}

// 讀音是否適用於某寫法(re_restr)
const readingFor = (data, head) => data.r.find((r) => !r.rs || r.rs.includes(head)) || data.r[0];

function renderCard(e) {
  const d = e.data;
  const card = document.createElement('div');
  card.className = 'card';

  const read = readingFor(d, e.head);
  const kanaOnly = e.head === read.t;
  const uk = d.s.length && d.s.every((s) => (s.m || []).includes('uk'));

  // 標題列:寫法(上方振假名)/ 🔊 / 音調 / 常用
  const head = document.createElement('div');
  head.className = 'entry-head';
  head.innerHTML =
    (kanaOnly ? `<span class="headword">${esc(e.head)}</span>`
              : `<ruby class="headword">${esc(e.head)}<rt>${esc(read.t)}</rt></ruby>`) +
    `<button class="speak" type="button" title="發音" aria-label="發音">🔊</button>` +
    renderPitch(e.pitch, read.t, kanaOnly ? '' : e.head) +
    (e.rank <= 50 ? '<span class="badge common">常用</span>' : '') +
    (uk && !kanaOnly ? '<span class="badge">通常寫假名</span>' : '');
  head.querySelector('.speak').addEventListener('click', async (ev) => {
    const btn = ev.currentTarget;
    const how = await pronounce(kanaOnly ? '' : e.head, read.t);
    if (how === 'speech-novoice' || how === 'none') btn.title = '這台裝置沒有日語語音(可在系統設定安裝日語語音)';
  });
  card.appendChild(head);

  if (e.deinf) {
    const n = document.createElement('div');
    n.className = 'deinf';
    n.textContent = `「${e.deinf.from}」← ${e.deinf.base}:${e.deinf.reasons.join(' → ')}`;
    card.appendChild(n);
  }

  if (e.zh) card.appendChild(renderZh(e.zh));
  card.appendChild(renderSenses(d.s, !!e.zh));

  // 其他寫法 / 讀音(不含僅供搜尋的)
  const otherK = d.k.filter((k) => k.t !== e.head && !(k.i || []).some((i) => i === 'sK'));
  const otherR = d.r.filter((r) => r.t !== read.t && !(r.i || []).some((i) => i === 'sk'));
  if (otherK.length || otherR.length) {
    const f = document.createElement('div');
    f.className = 'forms';
    const fmt = (x) => esc(x.t) + ((x.i || []).length ? `<span class="tag">${x.i.map((i) => esc(label(MISC, i, ENT))).join('・')}</span>` : '');
    f.innerHTML = (otherK.length ? `<span class="forms-h">其他寫法</span>${otherK.map(fmt).join('、')}` : '') +
                  (otherR.length ? `<span class="forms-h">其他讀音</span>${otherR.map(fmt).join('、')}` : '');
    card.appendChild(f);
  }
  return card;
}

// 中文釋義(中文維基詞典)
function renderZh(zh) {
  const box = document.createElement('div');
  box.className = 'zh';
  zh.forEach((grp) => {
    const sec = document.createElement('div');
    sec.className = 'zh-group';
    sec.innerHTML = `<div class="zh-pos">${esc(WK_POS[grp.pos] || grp.pos)}</div>`;
    const ol = document.createElement('ol');
    grp.senses.forEach((s) => {
      const li = document.createElement('li');
      const tags = [...(s.tags || []).map((t) => WK_TAG[t] || t), ...(s.raw || [])];
      li.innerHTML = (tags.length ? `<span class="tag">${tags.map(esc).join('・')}</span>` : '') + esc(s.g) +
        (s.ex || []).map(([ja, zhT]) => `<span class="eg"><span class="eg-ja">${esc(ja)}</span>${esc(zhT)}</span>`).join('');
      ol.appendChild(li);
    });
    sec.appendChild(ol);
    box.appendChild(sec);
  });
  const src = document.createElement('div');
  src.className = 'src';
  src.textContent = '中文:中文維基詞典(CC BY-SA)';
  box.appendChild(src);
  return box;
}

// 英文義項(JMdict);有中文時預設收合成一行標題,點開看
function renderSenses(senses, collapsed) {
  const wrap = document.createElement(collapsed ? 'details' : 'div');
  wrap.className = 'senses';
  if (collapsed) wrap.innerHTML = '<summary>英文釋義(JMdict)</summary>';
  let lastPos = '';
  const ol = document.createElement('ol');
  senses.forEach((s) => {
    const li = document.createElement('li');
    const posTxt = (s.p || []).map((p) => label(POS, p, ENT)).join('・');
    const tags = [
      ...(s.m || []).filter((m) => m !== 'uk').map((m) => label(MISC, m, ENT)),
      ...(s.f || []).map((f) => label(FIELD, f, ENT)),
      ...(s.d || []).map((x) => label(DIAL, x, ENT)),
    ];
    const gl = s.g.map((g) => Array.isArray(g) ? `${esc(g[0])}<span class="gt">(${esc(GLOSS_TYPE[g[1]] || g[1])})</span>` : esc(g)).join('; ');
    let html = '';
    if (posTxt && posTxt !== lastPos) html += `<span class="pos">${esc(posTxt)}</span>`;
    lastPos = posTxt;
    if (tags.length) html += `<span class="tag">${tags.map(esc).join('・')}</span>`;
    html += `<span class="def">${gl}</span>`;
    if ((s.n || []).length) html += `<span class="note">${s.n.map(esc).join(';')}</span>`;
    if ((s.l || []).length) html += `<span class="note">源自 ${s.l.map(([lg, w]) => esc(LANG[lg] || lg) + (w ? ' ' + esc(w) : '')).join('、')}</span>`;
    if ((s.x || []).length) html += `<span class="note">參見 ${s.x.map(esc).join('、')}</span>`;
    if ((s.a || []).length) html += `<span class="note">反義 ${s.a.map(esc).join('、')}</span>`;
    html += (s.e || []).map(([ja, en]) => `<span class="eg"><span class="eg-ja">${esc(ja)}</span>${esc(en)}</span>`).join('');
    li.innerHTML = html;
    ol.appendChild(li);
  });
  wrap.appendChild(ol);
  return wrap;
}

// ── 音調:讀音切成「拍」,依音調核畫高低線 ──
const SMALL = /[ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ]/;
function morae(kana) {
  const out = [];
  for (const ch of kana) {
    if (SMALL.test(ch) && out.length) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}
function pitchHtml(kana, n) {
  const m = morae(kana);
  // 0=平板:第1拍低、之後高;1=頭高:第1拍高、之後低;n:第2〜n拍高、之後低
  const high = (i) => (n === 0 ? i > 0 : n === 1 ? i === 0 : i > 0 && i < n);
  return m.map((x, i) => `<span class="mora${high(i) ? ' h' : ''}${n > 0 && i === n - 1 ? ' drop' : ''}">${esc(x)}</span>`).join('') +
    `<span class="pitch-n">[${n}]</span>`;
}
function renderPitch(pitch, reading, kanji) {
  if (!pitch || !pitch.length) return '';
  const rows = pitch.filter((p) => p.r === reading && (!p.k || !kanji || p.k === kanji));
  const use = rows.length ? rows : pitch.filter((p) => p.r === reading);
  if (!use.length) return '';
  const seen = new Set();
  const parts = [];
  for (const p of use) for (const [n, pos] of p.a) {
    const k = n + '|' + (pos || '');
    if (seen.has(k)) continue;
    seen.add(k);
    parts.push(`<span class="pitch" title="音調(Kanjium)">${pos ? `<span class="tag">${esc(pos)}</span>` : ''}${pitchHtml(reading, n)}</span>`);
  }
  return parts.join('');
}

// ── 漢字卡(KANJIDIC2)──
function renderKanji(list) {
  const box = document.createElement('div');
  box.className = 'kanji-box';
  box.innerHTML = '<div class="group-title">漢字</div>';
  const grid = document.createElement('div');
  grid.className = 'kanji-grid';
  list.forEach((k) => {
    const meta = [
      k.s ? `${k.s} 畫` : '',
      k.g ? (k.g <= 6 ? `小學 ${k.g} 年` : k.g === 8 ? '常用漢字' : '人名用漢字') : '',
      k.j ? `舊 JLPT ${k.j} 級` : '',
      k.f ? `報紙頻率第 ${k.f}` : '',
    ].filter(Boolean);
    const c = document.createElement('div');
    c.className = 'kanji';
    c.innerHTML = `<div class="kc">${esc(k.c)}</div><div class="kd">` +
      ((k.on || []).length ? `<div><span class="kh">音</span>${k.on.map(esc).join('、')}</div>` : '') +
      ((k.kun || []).length ? `<div><span class="kh">訓</span>${k.kun.map(esc).join('、')}</div>` : '') +
      ((k.m || []).length ? `<div><span class="kh">義</span>${k.m.map(esc).join(', ')}</div>` : '') +
      (meta.length ? `<div class="km">${meta.join('・')}</div>` : '') + '</div>';
    grid.appendChild(c);
  });
  box.appendChild(grid);
  return box;
}

// ── 搜尋框控制器(自動完成 + 鍵盤 + 即時查詢)──
function makeSearch(boxEl) {
  const input = boxEl.querySelector('.word');
  const sugBox = boxEl.querySelector('.suggest');
  const goBtn = boxEl.querySelector('.go-btn');
  let suggestions = [], active = -1, t, composing = false;

  // 日文輸入法選字中不要查(會查到半成品)
  input.addEventListener('compositionstart', () => { composing = true; });
  input.addEventListener('compositionend', () => { composing = false; schedule(); });
  input.addEventListener('input', (e) => { if (!composing && !e.isComposing) schedule(); });
  function schedule() { clearTimeout(t); t = setTimeout(onType, 150); }

  async function onType() {
    if (!ready) return;
    const v = input.value.trim();
    if ([...v].length >= MIN_PREFIX) {
      try { const { items } = await db.suggest(v, MAX_SUGGEST); suggestions = items; active = -1; renderSuggest(); }
      catch (_) { closeSuggest(); }
    } else closeSuggest();
    if (v) search(v, { quiet: true });
  }

  input.addEventListener('keydown', (e) => {
    if (e.isComposing || composing) return;
    const open = suggestions.length > 0 && !sugBox.hidden;
    if (e.key === 'ArrowDown' && open) { e.preventDefault(); active = (active + 1) % suggestions.length; renderSuggest(); preview(); }
    else if (e.key === 'ArrowUp' && open) { e.preventDefault(); active = (active <= 0 ? suggestions.length : active) - 1; renderSuggest(); preview(); }
    else if (e.key === 'Tab') { if (open) { e.preventDefault(); pick(suggestions[active >= 0 ? active : 0]); } }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && active >= 0) pick(suggestions[active]);
      else { const w = input.value.trim(); if (w) { closeSuggest(); search(w); } }
    }
    else if (e.key === 'Escape') closeSuggest();
  });

  if (goBtn) goBtn.addEventListener('click', () => { const w = input.value.trim(); if (w) { closeSuggest(); search(w); } });

  function pick(s) { input.value = s.head; closeSuggest(); openEntry(s.id, s.head); }

  function renderSuggest() {
    if (!suggestions.length) return closeSuggest();
    sugBox.innerHTML = '';
    suggestions.forEach((s, i) => {
      const item = document.createElement('div');
      item.className = 'suggest-item' + (i === active ? ' active' : '');
      item.innerHTML = `<span class="sw">${esc(s.head)}</span>` +
        (s.kana !== s.head ? `<span class="sk">${esc(s.kana)}</span>` : '') +
        (s.via === 'en' ? '<span class="sv">英</span>' : '') +
        `<span class="sc">${esc(s.brief)}</span>`;
      item.addEventListener('mousedown', (ev) => { ev.preventDefault(); pick(s); });
      sugBox.appendChild(item);
    });
    sugBox.hidden = false;
  }
  function closeSuggest() { sugBox.hidden = true; sugBox.innerHTML = ''; suggestions = []; active = -1; }
  function preview() { if (active >= 0 && suggestions[active]) openEntry(suggestions[active].id, suggestions[active].head); }

  return {
    enable: () => { input.disabled = false; },
    focus: () => input.focus(),
    query: (w) => { input.value = w; closeSuggest(); search(w); },
  };
}

const box = makeSearch($('.search-box'));

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-box')) { const s = $('.suggest'); s.hidden = true; s.innerHTML = ''; }
});

// 角落 ⓘ:點開/收起版本+重建浮層;點別處關閉
const infoBtn = $('#info-btn');
const infoPop = $('#info-pop');
infoBtn.addEventListener('click', (e) => { e.stopPropagation(); infoPop.hidden = !infoPop.hidden; });
document.addEventListener('click', (e) => { if (!e.target.closest('.info')) infoPop.hidden = true; });

rebuildBtn.addEventListener('click', async () => {
  if (!confirm('清除本機快取的字典資料?下次會重新下載最新版。')) return;
  try { await db.clear(); location.reload(); }
  catch (e) { setStatus('清除失敗:' + e.message); }
});

// 沒有日語語音時,在 ⓘ 裡提示(語音清單可能晚一點才載入)
function voiceHint() { $('#voice-hint').hidden = hasJapaneseVoice(); }
if ('speechSynthesis' in window) { speechSynthesis.addEventListener?.('voiceschanged', voiceHint); setTimeout(voiceHint, 1500); }

function setStatus(text) { statusEl.textContent = text; statusEl.hidden = !text; }
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
