// mapview.js — 地圖呈現層。目前實作:免 API key 的 Google 崁入 iframe。
//
// 對外只露語意化介面:initMapView / showPoint / showRoute / clearMapView。
// 殼層(main.js)只呼叫這些,不碰任何 Google 細節 —— 未來要換成 Leaflet+OSM(見 README 計畫),
// 只要改寫這一支、維持同樣介面即可,其餘程式不用動。
//
// 內部用 LRU 快取:切點時已看過的 iframe 只是隱藏、切回即顯示(不重載);超過上限淘汰最久沒看的。

const MAP_CACHE_MAX = 6;   // 同時最多保留幾張已載入的地圖(可調)
let container = null;
let cache = [];            // [{ key, el }],陣列尾端 = 最近使用

export function initMapView(el) { container = el; }

// 顯示單一地點(免 key 的 q= 崁入)。
export function showPoint(lat, lng, z = 16) {
  showUrl(`p:${lat},${lng},${z}`, `https://maps.google.com/maps?q=${lat},${lng}&z=${z}&output=embed`);
}

// 顯示一條路線(免 key 的 saddr/daddr+to: 崁入)。stops:[{lat,lng}],mode 'b' 單車 / 'd' 開車。
export function showRoute(stops, mode = 'b') {
  const f = (s) => `${s.lat},${s.lng}`;
  const url = `https://maps.google.com/maps?saddr=${f(stops[0])}&daddr=${stops.slice(1).map(f).join('+to:')}&dirflg=${mode}&output=embed`;
  showUrl(`r:${stops.map(f).join('|')}:${mode}`, url);
}

// 清空所有地圖(切換組時用)。
export function clearMapView() { for (const e of cache) e.el.remove(); cache = []; }

// ── 內部:LRU iframe 快取 ──
function showUrl(key, url) {
  let entry = cache.find((e) => e.key === key);
  if (entry) {
    cache = cache.filter((e) => e !== entry);          // 命中:拉到最近使用(不重載)
  } else {
    const f = document.createElement('iframe');
    f.className = 'map'; f.title = '地圖'; f.loading = 'lazy';
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    f.src = url;                                        // 只有新的才真的載入
    container.appendChild(f);
    entry = { key, el: f };
  }
  cache.push(entry);
  while (cache.length > MAP_CACHE_MAX) cache.shift().el.remove();   // 淘汰最久沒看的
  for (const e of cache) e.el.style.display = (e === entry) ? 'block' : 'none';
}
