// main.js — 殼層。兩種組:
//   內建組  = 從版控的 data/builtin.json 載入,唯讀(不能新增/刪除/改名;可檢視、跳位、匯出)。
//   user 組 = 存在 localStorage,可搜尋加點 / 匯入 / 刪除。
// 地圖只是「跳到某座標」的觀景窗(免 API key)。點一下任一地點 → 下方顯示完整資訊。

import { loadUser, saveUser, uid } from './store.js';
import { parseLatLng, search, embedUrl, orderByRoute, directionsEmbedUrl, haversineKm, placeNameFromUrl } from './geo.js';
import { groupToJSON, parseImport, normPoint } from './io.js';

const $ = (s) => document.querySelector(s);
const el = {
  groups: $('#groups'), list: $('#list'), mapwrap: $('#mapwrap'),
  q: $('#q'), search: $('#search'), results: $('#results'),
  picked: $('#picked'), pickedLoc: $('#pickedLoc'),
  emoji: $('#emoji'), title: $('#title'), address: $('#address'), hours: $('#hours'), tags: $('#tags'), rating: $('#rating'), note: $('#note'),
  addPoint: $('#addPoint'), adder: $('#adder'), detail: $('#detail'),
  delGroup: $('#delGroup'), renameGroup: $('#renameGroup'), line2: $('#line2'), sort: $('#sort'),
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let builtinGroups = [];
let user = loadUser();        // { userGroups, currentId, line2 }
if (!user.line2) user.line2 = 'address';   // 第二行顯示哪個欄位(全域偏好,會記住)
if (user.line2 === 'rating') user.line2 = 'address';   // 評分已顯示在列上,不再當第二行
if (!user.sort) user.sort = 'none';         // 清單排序(none/rating/title,會記住)
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
// 依使用者選的排序回傳「顯示用」的點(複製,不動原始順序/資料)
function sortedPoints(g) {
  const pts = g.points.slice();
  if (user.sort === 'rating') return pts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  if (user.sort === 'title') return pts.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'zh-Hant'));
  return pts;   // none:維持原順序
}
// 第二行要顯示的內容(依使用者選的偏好)
function line2Text(p) {
  switch (user.line2) {
    case 'hours': return p.hours ? openMark(p.hours) + p.hours : '';
    case 'tags': return (p.tags || []).join(', ');
    case 'rating': return p.rating ? '★' + p.rating : '';
    case 'note': return p.note || '';
    default: return p.address || '';
  }
}
// 依營業時間字串粗判現在開/關:🟢 開、🔴 關、''(無法判斷就不標)。
// 最佳努力:抓 HH:MM–HH:MM 時段(含跨夜)、「24小時/全天」視為開;不處理「週X公休」等日期條件。
function isOpenNow(hours) {
  if (!hours) return null;
  if (/24\s*小時|全天/.test(hours)) return true;
  const re = /(\d{1,2}):(\d{2})\s*[–\-~〜]\s*(\d{1,2}):(\d{2})/g;
  const d = new Date(); const cur = d.getHours() * 60 + d.getMinutes();
  let m, found = false;
  while ((m = re.exec(hours))) {
    found = true;
    let s = (+m[1]) * 60 + (+m[2]); let e = (+m[3]) * 60 + (+m[4]);
    if (e <= s) e += 1440;   // 跨夜(如 17:00–01:00)
    if ((cur >= s && cur <= e) || (cur + 1440 >= s && cur + 1440 <= e)) return true;
  }
  return found ? false : null;
}
function openMark(hours) { const o = isOpenNow(hours); return o === true ? '🟢 ' : o === false ? '🔴 ' : ''; }
function renderDetail() {
  if (!selected) { el.detail.hidden = true; return; }
  el.detail.hidden = false;
  if (selected.route) {
    const r = selected;
    const steps = r.included.map((p, i) => `<div class="r-step"><span class="r-num">${i + 1}</span>${esc(p.emoji)} ${esc(p.title || '(未命名)')}</div>`).join('');
    const total = r.included.length + r.dropped.length;
    const dropped = r.dropped.length ? `<div class="d-approx r-dropped" title="${esc(r.dropped.map((p) => p.title).join('、'))}">⚠ ${r.dropped.length}/${total} 未納入路線圖</div>` : '';
    el.detail.innerHTML = `
      <button class="detail-close" id="detailClose" type="button" title="關閉">✕</button>
      <div class="d-title">🧭 ${esc(r.groupName)} 路線</div>
      <div class="d-coord">${r.mode === 'd' ? '開車' : '單車'} · 依距離自動排序(最近鄰 + 2-opt)· 座標概略</div>
      <div class="r-steps">${steps}</div>${dropped}`;
    $('#detailClose').addEventListener('click', () => { selected = null; renderDetail(); renderList(); });
    return;
  }
  const p = selected;
  const tags = (p.tags || []).map((t) => `<span class="chip">${esc(t)}</span>`).join('');
  el.detail.innerHTML = `
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
  $('#detailClose').addEventListener('click', () => { selected = null; renderDetail(); renderList(); });
}
// 地圖 LRU 快取:切點時不重載——已看過的 iframe 只是隱藏,切回就顯示(極快)。
// lazy 建立;超過上限就移除「最久沒看」的那張(切換組時整批清掉)。
const MAP_CACHE_MAX = 6;   // 同組內最多保留幾張已載入的地圖(可調)
let mapCache = [];         // [{ key, el }],陣列尾端 = 最近使用
function showMapUrl(key, url) {
  let entry = mapCache.find((e) => e.key === key);
  if (entry) {
    mapCache = mapCache.filter((e) => e !== entry);          // 命中:拉到最近使用(不重載)
  } else {
    const f = document.createElement('iframe');
    f.className = 'map'; f.title = '地圖'; f.loading = 'lazy';
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    f.src = url;                                             // 只有新的才真的載入
    el.mapwrap.appendChild(f);
    entry = { key, el: f };
  }
  mapCache.push(entry);
  while (mapCache.length > MAP_CACHE_MAX) mapCache.shift().el.remove();   // 淘汰最久沒看的
  for (const e of mapCache) e.el.style.display = (e === entry) ? 'block' : 'none';
}
function showOnMap(lat, lng, z) { const zoom = z || 16; showMapUrl(`${lat},${lng},${zoom}`, embedUrl(lat, lng, zoom)); }

// 路線:起點用 center(沒有就用第一個點),最近鄰+2-opt 排序,上限 ROUTE_MAX_STOPS 站。
const ROUTE_MAX_STOPS = 10;
function buildRoute(g) {
  let startCoord, visit, lead;
  if (g.center) { startCoord = { lat: g.center.lat, lng: g.center.lng }; visit = g.points; lead = []; }
  else { startCoord = g.points[0]; visit = g.points.slice(1); lead = [g.points[0]]; }
  const allOrdered = [...lead, ...orderByRoute(visit, startCoord)];   // 資料點的路線順序(不含 center)
  const cap = g.center ? ROUTE_MAX_STOPS - 1 : ROUTE_MAX_STOPS;
  const included = allOrdered.slice(0, cap);
  const dropped = allOrdered.slice(cap);
  const stops = [];
  if (g.center) stops.push(startCoord);
  included.forEach((p) => stops.push({ lat: p.lat, lng: p.lng }));
  const span = stops.length > 1 ? Math.max(...stops.slice(1).map((s) => haversineKm(stops[0], s))) : 0;
  const mode = span > 1.5 ? 'd' : 'b';   // 點分散(>1.5km)用開車,否則單車——兩者都畫「線」,避免步行的大點點
  return { stops, included, dropped, mode, hasCenter: !!g.center };
}
function showRoute() {
  const g = current();
  const r = buildRoute(g);
  selected = { route: true, groupName: g.name, ...r };
  showMapUrl(`route:${g.id}:${g.points.length}:${r.mode}`, directionsEmbedUrl(r.stops, r.mode));
}
function clearMapCache() { for (const e of mapCache) e.el.remove(); mapCache = []; }
function showGroupDefault() {
  const g = current();
  if (g.points.length) showOnMap(g.points[0].lat, g.points[0].lng, g.points[0].z);
  else if (g.center) showOnMap(g.center.lat, g.center.lng, g.center.z);
  // 空組且無 center:不顯示(切組時已清快取)
}
function renderAll() { el.line2.value = user.line2; el.sort.value = user.sort; renderGroups(); renderControls(); selected = null; renderDetail(); renderList(); clearMapCache(); showGroupDefault(); }

// ── 搜尋 / 選點(加入用)──
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
  if (!el.title.value.trim() && loc.name) el.title.value = loc.name;   // 網址/搜尋有名稱就自動帶入標題
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
el.sort.addEventListener('change', () => { user.sort = el.sort.value; persist(); renderList(); });
el.search.addEventListener('click', doSearch);
el.q.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
el.results.addEventListener('click', (e) => { const t = e.target.closest('.r-item'); if (t) { const rr = results[+t.dataset.r]; setPick({ lat: rr.lat, lng: rr.lng, name: rr.label.split(',')[0].trim() }); } });
el.addPoint.addEventListener('click', addPoint);
el.list.addEventListener('click', (e) => {
  const del = e.target.closest('[data-del]');
  if (del) { const g = current(); g.points = g.points.filter((x) => x.id !== del.dataset.del); persist(); renderGroups(); renderList(); selected = null; renderDetail(); return; }
  if (e.target.closest('[data-route]')) { showRoute(); renderDetail(); renderList(); return; }
  const row = e.target.closest('.row');
  if (row) { const p = current().points.find((x) => x.id === row.dataset.id); if (p) { selected = p; renderDetail(); renderList(); showOnMap(p.lat, p.lng, p.z); } }
});
$('#newGroup').addEventListener('click', newGroup);
el.renameGroup.addEventListener('click', renameGroup);
el.delGroup.addEventListener('click', delGroup);
$('#exportJson').addEventListener('click', () => download(safeName(current().name) + '.json', groupToJSON(current()), 'application/json'));
$('#importBtn').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', (e) => { if (e.target.files[0]) importFile(e.target.files[0]); e.target.value = ''; });

init();
