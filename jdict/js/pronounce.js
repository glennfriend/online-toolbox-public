// pronounce.js — 點 🔊 才發音(不預抓)。
//   • 優先:JapanesePod101 的真人錄音【外部相依、非官方網址,隨時可能失效 —— 見 README】
//     網址帶 寫法+讀音;有錄音會轉址到 mp3,沒有則回一段固定的「尚無錄音」提示音。
//     對方沒開 CORS,讀不到內容 → 用「長度」辨識那段提示音(約 5.69 秒),是它就不播。
//   • 退路:沒錄音 / 被擋 / 離線 → 瀏覽器內建日語語音(Web Speech),優先挑本機語音(離線可用)。

const JPOD = 'https://assets.languagepod101.com/dictionary/japanese/audiomp3.php';
const PLACEHOLDER_SEC = 5.69;   // 「尚無錄音」提示音長度(218 frames × 1152 / 44100)
const cache = new Map();        // 'kanji|kana' → true(有錄音)/ false(沒有)

let current = null;

function loadAudio(url) {
  return new Promise((resolve, reject) => {
    const a = new Audio();
    a.preload = 'auto';
    const t = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, 6000);
    const cleanup = () => { clearTimeout(t); a.onloadedmetadata = a.onerror = null; };
    a.onloadedmetadata = () => { cleanup(); resolve(a); };
    a.onerror = () => { cleanup(); reject(new Error('load error')); };
    a.src = url;
  });
}

async function playRecording(kanji, kana) {
  const id = kanji + '|' + kana;
  if (cache.get(id) === false) return false;
  if (!navigator.onLine) return false;
  const url = `${JPOD}?kanji=${encodeURIComponent(kanji || kana)}&kana=${encodeURIComponent(kana)}`;
  try {
    const a = await loadAudio(url);
    if (Math.abs(a.duration - PLACEHOLDER_SEC) < 0.2) { cache.set(id, false); return false; }
    cache.set(id, true);
    if (current) current.pause();
    current = a;
    await a.play();
    return true;
  } catch (_) {
    return false;
  }
}

function pickVoice() {
  const vs = speechSynthesis.getVoices().filter((v) => /^ja([-_]|$)/i.test(v.lang));
  return vs.find((v) => v.localService) || vs[0] || null;
}

function speak(text) {
  if (!('speechSynthesis' in window)) return 'none';
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    const v = pickVoice();
    if (v) u.voice = v;
    speechSynthesis.speak(u);
    return v ? 'speech' : 'speech-novoice';
  } catch (_) { return 'none'; }
}

// kanji:代表寫法(純假名詞傳 '');kana:讀音
export async function pronounce(kanji, kana) {
  if (await playRecording(kanji, kana)) return 'recording';
  return speak(kana || kanji);
}

// 給 UI 顯示用:這台裝置有沒有日語語音
export function hasJapaneseVoice() {
  return 'speechSynthesis' in window && !!pickVoice();
}
