// main.js — 殼層:多組地點清單 + 免 key 地圖。資料在 store、地理在 geo、匯出入在 io。
// 設計重點:地圖只是「跳到某座標」的觀景窗(免 API key 的 iframe),所有點資料都存在本機、由清單掌控。

import { loadState, saveState, uid } from './store.js';
import { parseLatLng, search, embedUrl, validLatLng } from './geo.js';
import { groupToJSON, groupToCSV, parseImport } from './io.js';

const $ = (s) => document.querySelector(s);
const el = {
  groups: $('#groups'), list: $('#list'), map: $('#map'),
  q: $('#q'), search: $('#search'), results: $('#results'),
  picked: $('#picked'), pickedLoc: $('#pickedLoc'), emoji: $('#emoji'), title: $('#title'), note: $('#note'),
  addPoint: $('#addPoint'),
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let state = loadState() || seed();
let pick = null;          // 待加入的地點 { lat, lng, label }
let results = [];         // 最近一次搜尋結果

function seed() {
  const g = {
    id: uid(), name: '示範:台北中山', points: [
      mkPoint('🌳', '林森公園', '綠地、林蔭步道', 25.0509, 121.5256),
      mkPoint('🏨', '台北晶華酒店', 'Regent Taipei', 25.0529, 121.5237),
      mkPoint('🍽️', '吉星港式飲茶', '港式飲茶', 25.0498, 121.5270),
    ],
  };
  return { groups: [g], currentId: g.id };
}
function mkPoint(emoji, title, note, lat, lng, z = 16) { return { id: uid(), emoji, title, note, lat, lng, z }; }
function persist() { saveState(state); }
function current() { return state.groups.find((g) => g.id === state.currentId) || state.groups[0]; }

// ── 渲染 ──
function renderGroups() {
  el.groups.innerHTML = state.groups.map((g) => `<option value="${g.id}">${esc(g.name)}(${g.points.length})</option>`).join('');
  el.groups.value = current().id;
}
function renderList() {
  const g = current();
  if (!g.points.length) { el.list.innerHTML = '<div class="empty">這組還沒有地點。用上面的搜尋、或貼 Google Maps 連結 / 經緯度來新增。</div>'; return; }
  el.list.innerHTML = g.points.map((p, i) => `
    <div class="row" data-i="${i}" title="點一下:地圖跳到這裡">
      <span class="row-emoji">${esc(p.emoji)}</span>
      <span class="row-main"><span class="row-title">${esc(p.title || '(未命名)')}</span>${p.note ? `<span class="row-note">${esc(p.note)}</span>` : ''}</span>
      <button class="row-del" data-del="${i}" type="button" title="刪除此點">✕</button>
    </div>`).join('');
}
function showOnMap(p) { el.map.src = embedUrl(p.lat, p.lng, p.z || 16); }

function renderAll() { renderGroups(); renderList(); const g = current(); if (g.points.length) showOnMap(g.points[0]); else el.map.removeAttribute('src'); }

// ── 搜尋 / 選點 ──
async function doSearch() {
  const text = el.q.value.trim();
  if (!text) return;
  const coords = parseLatLng(text);
  if (coords) { setPick({ ...coords, label: `${coords.lat}, ${coords.lng}` }); return; }
  el.results.hidden = false;
  el.results.innerHTML = '<div class="r-msg">搜尋中…</div>';
  try {
    results = await search(text);
    if (!results.length) { el.results.innerHTML = '<div class="r-msg">找不到結果(可改貼座標或 Google Maps 連結)</div>'; return; }
    el.results.innerHTML = results.map((r, i) => `<div class="r-item" data-r="${i}">${esc(r.label)}</div>`).join('');
  } catch (e) {
    el.results.innerHTML = `<div class="r-msg">搜尋失敗:${esc(e.message)}(可改貼座標或 Google Maps 連結)</div>`;
  }
}
function setPick(loc) {
  pick = loc;
  el.results.hidden = true;
  el.picked.hidden = false;
  el.pickedLoc.textContent = `${loc.label}　(${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)})`;
  if (!el.title.value.trim()) el.title.value = String(loc.label).split(',')[0].trim();
  el.map.src = embedUrl(loc.lat, loc.lng, 16);
}
function addPoint() {
  if (!pick) return;
  current().points.push(mkPoint(el.emoji.value.trim() || '📍', el.title.value.trim(), el.note.value, pick.lat, pick.lng));
  persist(); renderGroups(); renderList();
  pick = null; el.picked.hidden = true;
  el.q.value = ''; el.title.value = ''; el.note.value = ''; el.emoji.value = '📍';
}

// ── 組操作 ──
function newGroup() {
  const name = (prompt('新組名稱:', '新的一組') || '').trim();
  if (!name) return;
  const g = { id: uid(), name, points: [] };
  state.groups.push(g); state.currentId = g.id; persist(); renderAll();
}
function renameGroup() {
  const g = current();
  const name = (prompt('改名:', g.name) || '').trim();
  if (!name) return;
  g.name = name; persist(); renderGroups();
}
function delGroup() {
  const g = current();
  if (!confirm(`刪除「${g.name}」(含 ${g.points.length} 個點)?`)) return;
  state.groups = state.groups.filter((x) => x.id !== g.id);
  if (!state.groups.length) state.groups.push({ id: uid(), name: '新的一組', points: [] });
  state.currentId = state.groups[0].id; persist(); renderAll();
}

// ── 匯出 / 匯入 ──
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
function safeName(s) { return (s || 'map').replace(/[\\/:*?"<>|]+/g, '_'); }
function importFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const { name, points } = parseImport(file.name, String(reader.result));
      const g = { id: uid(), name: name || '匯入', points: points.map((p) => ({ id: uid(), ...p })) };
      state.groups.push(g); state.currentId = g.id; persist(); renderAll();
    } catch (e) { alert('匯入失敗:' + e.message); }
  };
  reader.readAsText(file);
}

// ── 事件 ──
el.groups.addEventListener('change', () => { state.currentId = el.groups.value; persist(); renderList(); const g = current(); if (g.points.length) showOnMap(g.points[0]); });
el.search.addEventListener('click', doSearch);
el.q.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
el.results.addEventListener('click', (e) => { const t = e.target.closest('.r-item'); if (t) setPick(results[+t.dataset.r]); });
el.addPoint.addEventListener('click', addPoint);
el.list.addEventListener('click', (e) => {
  const del = e.target.closest('[data-del]');
  if (del) { current().points.splice(+del.dataset.del, 1); persist(); renderGroups(); renderList(); return; }
  const row = e.target.closest('.row');
  if (row) showOnMap(current().points[+row.dataset.i]);
});
$('#newGroup').addEventListener('click', newGroup);
$('#renameGroup').addEventListener('click', renameGroup);
$('#delGroup').addEventListener('click', delGroup);
$('#exportJson').addEventListener('click', () => download(safeName(current().name) + '.json', groupToJSON(current()), 'application/json'));
$('#exportCsv').addEventListener('click', () => download(safeName(current().name) + '.csv', groupToCSV(current()), 'text/csv;charset=utf-8'));
$('#importBtn').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', (e) => { if (e.target.files[0]) importFile(e.target.files[0]); e.target.value = ''; });

renderAll();
