// io.js — 匯出 / 匯入(JSON only),純函式。
// 一個檔 = 一組。JSON schema 同時是「給 AI agent 產生資料的契約」(見 README)。
import { validLatLng } from './geo.js';

// 一組 → JSON 字串。
export function groupToJSON(group) {
  return JSON.stringify({
    name: group.name,
    points: group.points.map((p) => ({ emoji: p.emoji, title: p.title, note: p.note, lat: p.lat, lng: p.lng, z: p.z || 16 })),
  }, null, 2);
}

// JSON 檔內容 → { name, points }。接受 { name, points:[...] } 或直接是 points 陣列。
// points 會過濾掉無效座標。
export function parseImport(filename, text) {
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : (data.points || []);
  const name = (Array.isArray(data) ? '' : data.name) || filename.replace(/\.[^.]+$/, '');
  return { name, points: arr.map(normPoint).filter(Boolean) };
}

function normPoint(p) {
  if (!p) return null;
  const lat = +p.lat, lng = +p.lng;
  if (!validLatLng(lat, lng)) return null;
  return {
    emoji: (p.emoji || '📍').toString().trim() || '📍',
    title: (p.title || '').toString().trim(),
    note: (p.note || '').toString(),
    lat, lng, z: +p.z || 16,
  };
}
