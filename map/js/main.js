// main.js — 殼層。兩種組:
//   內建組  = 從版控的 data/builtin.json 載入,唯讀(不能新增/刪除/改名;可檢視、跳位、匯出)。
//   user 組 = 存在 localStorage,可搜尋加點 / 匯入 / 刪除。
// 地圖只是「跳到某座標」的觀景窗(免 API key)。點一下任一地點 → 下方顯示完整資訊。

import { loadUser, saveUser, uid } from './store.js';
import { parseLatLng, search, embedUrl } from './geo.js';
import { groupToJSON, parseImport, normPoint } from './io.js';

const $ = (s) => document.querySelector(s);
const el = {
  groups: $('#groups'), list: $('#list'), mapwrap: $('#mapwrap'),
  q: $('#q'), search: $('#search'), results: $('#results'),
  picked: $('#picked'), pickedLoc: $('#pickedLoc'),
  emoji: $('#emoji'), title: $('#title'), address: $('#address'), hours: $('#hours'), tags: $('#tags'), rating: $('#rating'), note: $('#note'),
  addPoint: $('#addPoint'), adder: $('#adder'), detail: $('#detail'),
  delGroup: $('#delGroup'), renameGroup: $('#renameGroup'), line2: $('#line2'),
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let builtinGroups = [];
let user = loadUser();        // { userGroups, currentId, line2 }
if (!user.line2) user.line2 = 'address';   // 第二行顯示哪個欄位(全域偏好,會記住)
let pick = null;              // 待加入的地點 { lat, lng, label }
let results = [];             // 最近一次搜尋結果
let selected = null;          // 目前點選顯示詳情的點

function allGroups() { return [...builtinGroups, ...user.userGroups]; }
function current() { return allGroups().find((g) => g.id === user.currentId) || allGroups()[0]; }
function isBuiltin(g) { return !!(g && g.builtin); }
function persist() { saveUser(user); }

async function init() {
  try {
    const res = await fetch('data/builtin.json');
    const data = await res.json();
    builtinGroups = (data.groups || []).map((g) => ({
      id: g.id || uid('b'), name: g.name, builtin: true, center: g.center || null,
      points: (g.points || []).map((p) => withId(normPoint(p))).filter(Boolean),
    }));
  } catch { builtinGroups = []; }
  if (!current()) user.currentId = allGroups()[0] ? allGroups()[0].id : null;
  renderAll();
}
function withId(p) { return p ? { id: uid('p'), ...p } : null; }

// ── 渲染 ──
function renderGroups() {
  el.groups.innerHTML = allGroups().map((g) => `<option value="${g.id}">${g.builtin ? '🔒 ' : ''}${esc(g.name)}(${g.points.length})</option>`).join('');
  const g = current(); if (g) el.groups.value = g.id;
}
function renderControls() {
  const ro = isBuiltin(current());
  el.adder.hidden = ro;
  el.delGroup.disabled = ro;
  el.renameGroup.disabled = ro;
}
function renderList() {
  const g = current();
  const ro = isBuiltin(g);
  if (!g.points.length) {
    el.list.innerHTML = ro
      ? '<div class="empty">這個內建組還沒有資料(待填)。</div>'
      : '<div class="empty">這組還沒有地點。用上面貼 Google Maps 連結 / 經緯度來新增。</div>';
    return;
  }
  el.list.innerHTML = g.points.map((p, i) => {
    const l2 = esc(line2Text(p));
    return `
    <div class="row${selected && selected.id === p.id ? ' on' : ''}" data-i="${i}" title="點一下:看詳情並跳到地圖">
      <span class="row-emoji">${esc(p.emoji)}</span>
      <span class="row-main"><span class="row-title">${esc(p.title || '(未命名)')}</span>${l2 ? `<span class="row-note">${l2}</span>` : ''}</span>
      ${p.rating ? `<span class="row-rating">★${esc(p.rating)}</span>` : ''}
      ${ro ? '' : `<button class="row-del" data-del="${i}" type="button" title="刪除此點">✕</button>`}
    </div>`;
  }).join('');
}
// 第二行要顯示的內容(依使用者選的偏好)
function line2Text(p) {
  switch (user.line2) {
    case 'hours': return p.hours || '';
    case 'tags': return (p.tags || []).join(' · ');
    case 'rating': return p.rating ? '★' + p.rating : '';
    case 'note': return p.note || '';
    default: return p.address || '';
  }
}
function renderDetail() {
  if (!selected) { el.detail.hidden = true; return; }
  const p = selected;
  const tags = (p.tags || []).map((t) => `<span class="chip">${esc(t)}</span>`).join('');
  el.detail.hidden = false;
  el.detail.innerHTML = `
    <button class="detail-close" id="detailClose" type="button" title="關閉">✕</button>
    <div class="d-title">${esc(p.emoji)} ${esc(p.title || '(未命名)')}${p.rating ? ` <span class="d-rating">★${esc(p.rating)}</span>` : ''}</div>
    <div class="d-coord">${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}${p.approx ? ' <span class="d-approx">(座標概略)</span>' : ''}</div>
    ${p.address ? `<div class="d-line"><span class="d-k">地址</span>${esc(p.address)}</div>` : ''}
    ${p.hours ? `<div class="d-line"><span class="d-k">營業</span>${esc(p.hours)}</div>` : ''}
    ${tags ? `<div class="d-tags">${tags}</div>` : ''}
    ${p.note ? `<div class="d-note">${esc(p.note)}</div>` : ''}`;
  $('#detailClose').addEventListener('click', () => { selected = null; renderDetail(); renderList(); });
}
// 地圖 LRU 快取:切點時不重載——已看過的 iframe 只是隱藏,切回就顯示(極快)。
// lazy 建立;超過上限就移除「最久沒看」的那張(切換組時整批清掉)。
const MAP_CACHE_MAX = 6;   // 同組內最多保留幾張已載入的地圖(可調)
let mapCache = [];         // [{ key, el }],陣列尾端 = 最近使用
function showOnMap(lat, lng, z) {
  const zoom = z || 16;
  const key = `${lat},${lng},${zoom}`;
  let entry = mapCache.find((e) => e.key === key);
  if (entry) {
    mapCache = mapCache.filter((e) => e !== entry);          // 命中:拉到最近使用
  } else {
    const f = document.createElement('iframe');
    f.className = 'map'; f.title = '地圖'; f.loading = 'lazy';
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    f.src = embedUrl(lat, lng, zoom);                        // 只有新點才真的載入
    el.mapwrap.appendChild(f);
    entry = { key, el: f };
  }
  mapCache.push(entry);
  while (mapCache.length > MAP_CACHE_MAX) mapCache.shift().el.remove();   // 淘汰最久沒看的
  for (const e of mapCache) e.el.style.display = (e === entry) ? 'block' : 'none';
}
function clearMapCache() { for (const e of mapCache) e.el.remove(); mapCache = []; }
function showGroupDefault() {
  const g = current();
  if (g.points.length) showOnMap(g.points[0].lat, g.points[0].lng, g.points[0].z);
  else if (g.center) showOnMap(g.center.lat, g.center.lng, g.center.z);
  // 空組且無 center:不顯示(切組時已清快取)
}
function renderAll() { el.line2.value = user.line2; renderGroups(); renderControls(); selected = null; renderDetail(); renderList(); clearMapCache(); showGroupDefault(); }

// ── 搜尋 / 選點(加入用)──
async function doSearch() {
  const text = el.q.value.trim();
  if (!text) return;
  const coords = parseLatLng(text);
  if (coords) { setPick({ ...coords, label: `${coords.lat}, ${coords.lng}` }); return; }
  el.results.hidden = false;
  el.results.innerHTML = '<div class="r-msg">搜尋中…</div>';
  try {
    results = await search(text);
    if (!results.length) { el.results.innerHTML = '<div class="r-msg">找不到(OSM 沒有店家資料很正常)。找店家請在 Google Maps 找到後,複製「網址列」連結貼上。</div>'; return; }
    el.results.innerHTML = results.map((r, i) => `<div class="r-item" data-r="${i}">${esc(r.label)}</div>`).join('');
  } catch (e) {
    el.results.innerHTML = `<div class="r-msg">搜尋失敗:${esc(e.message)}。可改貼 Google Maps 網址列連結或經緯度。</div>`;
  }
}
function setPick(loc) {
  pick = loc;
  el.results.hidden = true;
  el.picked.hidden = false;
  el.pickedLoc.textContent = `${loc.label}　(${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)})`;
  if (!el.title.value.trim()) el.title.value = String(loc.label).split(',')[0].trim();
  showOnMap(loc.lat, loc.lng, 16);
}
function addPoint() {
  if (!pick) return;
  const p = withId(normPoint({
    emoji: el.emoji.value, title: el.title.value, lat: pick.lat, lng: pick.lng,
    address: el.address.value, hours: el.hours.value, tags: el.tags.value, rating: el.rating.value, note: el.note.value,
  }));
  if (!p) return;
  current().points.push(p);
  persist(); renderGroups(); renderList();
  pick = null; el.picked.hidden = true;
  ['q', 'title', 'address', 'hours', 'tags', 'rating', 'note'].forEach((k) => { el[k].value = ''; });
  el.emoji.value = '📍';
}

// ── 組操作(僅 user 組)──
function newGroup() {
  const name = (prompt('新組名稱:', '我的地圖') || '').trim();
  if (!name) return;
  const g = { id: uid('u'), name, points: [] };
  user.userGroups.push(g); user.currentId = g.id; persist(); renderAll();
}
function renameGroup() {
  const g = current(); if (isBuiltin(g)) return;
  const name = (prompt('改名:', g.name) || '').trim();
  if (!name) return;
  g.name = name; persist(); renderGroups();
}
function delGroup() {
  const g = current(); if (isBuiltin(g)) return;
  if (!confirm(`刪除「${g.name}」(含 ${g.points.length} 個點)?`)) return;
  user.userGroups = user.userGroups.filter((x) => x.id !== g.id);
  user.currentId = allGroups()[0] ? allGroups()[0].id : null; persist(); renderAll();
}

// ── 匯出 / 匯入 ──
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
const safeName = (s) => (s || 'map').replace(/[\\/:*?"<>|]+/g, '_');
function importFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const { name, points } = parseImport(file.name, String(reader.result));
      const g = { id: uid('u'), name: name || '匯入', points: points.map((p) => withId(p)) };
      user.userGroups.push(g); user.currentId = g.id; persist(); renderAll();
    } catch (e) { alert('匯入失敗:' + e.message); }
  };
  reader.readAsText(file);
}

