// util.js — 共用小工具,跟「地圖引擎」「資料來源」都無關。

// HTML 轉義(放進 innerHTML 前用)。
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// 依營業時間字串粗判現在開/關 → 🟢 開、🔴 關、''(無法判斷)。
// 最佳努力:抓 HH:MM–HH:MM 時段(含跨夜)、「24小時/全天」視為開;不處理「週X公休」等日期條件。
export function openMark(hours) {
  const o = isOpenNow(hours);
  return o === true ? '🟢 ' : o === false ? '🔴 ' : '';
}
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

// 觸發瀏覽器下載一個文字檔。
export function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

// 把字串清成安全的檔名。
export const safeName = (s) => (s || 'map').replace(/[\\/:*?"<>|]+/g, '_');
