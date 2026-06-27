// io.js — 匯出 / 匯入(JSON 為主、CSV 為輔),純函式。
// 一個檔 = 一組。JSON schema 同時是「給 AI agent 產生資料的契約」(見 README)。
import { validLatLng } from './geo.js';

// 一組 → JSON 字串。
export function groupToJSON(group) {
  return JSON.stringify({
    name: group.name,
    points: group.points.map((p) => ({ emoji: p.emoji, title: p.title, note: p.note, lat: p.lat, lng: p.lng, z: p.z || 16 })),
  }, null, 2);
}

// 一組 → CSV 字串(扁平,丟試算表用)。
export function groupToCSV(group) {
  const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const head = 'emoji,title,note,lat,lng';
  const rows = group.points.map((p) => [p.emoji, p.title, p.note, p.lat, p.lng].map(esc).join(','));
  return [head, ...rows].join('\n');
}

// 檔案內容 → { name, points }(自動判別 JSON / CSV)。points 已過濾掉無效座標。
export function parseImport(filename, text) {
  const trimmed = text.trim();
  const isJSON = /\.json$/i.test(filename) || trimmed.startsWith('{') || trimmed.startsWith('[');
  const baseName = filename.replace(/\.[^.]+$/, '');
  if (isJSON) {
    const data = JSON.parse(text);
    const arr = Array.isArray(data) ? data : (data.points || []);
    const name = (Array.isArray(data) ? '' : data.name) || baseName;
    return { name, points: arr.map(normPoint).filter(Boolean) };
  }
  const rows = parseCSV(text);
  if (!rows.length) return { name: baseName, points: [] };
  const head = rows.shift().map((h) => h.trim().toLowerCase());
  const col = (k) => head.indexOf(k);
  const points = rows
    .filter((r) => r.some((c) => c !== ''))
    .map((r) => normPoint({ emoji: r[col('emoji')], title: r[col('title')], note: r[col('note')], lat: r[col('lat')], lng: r[col('lng')] }))
    .filter(Boolean);
  return { name: baseName, points };
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

// 極簡 CSV 解析(處理引號跳脫與換行)。回傳二維陣列。
function parseCSV(text) {
  const rows = []; let row = [], field = '', quoted = false;
  const s = text.replace(/\r\n?/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}
