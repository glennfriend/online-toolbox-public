// main.js — 殼層。兩種組:
//   內建組  = 從版控的 data/builtin.json 載入,唯讀(不能新增/刪除/改名;可檢視、跳位、匯出)。
//   user 組 = 存在 localStorage,可搜尋加點 / 匯入 / 刪除。
// 地圖只是「跳到某座標」的觀景窗(免 API key)。點一下任一地點 → 下方顯示完整資訊。

import { loadUser, saveUser, uid } from './store.js';
import { parseLatLng, search, embedUrl } from './geo.js';
import { groupToJSON, parseImport, normPoint } from './io.js';

const $ = (s) => document.querySelector(s);
const el = {
  groups: $('#groups'), list: $('#list'), map: $('#map'),
  q: $('#q'), search: $('#search'), results: $('#results'),
  picked: $('#picked'), pickedLoc: $('#pickedLoc'),
  emoji: $('#emoji'), title: $('#title'), address: $('#address'), hours: $('#hours'), tags: $('#tags'), rating: $('#rating'), note: $('#note'),
  addPoint: $('#addPoint'), adder: $('#adder'), roNote: $('#roNote'), detail: $('#detail'),
  delGroup: $('#delGroup'), renameGroup: $('#renameGroup'),
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let builtinGroups = [];
let user = loadUser();        // { userGroups, currentId }
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
  el.roNote.hidden = !ro;
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
  el.list.innerHTML = g.points.map((p, i) => `
    <div class="row${selected && selected.id === p.id ? ' on' : ''}" data-i="${i}" title="點一下:看詳情並跳到地圖">
      <span class="row-emoji">${esc(p.emoji)}</span>
      <span class="row-main"><span class="row-title">${esc(p.title || '(未命名)')}</span>${p.address ? `<span class="row-note">${esc(p.address)}</span>` : ''}</span>
      ${p.rating ? `<span class="row-rating">★${esc(p.rating)}</span>` : ''}
      ${ro ? '' : `<button class="row-del" data-del="${i}" type="button" title="刪除此點">✕</button>`}
    </div>`).join('');
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
function showOnMap(lat, lng, z) { el.map.src = embedUrl(lat, lng, z || 16); }
function showGroupDefault() {
  const g = current();
  if (g.points.length) showOnMap(g.points[0].lat, g.points[0].lng, g.points[0].z);
  else if (g.center) showOnMap(g.center.lat, g.center.lng, g.center.z);
  else el.map.removeAttribute('src');
}
function renderAll() { renderGroups(); renderControls(); selected = null; renderDetail(); renderList(); showGroupDefault(); }

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
el.groups.addEventListener('change', () => { user.currentId = el.groups.value; persist(); renderControls(); selected = null; renderDetail(); renderList(); showGroupDefault(); });
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
