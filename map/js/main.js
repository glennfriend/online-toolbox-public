// main.js — 殼層:狀態 + DOM 渲染 + 事件。其餘職責拆給:
//   store.js   使用者組的 localStorage 存取
//   geo.js     座標解析 / 地名搜尋 / 距離 / 路線規劃(純計算)
//   mapview.js 地圖呈現層(免 key Google 崁入;未來可換 Leaflet,介面不變)
//   io.js      匯入匯出 + 點正規化
//   util.js    共用小工具(esc / 營業中判斷 / 下載)
//
// 兩種組:內建組(版控 builtin.json,唯讀)+ 使用者組(localStorage,可加點/匯入/刪除)。

import { loadUser, saveUser, uid } from './store.js';
import { parseLatLng, search, placeNameFromUrl, planRoute } from './geo.js';
import { groupToJSON, parseImport, normPoint } from './io.js';
import { initMapView, showPoint, showRoute as drawRoute, clearMapView } from './mapview.js';
import { esc, openMark, download, safeName } from './util.js';

const $ = (s) => document.querySelector(s);
const el = {
  groups: $('#groups'), list: $('#list'), mapwrap: $('#mapwrap'),
  q: $('#q'), search: $('#search'), results: $('#results'),
  picked: $('#picked'), pickedLoc: $('#pickedLoc'),
  emoji: $('#emoji'), title: $('#title'), address: $('#address'), hours: $('#hours'), tags: $('#tags'), rating: $('#rating'), note: $('#note'),
  addPoint: $('#addPoint'), adder: $('#adder'), detail: $('#detail'),
  delGroup: $('#delGroup'), renameGroup: $('#renameGroup'), line2: $('#line2'), sort: $('#sort'),
};

// ── 狀態 ──
let builtinGroups = [];
let user = loadUser();              // { userGroups, currentId, line2, sort }
if (!user.line2 || user.line2 === 'rating') user.line2 = 'address';   // 第二行欄位(評分已在列上,不當第二行)
if (!user.sort) user.sort = 'none';                                   // 清單排序
let pick = null;                    // 待加入的地點 { lat, lng, name }
let results = [];                   // 最近一次搜尋結果
let selected = null;                // 目前詳情:單一點物件,或 { route:true, ... }

const allGroups = () => [...builtinGroups, ...user.userGroups];
const current = () => allGroups().find((g) => g.id === user.currentId) || allGroups()[0];
const isBuiltin = (g) => !!(g && g.builtin);
const persist = () => saveUser(user);
const withId = (p) => (p ? { id: uid('p'), ...p } : null);

async function init() {
  initMapView(el.mapwrap);
  try {
    const data = await (await fetch('data/builtin.json')).json();
    builtinGroups = (data.groups || []).map((g) => ({
      id: g.id || uid('b'), name: g.name, builtin: true, center: g.center || null,
      points: (g.points || []).map((p) => withId(normPoint(p))).filter(Boolean),
    }));
  } catch { builtinGroups = []; }
  if (!current()) user.currentId = allGroups()[0] ? allGroups()[0].id : null;
  renderAll();
}

