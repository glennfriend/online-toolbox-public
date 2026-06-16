// URL hash ⇄ 文字 的編解碼。可單獨替換:核心只認識 encode() / decode() 這組介面,
// 日後若要改成「壓縮 + Base64」等其他方案,只改本檔即可,main.js 不動。
//
// 方案:Base64(URL-safe)。
//   • 先 UTF-8 編碼再 Base64,中文 / emoji 都能正確還原(btoa 只吃 Latin-1,故需這層)。
//   • 用 - _ 取代 + /,去掉結尾 =,讓字串可直接放進網址不必再 percent-encode。

export function encode(text) {
  if (!text) return '';
  const utf8 = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of utf8) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function decode(str) {
  if (!str) return '';
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binary = atob(base64); // 內容壞掉會丟 DOMException,由呼叫端 try/catch
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
