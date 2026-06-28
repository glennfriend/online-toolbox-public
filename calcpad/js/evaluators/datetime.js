// 功能 2:國際日期計算。
//
//   <ISO 時間> + 2h + 30m + 30s   → 加減後的時間(沿用原本的時區 offset 顯示)
//   <ISO 時間> to Asia/Taipei      → 換算到指定 IANA 時區(用原生 Intl,含 DST)
//   <ISO 時間> to <ISO 時間>        → 兩個時間的期間(天/時/分/秒;絕對值)
//
// 零相依:時區換算完全交給瀏覽器內建的 Intl.DateTimeFormat。

import { registerEvaluator } from '../registry.js';
import { pad2 } from '../util.js';

// 行首的 ISO 日期 / 日期時間 token(時間、毫秒、時區 offset 皆選擇性)。
const LEADING_DATE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:[.,]\d+)?(?:Z|[+-]\d{2}:\d{2})?)?/;
// 加減運算:正負號 + 數字 + 單位(d 日 / h 時 / m 分 / s 秒)。
const DURATION = /[+-]\s*\d+(?:\.\d+)?\s*[dhms]\b/i;
// 時區轉換子句:to <時區名>。
const TO_TZ = /\bto\s+\S+/i;

const UNIT_MS = { d: 86400000, h: 3600000, m: 60000, s: 1000 };

registerEvaluator({
  name: 'datetime',
  // 認領條件:行首是日期,且後面接「加減運算」或「to 時區/日期」其一。
  // 光是一個裸日期(沒有運算)不認領 —— 避免把 2026-06-15 這種誤吞,也讓功能保持有意義。
  match: (line) => {
    if (!LEADING_DATE.test(line)) return false;
    const rest = line.replace(LEADING_DATE, '');
    return DURATION.test(rest) || TO_TZ.test(rest);
  },
  evaluate: (line) => {
    const token = line.match(LEADING_DATE)[0];
    const rest = line.slice(token.length).trim();
    const date = new Date(token.replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) throw new Error('看不懂的日期');

    if (/^to\b/i.test(rest)) return handleTo(date, rest);
    return applyDurations(date, token, rest);
  },
});

// to 後面是「日期」→ 算兩個時間的期間;否則當「時區名」做換算。
function handleTo(date, rest) {
  const operand = rest.replace(/^to\s+/i, '').trim();
  if (!operand) throw new Error('缺少時區或日期');
  const dm = operand.match(LEADING_DATE);
  if (dm && operand.slice(dm[0].length).trim() === '') {
    const other = new Date(dm[0].replace(' ', 'T'));
    if (Number.isNaN(other.getTime())) throw new Error('看不懂的日期');
    return formatDuration(date, other);
  }
  return convertTimezone(date, rest);
}

// 兩個瞬間的期間(絕對值),用 天/時/分/秒 表示,省略為 0 的高位單位。
function formatDuration(a, b) {
  let ms = Math.abs(b.getTime() - a.getTime());
  const d = Math.floor(ms / UNIT_MS.d); ms -= d * UNIT_MS.d;
  const h = Math.floor(ms / UNIT_MS.h); ms -= h * UNIT_MS.h;
  const m = Math.floor(ms / UNIT_MS.m); ms -= m * UNIT_MS.m;
  const s = Math.floor(ms / UNIT_MS.s);
  const parts = [];
  if (d) parts.push(`${d} 天`);
  if (h) parts.push(`${h} 時`);
  if (m) parts.push(`${m} 分`);
  if (s) parts.push(`${s} 秒`);
  return parts.length ? parts.join(' ') : '0 秒';
}

// <時間> to <IANA 時區> → 在該時區的當地時間(含 offset)。
function convertTimezone(date, rest) {
  const tz = rest.replace(/^to\s+/i, '').trim();
  if (!tz) throw new Error('缺少時區名');

  let parts;
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false, timeZoneName: 'longOffset',
    });
    parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  } catch {
    throw new Error(`未知的時區:${tz}`);
  }

  // longOffset 給 "GMT+08:00";UTC 時可能只給 "GMT",補成 "+00:00"。
  const offset = (parts.timeZoneName || '').replace('GMT', '') || '+00:00';
  // en-CA 的 hour 在午夜可能給 "24",正規化回 "00"。
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:${parts.second}${offset} (${tz})`;
}

// <時間> + 運算 → 套用所有加減,結果沿用原 token 的時區 offset 顯示(沒有 offset 則以 UTC)。
function applyDurations(date, token, rest) {
  const re = /([+-])\s*(\d+(?:\.\d+)?)\s*([dhms])\b/gi;
  let totalMs = 0;
  let matched = false;
  let consumed = 0;
  let m;
  while ((m = re.exec(rest)) !== null) {
    if (rest.slice(consumed, m.index).trim() !== '') throw new Error('看不懂的日期運算');
    matched = true;
    const sign = m[1] === '-' ? -1 : 1;
    totalMs += sign * Number(m[2]) * UNIT_MS[m[3].toLowerCase()];
    consumed = re.lastIndex;
  }
  if (!matched || rest.slice(consumed).trim() !== '') throw new Error('看不懂的日期運算');

  const result = new Date(date.getTime() + totalMs);
  return formatAtOffset(result, offsetMinutes(token));
}

// 從原 token 取出時區 offset(分鐘);沒有 offset / Z 則回 0。
function offsetMinutes(token) {
  if (/Z$/.test(token)) return 0;
  const m = token.match(/([+-])(\d{2}):(\d{2})$/);
  if (!m) return 0;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3]));
}

// 把某個瞬間(UTC)以指定 offset 表示成 ISO 8601 字串。
function formatAtOffset(date, offsetMin) {
  const shifted = new Date(date.getTime() + offsetMin * 60000);
  const body = `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`
    + `T${pad2(shifted.getUTCHours())}:${pad2(shifted.getUTCMinutes())}:${pad2(shifted.getUTCSeconds())}`;
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  return `${body}${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}
