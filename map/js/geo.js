// geo.js — 地理相關純函式:解析座標、地名搜尋、產生免 key 的地圖嵌入網址。

// 從文字解析出經緯度。支援:
//   "lat,lng" 或 "lat,lng,zoom"(直接貼座標,含縮放也可)
//   Google Maps 連結:!3d!4d(店家精確座標,優先)> q=lat,lng > @lat,lng(地圖中心,退而求其次)
export function parseLatLng(text) {
  if (!text) return null;
  const t = text.trim();
  const pats = [
    /^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)(?:\s*,\s*-?\d+(?:\.\d+)?z?)?$/, // "lat,lng" / "lat,lng,zoom"
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,               // Google 地點精確座標(最準,優先)
    /[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,              // …?q=25.05,121.52
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,                   // …/@25.05,121.52,18z(地圖中心,退而求其次)
  ];
  for (const re of pats) {
    const m = t.match(re);
    if (m) {
      const lat = +m[1], lng = +m[2];
      if (validLatLng(lat, lng)) return { lat, lng };
    }
  }
  return null;
}

export function validLatLng(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

// 從 Google Maps 網址路徑 /maps/place/<名稱>/ 取出店名(URL 解碼)。取不到回空字串。
export function placeNameFromUrl(text) {
  const m = (text || '').match(/\/maps\/place\/([^/@]+)/);
  if (!m) return '';
  try { return decodeURIComponent(m[1]).replace(/\+/g, ' ').trim(); } catch { return ''; }
}

// 地名搜尋:用 OpenStreetMap 的 Nominatim(免 API key)。回傳 [{ label, lat, lng }]。
// 注意:Nominatim 使用政策限制每秒 ~1 次、需附識別資訊(瀏覽器會自動帶 Referer);僅供輕量人工搜尋。
export async function search(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('搜尋服務回應 ' + res.status);
  const data = await res.json();
  return data.map((d) => ({ label: d.display_name, lat: +d.lat, lng: +d.lon }));
}

// 免 key 的 Google 地圖嵌入網址(老牌、長年穩定的 output=embed 形式;可被 iframe 嵌入)。
export function embedUrl(lat, lng, z = 16) {
  return `https://maps.google.com/maps?q=${lat},${lng}&z=${z}&output=embed`;
}

// 球面直線距離(公里)。
export function haversineKm(a, b) {
  const R = 6371, rad = (d) => d * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// 路線排序:最近鄰(從 start 出發)+ 2-opt 解交叉。回傳 points 的排序(不含 start)。
export function orderByRoute(points, start) {
  const pts = points.slice();
  if (pts.length <= 1) return pts;
  const out = []; const rem = pts.slice(); let cur = start;
  while (rem.length) {                       // 最近鄰
    let bi = 0, bd = Infinity;
    for (let i = 0; i < rem.length; i++) { const d = haversineKm(cur, rem[i]); if (d < bd) { bd = d; bi = i; } }
    cur = rem[bi]; out.push(rem.splice(bi, 1)[0]);
  }
  const seq = [start, ...out];               // 2-opt(起點固定;開放路徑、不繞回起點)
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < seq.length - 1; i++) for (let k = i + 1; k < seq.length; k++) {
      const a = seq[i - 1], b = seq[i], c = seq[k], d = seq[k + 1];
      const before = haversineKm(a, b) + (d ? haversineKm(c, d) : 0);
      const after = haversineKm(a, c) + (d ? haversineKm(b, d) : 0);
      if (after + 1e-9 < before) { const rev = seq.slice(i, k + 1).reverse(); seq.splice(i, rev.length, ...rev); improved = true; }
    }
  }
  return seq.slice(1);
}

// 免 key 的「路線」嵌入網址(saddr/daddr + to: 多停點;mode 'w' 步行 / 'd' 開車)。
export function directionsEmbedUrl(stops, mode = 'w') {
  const f = (s) => `${s.lat},${s.lng}`;
  return `https://maps.google.com/maps?saddr=${f(stops[0])}&daddr=${stops.slice(1).map(f).join('+to:')}&dirflg=${mode}&output=embed`;
}
