// util.js — 共用小工具,跟「地圖引擎」「資料來源」都無關。

// HTML 轉義(放進 innerHTML 前用)。
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// 依營業時間字串粗判現在開/關 → 🟢 開、🔴 關、''(無法判斷)。
// 最佳努力:抓 HH:MM–HH:MM 時段(含跨夜)+ 每週固定休(closedDays);「24小時/全天」視為開。
// 不處理:依星期不同的時段(週一至五 … ;週六 …)只取時段聯集、月休 / 不定休 / 季節性。
export function openMark(hours, now = new Date()) {
  const o = isOpenNow(hours, now);
  return o === true ? '🟢 ' : o === false ? '🔴 ' : '';
}
function isOpenNow(hours, now) {
  if (!hours) return null;
  if (/24\s*小時|全天/.test(hours)) return true;
  const closed = closedDays(hours);
  const today = now.getDay(), yesterday = (today + 6) % 7;
  const re = /(\d{1,2}):(\d{2})\s*[–\-~〜]\s*(\d{1,2}):(\d{2})/g;
  const cur = now.getHours() * 60 + now.getMinutes();
  let m, found = false;
  while ((m = re.exec(hours))) {
    found = true;
    let s = (+m[1]) * 60 + (+m[2]); let e = (+m[3]) * 60 + (+m[4]);
    if (e <= s) e += 1440;   // 跨夜(如 17:00–01:00)
    if (!closed.has(today) && cur >= s && cur <= e) return true;                       // 今天的時段
    if (!closed.has(yesterday) && cur + 1440 >= s && cur + 1440 <= e) return true;     // 昨天跨夜延續到今天凌晨
  }
  if (found) return false;
  return closed.has(today) ? false : null;   // 沒寫時段、但今天是公休日 → 確定是關的
}

// 從營業時間字串抓出「每週固定休」的星期(0=日 … 6=六)。
// 認得:週一休 / 週二公休 / 週一休館 / 週日、一休 / 週六日休 / 週一二休 / 週二至四休。
// 「每月第4個週日休」是月休、「部分週一休」只有部分店家休 → 都不算整個點每週休。
const DAY = { 日: 0, 天: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 };
export function closedDays(hours) {
  const out = new Set();
  const re = /(?<!第.{1,2}個|部分)週([一二三四五六日天、至~～]+)公?休/g;
  let m;
  while ((m = re.exec(hours || ''))) {
    for (const part of m[1].split('、')) {
      const r = part.match(/^([一二三四五六日天])[至~～]([一二三四五六日天])$/);
      if (r) {                                         // 範圍(可跨週末:週五至日)
        for (let i = DAY[r[1]], n = 0; n < 7; i = (i + 1) % 7, n++) { out.add(i); if (i === DAY[r[2]]) break; }
      } else {
        for (const ch of part) if (ch in DAY) out.add(DAY[ch]);
      }
    }
  }
  return out;
}

// 資料新舊:checked = 最後一次上網查證(是否還在營業 / 地址 / 營業時間)的日期 YYYY-MM-DD。
// 超過 STALE_DAYS 沒查證就提示「可能過舊」(店家半年內改時間、搬家、歇業很常見)。
// scripts/stale.mjs 用同一個門檻列出該重查的點。
export const STALE_DAYS = 180;
export function checkedInfo(checked, now = new Date()) {
  if (!checked) return { text: '未記錄查證日', stale: true };
  const days = Math.floor((now - new Date(checked + 'T00:00:00')) / 86400000);
  return days > STALE_DAYS
    ? { text: `查證於 ${checked}(超過 ${Math.round(STALE_DAYS / 30)} 個月,資料可能過舊)`, stale: true }
    : { text: `查證於 ${checked}`, stale: false };
}

// 觸發瀏覽器下載一個文字檔。
export function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

// 把字串清成安全的檔名。
export const safeName = (s) => (s || 'map').replace(/[\\/:*?"<>|]+/g, '_');
