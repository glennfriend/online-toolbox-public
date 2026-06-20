// translate.js — 【外部相依】文字翻譯,使用公開端點,不內嵌在本專案。
//
// 主引擎:Google 非官方端點(translate_a/single,client=gtx)——實測瀏覽器可直接呼叫(CORS 通)、品質好。
// 備援:MyMemory(有文件、CORS 友善)——Google 被限流(429)/失效時自動改用。
//
// 老實說:Google 這個端點是「非官方、不保證」的——它哪天改版 / 擋 IP 就會失效。
// 但相依集中在這一個檔(其餘程式零相依),要換引擎只動這裡;失敗也會丟出清楚錯誤,不會默默吞掉。

const GOOGLE = 'https://translate.googleapis.com/translate_a/single';
const MYMEMORY = 'https://api.mymemory.translated.net/get';
const MAX = 4500; // 單次請求的字數上限(超過就按句界切塊,逐塊翻譯再接回)

// 把一段文字按句界切成不超過 max 的塊(避免單次請求過長被端點截斷)
function chunk(text, max) {
  if (text.length <= max) return [text];
  const sentences = text.split(/(?<=[.!?。!?\n])\s+/); // 句界:標點或換行後
  const out = [];
  let cur = '';
  for (const s of sentences) {
    if (cur && (cur + ' ' + s).length > max) { out.push(cur); cur = s; }
    else cur = cur ? cur + ' ' + s : s;
  }
  if (cur) out.push(cur);
  // 仍有超長單句(沒有句界可切)→ 硬切,確保每塊都在上限內
  return out.flatMap((s) => (s.length <= max ? [s] : s.match(new RegExp('[\\s\\S]{1,' + max + '}', 'g')) || [s]));
}

async function googleOnce(text, tl) {
  const url = `${GOOGLE}?client=gtx&sl=auto&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('Google 端點回應 ' + r.status);
  const data = await r.json();
  // data[0] = [[譯文片段, 原文片段, …], …];把每段譯文接起來就是完整翻譯
  return (data[0] || []).map((seg) => seg[0] || '').join('');
}

async function mymemoryOnce(text, tl) {
  const url = `${MYMEMORY}?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent('en|' + tl)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('MyMemory 回應 ' + r.status);
  const data = await r.json();
  const status = Number(data.responseStatus);
  if (status && status !== 200) throw new Error('MyMemory:' + (data.responseDetails || status));
  return (data.responseData && data.responseData.translatedText) || '';
}

// 翻譯一整段(內部會視長度切塊)。主用 Google,整段失敗才退 MyMemory;兩者都失敗 → 丟出清楚錯誤。
export async function translateText(text, tl) {
  const parts = chunk(text, MAX);
  const out = [];
  for (const p of parts) {
    try {
      out.push(await googleOnce(p, tl));
    } catch (e1) {
      try {
        out.push(await mymemoryOnce(p, tl));
      } catch (e2) {
        throw new Error('翻譯失敗(Google:' + e1.message + ';備援 MyMemory:' + e2.message + ')');
      }
    }
  }
  return out.join('');
}
