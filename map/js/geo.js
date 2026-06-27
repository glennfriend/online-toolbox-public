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
