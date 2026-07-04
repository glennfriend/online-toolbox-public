// URL hash ⇄ 文字 的編解碼(與 calcpad 同一套)。小改動即時編進網址,可分享、可重現。
//   UTF-8 → Base64(URL-safe:- _ 取代 + /,去掉結尾 =),中文/emoji 都能還原。

export function encode(text) {
  if (!text) return '';
  const utf8 = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of utf8) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decode(str) {
  if (!str) return '';
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