// ── 事件 ──
el.groups.addEventListener('change', () => { user.currentId = el.groups.value; persist(); renderControls(); selected = null; renderDetail(); renderList(); clearMapCache(); showGroupDefault(); });
el.line2.addEventListener('change', () => { user.line2 = el.line2.value; persist(); renderList(); });
el.search.addEventListener('click', doSearch);
el.q.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
el.results.addEventListener('click', (e) => { const t = e.target.closest('.r-item'); if (t) setPick(results[+t.dataset.r]); });
el.addPoint.addEventListener('click', addPoint);
el.list.addEventListener('click', (e) => {
  const del = e.target.closest('[data-del]');
  if (del) { current().points.splice(+del.dataset.del, 1); persist(); renderGroups(); renderList(); if (selected) { selected = null; renderDetail(); } return; }
  const row = e.target.closest('.row');
  if (row) { const p = current().points[+row.dataset.i]; selected = p; renderDetail(); renderList(); showOnMap(p.lat, p.lng, p.z); }
});
$('#newGroup').addEventListener('click', newGroup);
el.renameGroup.addEventListener('click', renameGroup);
el.delGroup.addEventListener('click', delGroup);
$('#exportJson').addEventListener('click', () => download(safeName(current().name) + '.json', groupToJSON(current()), 'application/json'));
$('#importBtn').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', (e) => { if (e.target.files[0]) importFile(e.target.files[0]); e.target.value = ''; });

init();
