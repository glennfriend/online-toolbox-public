export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
export async function hash(value) {
  if (!globalThis.crypto?.subtle) throw new Error('SHA-256 需要 HTTPS 或 localhost 與 crypto.subtle');
  const bytes = new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
export function row(label, value, note = '', level = 'exposed') {
  const missing = value === undefined || value === null;
  return { label, value: missing ? '瀏覽器未提供' : String(value), note, level: missing ? 'caution' : level };
}
export const unsupported = (label, note) => row(label, '未提供檢測', note, 'caution');
export const showBoolean = value => value === undefined ? '瀏覽器未提供' : value ? '是' : '否';
export function deadline(promise, ms, label) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label}: 逾時 (${ms / 1000} 秒)`)), ms); })]).finally(() => clearTimeout(timer));
}
// 不帶 Cookie, 不送 Referer, 禁止重新導向至未告知的其他服務
// timeout 包含讀取 body. 瀏覽器無法揭露 CORS 或網路錯誤背後的 HTTP 狀態
export async function request(url, format = 'json', ms = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', redirect: 'error', signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
    return format === 'bytes' ? await response.arrayBuffer() : format === 'text' ? await response.text() : await response.json();
  } catch (error) {
    const detail = controller.signal.aborted ? `逾時 (${ms / 1000} 秒)` : error instanceof TypeError ? '網路或 CORS 失敗 (瀏覽器未提供 HTTP 狀態)' : error.message;
    throw new Error(`${url}: ${detail}`);
  } finally { clearTimeout(timer); }
}
export async function collectSources(sources) {
  return Promise.all(sources.map(async source => {
    try { return { source, data: await source.read() }; }
    catch (error) { return { source, error: error.message }; }
  }));
}
export function normalizeIP(value) {
  const ip = String(value ?? '').trim();
  // URL parser 正規化 IPv6 壓縮形式, 讓不同來源的寫法可比較
  if (/^[\da-f:.]+$/i.test(ip) && ip.includes(':')) {
    try { return new URL(`https://[${ip}]/`).hostname.slice(1, -1).toLowerCase(); } catch { /* 下方統一報錯 */ }
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip) && ip.split('.').every(part => Number(part) <= 255)) return ip;
  throw new Error('回應缺少有效 IP');
}