// ── 渲染 ──
function renderAll() {
  el.line2.value = user.line2; el.sort.value = user.sort;
  renderGroups(); renderControls(); selected = null; renderDetail(); renderList();
  clearMapView(); showGroupDefault();
}
function renderGroups() {
  el.groups.innerHTML = '<option disabled>──── 資料組 ────</option>'
    + allGroups().map((g) => `<option value="${g.id}">${g.builtin ? '🔒 ' : ''}${esc(g.name)}(${g.points.length})</option>`).join('');
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
    el.list.innerHTML = `<div class="empty">${ro ? '這個內建組還沒有資料(待填)。' : '這組還沒有地點。用上面貼 Google Maps 連結 / 經緯度來新增。'}</div>`;
    return;
  }
  const routeRow = g.points.length >= 2 ? `
    <div class="row route-row${selected && selected.route ? ' on' : ''}" data-route="1" title="顯示本組路線(依距離自動串連)">
      <span class="row-emoji">🧭</span>
      <span class="row-main"><span class="row-title">路線(本組 ${g.points.length} 點)</span><span class="row-note">依距離自動串連</span></span>
    </div>` : '';
  el.list.innerHTML = routeRow + sortedPoints(g).map((p) => {
    const l2 = esc(line2Text(p));
    return `
    <div class="row${selected && selected.id === p.id ? ' on' : ''}" data-id="${p.id}" title="點一下:看詳情並跳到地圖">
      <span class="row-emoji">${esc(p.emoji)}</span>
      <span class="row-main"><span class="row-title">${esc(p.title || '(未命名)')}</span>${l2 ? `<span class="row-note" title="${l2}">${l2}</span>` : ''}</span>
      ${p.rating ? `<span class="row-rating">★${esc(p.rating)}</span>` : ''}
      ${ro ? '' : `<button class="row-del" data-del="${p.id}" type="button" title="刪除此點">✕</button>`}
    </div>`;
  }).join('');
}
// 排序「顯示用」的點(複製,不動原始資料/順序)
function sortedPoints(g) {
  const pts = g.points.slice();
  if (user.sort === 'rating') return pts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  if (user.sort === 'title') return pts.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'zh-Hant'));
  return pts;
}
// 第二行顯示的內容(依使用者選的偏好)
function line2Text(p) {
  switch (user.line2) {
    case 'hours': return p.hours ? openMark(p.hours) + p.hours : '';
    case 'tags': return (p.tags || []).join(', ');
    case 'note': return p.note || '';
    default: return p.address || '';
  }
}
function renderDetail() {
  if (!selected) { el.detail.hidden = true; return; }
  el.detail.hidden = false;
  el.detail.innerHTML = selected.route ? routeDetailHtml(selected) : pointDetailHtml(selected);
  $('#detailClose').addEventListener('click', () => { selected = null; renderDetail(); renderList(); });
}
function pointDetailHtml(p) {
  const tags = (p.tags || []).map((t) => `<span class="chip">${esc(t)}</span>`).join('');
  return `
    <button class="detail-close" id="detailClose" type="button" title="關閉">✕</button>
    <div class="d-title">${esc(p.emoji)} ${esc(p.title || '(未命名)')}${p.rating ? ` <span class="d-rating">★${esc(p.rating)}</span>` : ''}</div>
    <div class="d-coord">${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}${p.approx ? ' <span class="d-approx">(座標概略)</span>' : ''}</div>
    ${p.address ? `<div class="d-line"><span class="d-k">地址</span>${esc(p.address)}</div>` : ''}
    ${p.hours ? `<div class="d-line"><span class="d-k">營業</span>${openMark(p.hours)}${esc(p.hours)}</div>` : ''}
    ${tags ? `<div class="d-tags">${tags}</div>` : ''}
    <div class="d-foot">
      <div class="d-note">${p.note ? esc(p.note) : ''}</div>
      <a class="d-gmap" href="https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}" target="_blank" rel="noopener">Google Map ↗</a>
    </div>`;
}
function routeDetailHtml(r) {
  const steps = r.included.map((p, i) => `<div class="r-step"><span class="r-num">${i + 1}</span>${esc(p.emoji)} ${esc(p.title || '(未命名)')}</div>`).join('');
  const total = r.included.length + r.dropped.length;
  const dropped = r.dropped.length ? `<div class="d-approx r-dropped" title="${esc(r.dropped.map((p) => p.title).join('、'))}">⚠ ${r.dropped.length}/${total} 未納入路線圖</div>` : '';
  return `
    <button class="detail-close" id="detailClose" type="button" title="關閉">✕</button>
    <div class="d-title">🧭 ${esc(r.groupName)} 路線</div>
    <div class="d-coord">${r.mode === 'd' ? '開車' : '單車'} · 依距離自動排序(最近鄰 + 2-opt)· 座標概略</div>
    <div class="r-steps">${steps}</div>${dropped}`;
}

// ── 地圖 ──
function showGroupDefault() {
  const g = current();
  if (g.points.length) showPoint(g.points[0].lat, g.points[0].lng, g.points[0].z);
  else if (g.center) showPoint(g.center.lat, g.center.lng, g.center.z);
  // 空組且無 center:不顯示(切組時已清快取)
}
function selectRoute() {
  const g = current();
  const plan = planRoute(g);
  selected = { route: true, groupName: g.name, ...plan };
  drawRoute(plan.stops, plan.mode);
}
function selectPoint(p) {
  selected = p; renderDetail(); renderList();
  showPoint(p.lat, p.lng, p.z);
}

// ── 搜尋 / 選點 / 加點 ──
async function doSearch() {
  const text = el.q.value.trim();
  if (!text) return;
  const coords = parseLatLng(text);
  if (coords) { setPick({ lat: coords.lat, lng: coords.lng, name: placeNameFromUrl(text) }); return; }
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
  el.pickedLoc.textContent = (loc.name ? loc.name + '　' : '') + `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`;
  if (!el.title.value.trim() && loc.name) el.title.value = loc.name;   // 有名稱就自動帶入標題
  showPoint(loc.lat, loc.lng, 16);
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

// ── 組操作(僅使用者組)──
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

// ── 匯入 / 匯出(匯入一律成新的使用者組;匯出任何組皆可)──
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
el.groups.addEventListener('change', () => {
  user.currentId = el.groups.value; persist();
  renderControls(); selected = null; renderDetail(); renderList();
  clearMapView(); showGroupDefault();
});
el.line2.addEventListener('change', () => { user.line2 = el.line2.value; persist(); renderList(); });
el.sort.addEventListener('change', () => { user.sort = el.sort.value; persist(); renderList(); });
el.search.addEventListener('click', doSearch);
el.q.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
el.results.addEventListener('click', (e) => {
  const t = e.target.closest('.r-item');
  if (t) { const rr = results[+t.dataset.r]; setPick({ lat: rr.lat, lng: rr.lng, name: rr.label.split(',')[0].trim() }); }
});
el.addPoint.addEventListener('click', addPoint);
el.list.addEventListener('click', (e) => {
  const del = e.target.closest('[data-del]');
  if (del) { const g = current(); g.points = g.points.filter((x) => x.id !== del.dataset.del); persist(); renderGroups(); renderList(); selected = null; renderDetail(); return; }
  if (e.target.closest('[data-route]')) { selectRoute(); renderDetail(); renderList(); return; }
  const row = e.target.closest('.row');
  if (row) { const p = current().points.find((x) => x.id === row.dataset.id); if (p) selectPoint(p); }
});
$('#newGroup').addEventListener('click', newGroup);
el.renameGroup.addEventListener('click', renameGroup);
el.delGroup.addEventListener('click', delGroup);
$('#exportJson').addEventListener('click', () => download(safeName(current().name) + '.json', groupToJSON(current()), 'application/json'));
$('#importBtn').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', (e) => { if (e.target.files[0]) importFile(e.target.files[0]); e.target.value = ''; });

init();
