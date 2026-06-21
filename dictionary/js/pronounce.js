// pronounce.js — 點 🔊 才發音(發音不是最常用,所以「要的時候才打 API」,不預抓)。
//   • 優先:免費字典 API(dictionaryapi.dev)的真人錄音 mp3(免 key、CORS 可用)。
//   • 退路:該字無錄音、或瀏覽器擋播放 → 用內建語音(Web Speech),保證出聲。
//   • 抓過的網址快取在記憶體,同一字再點不重抓。

const API = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
const cache = new Map();   // 小寫word → url | null(查過無錄音)

async function fetchUrl(word) {
  if (cache.has(word)) return cache.get(word);
  let url = null;
  try {
    const r = await fetch(API + encodeURIComponent(word));
    if (r.ok) {
      const phons = (await r.json())[0]?.phonetics || [];
      const us = phons.find((p) => p.audio && /-us\.mp3$/i.test(p.audio));   // 偏好美式
      url = (us && us.audio) || (phons.find((p) => p.audio) || {}).audio || null;
    }
  } catch (_) { /* 網路/服務問題 → 當無錄音,交給內建語音 */ }
  cache.set(word, url);
  return url;
}

let current = null;

// 點擊時呼叫:有真人錄音就播,否則(或被擋)用內建語音。
export async function pronounce(word) {
  const w = (word || '').trim();
  if (!w) return null;
  const url = await fetchUrl(w.toLowerCase());
  if (url) {
    try { if (current) current.pause(); current = new Audio(url); await current.play(); return 'recording'; }
    catch (_) { /* 落到內建語音 */ }
  }
  if ('speechSynthesis' in window) {
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(w); u.lang = 'en-US'; speechSynthesis.speak(u); } catch (_) {}
  }
  return 'speech';
}
