// pronounce.js — 點一下發音。
//   • 優先:免費字典 API(dictionaryapi.dev)的「真人錄音」mp3(外部資源,免 key、CORS 可用)。
//   • 退路:瀏覽器內建語音(Web Speech),保證每個字都能出聲。
//   • 為了點擊能「即時」播(不被 await 卡掉使用者手勢),渲染時先 prefetch 錄音網址;
//     點擊時若已取到就直接播真人錄音,否則先用內建語音、同時背景補抓。

const API = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
const cache = new Map();   // 小寫word → url(string) | null(查過但無錄音) | undefined(還沒查)

async function fetchUrl(word) {
  let url = null;
  try {
    const r = await fetch(API + encodeURIComponent(word));
    if (r.ok) {
      const phons = (await r.json())[0]?.phonetics || [];
      const us = phons.find((p) => p.audio && /-us\.mp3$/i.test(p.audio));   // 偏好美式
      url = (us && us.audio) || (phons.find((p) => p.audio) || {}).audio || null;
    }
  } catch (_) { /* 網路/服務問題 → 當作無錄音,交給內建語音 */ }
  cache.set(word, url);
  return url;
}

// 渲染時呼叫:先把錄音網址抓好,等使用者點就能立刻播。
export function prefetch(word) {
  const w = (word || '').toLowerCase();
  if (!w || cache.has(w)) return;
  fetchUrl(w);
}

let current = null;

// 點擊時呼叫(同步,保住使用者手勢)。回傳 'recording' | 'speech' | null。
export function pronounce(word) {
  const w = (word || '').trim();
  if (!w) return null;
  const lc = w.toLowerCase();

  const url = cache.get(lc);                 // 已預取到的真人錄音(undefined/null 則沒有)
  if (url) {
    try { if (current) current.pause(); current = new Audio(url); current.play(); return 'recording'; }
    catch (_) { /* 落到內建語音 */ }
  }

  if ('speechSynthesis' in window) {
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(w); u.lang = 'en-US'; speechSynthesis.speak(u); }
    catch (_) {}
  }
  if (!cache.has(lc)) fetchUrl(lc);          // 背景補抓,下次點就有真人錄音
  return 'speech';
}
