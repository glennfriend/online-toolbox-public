// io.js — 匯出 / 匯入(JSON only)+ 共用的「點正規化」。純函式。
// 一個檔 = 一組。JSON schema 同時是「給 AI agent 產生資料的契約」(見 README)。
import { validLatLng } from './geo.js';

// 把任意輸入正規化成標準的「點」。回傳 null 表示座標無效(會被濾掉)。
// 欄位:emoji / title / lat / lng / z / rating / address / hours / tags[] / note / approx(座標是否為概略)
export function normPoint(p) {
  if (!p) return null;
  const lat = +p.lat, lng = +p.lng;
  if (!validLatLng(lat, lng)) return null;
  const tags = Array.isArray(p.tags)
    ? p.tags.map((t) => String(t).trim()).filter(Boolean)
    : (p.tags ? String(p.tags).split(',').map((t) => t.trim()).filter(Boolean) : []);
  return {
    emoji: (p.emoji || '📍').toString().trim() || '📍',
    title: (p.title || '').toString().trim(),
    lat, lng, z: +p.z || 16,
    rating: (p.rating === 0 || p.rating) && Number.isFinite(+p.rating) ? +p.rating : null,
    address: (p.address || '').toString().trim(),
    hours: (p.hours || '').toString().trim(),
    tags,
    note: (p.note || '').toString(),
    approx: !!p.approx,
  };
}

// 一組 → JSON 字串(只輸出資料欄位,不含內部 id / builtin 旗標)。
export function groupToJSON(group) {
  return JSON.stringify({
    name: group.name,
    points: group.points.map((p) => clean({
      emoji: p.emoji, title: p.title, lat: p.lat, lng: p.lng, z: p.z || 16,
      rating: p.rating, address: p.address, hours: p.hours, tags: p.tags, note: p.note, approx: p.approx || undefined,
    })),
  }, null, 2);
}
// 拿掉空值,JSON 乾淨一點
function clean(o) {
  const out = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length)) continue;
    out[k] = v;
  }
  return out;
}

// JSON 檔內容 → { name, points }。接受 { name, points:[...] } 或直接是 points 陣列。
export function parseImport(filename, text) {
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : (data.points || []);
  const name = (Array.isArray(data) ? '' : data.name) || filename.replace(/\.[^.]+$/, '');
  return { name, points: arr.map(normPoint).filter(Boolean) };
}
