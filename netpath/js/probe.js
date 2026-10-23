import { SAMPLES } from './segments.js';
export const round = value => Math.round(value * 10) / 10;
export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// timeout 包含 body, 暫停時中止目前請求. 每次呼叫都移除 listener
export async function timedFetch(url, { signal, timeout = 6000, ...options } = {}) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  if (signal?.aborted) cancel();
  const timer = setTimeout(cancel, timeout);
  const start = performance.now();
  try {
    const response = await fetch(url, { mode: 'cors', cache: 'no-store', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', ...options, signal: controller.signal });
    const body = await response.arrayBuffer();
    const ms = performance.now() - start;
    return { response, body, ms };
  } catch (error) {
    if (signal?.aborted) throw new DOMException('已暫停', 'AbortError');
    throw new Error(controller.signal.aborted ? `逾時 (${timeout / 1000} 秒)` : error instanceof TypeError ? '網路 / CORS / 重新導向失敗, 瀏覽器未提供狀態碼' : error.message);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

function resourceDetails(url, result) {
  const entry = performance.getEntriesByName(url, 'resource').at(-1);
  const header = result.response.headers.get('server-timing') || '';
  const duration = /(?:^|,)\s*cfRequestDuration\s*;\s*dur=([\d.]+)/i.exec(header);
  // 只扣明確的 cfRequestDuration, 不把可能重疊的其他 duration 相加
  const server = duration ? Number(duration[1]) : entry?.serverTiming?.find(item => item.name === 'cfRequestDuration')?.duration;
  const ray = result.response.headers.get('cf-ray');
  const colo = result.response.headers.get('cf-meta-colo') || ray?.split('-').at(-1);
  const timing = entry?.requestStart > 0 ? {
    dns: round(entry.domainLookupEnd - entry.domainLookupStart),
    tcp: round((entry.secureConnectionStart > 0 ? entry.secureConnectionStart : entry.connectEnd) - entry.connectStart),
    tls: entry.secureConnectionStart > 0 ? round(entry.connectEnd - entry.secureConnectionStart) : 0,
    ttfb: round(entry.responseStart - entry.requestStart),
  } : null;
  return { timing, server: Number.isFinite(server) ? round(server) : null, adjusted: Number.isFinite(server) ? round(Math.max(0, result.ms - server)) : null, colo: colo || null };
}

export async function probe(target, signal) {
  const values = [], errors = [];
  let detail = null;
  for (let index = 0; index < SAMPLES; index++) {
    if (signal.aborted) throw new DOMException('已暫停', 'AbortError');
    // 自訂網址保留原 query, 避免破壞簽章 URL
    const url = new URL(target.url);
    if (!target.custom) url.searchParams.set('netpath', `${Date.now()}-${index}`);
    try {
      const result = await timedFetch(url.href, { signal, mode: target.custom ? 'no-cors' : 'cors', redirect: target.custom ? 'follow' : 'error' });
      if (!target.custom && !result.response.ok) throw new Error(`HTTP ${result.response.status}`);
      values.push(result.ms);
      if (!target.custom) detail = resourceDetails(url.href, result);
    } catch (error) {
      if (signal.aborted) throw error;
      errors.push(error.message);
    }
  }
  return { ms: values.length >= 2 ? round(median(values)) : null, failed: errors.length, detail, error: [...new Set(errors)].join('; ') || (target.custom ? 'no-cors: 401 / 403 也算有回應, 狀態碼不可讀. 不保證伺服器正常' : '') };
}

export async function readColo(signal) {
  const { response, body } = await timedFetch(`https://1.1.1.1/cdn-cgi/trace?netpath=${Date.now()}`, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  // trace 含 IP, 僅擷取 colo, 不保存原文與其他欄位
  return /^colo=([A-Z0-9]+)$/m.exec(new TextDecoder().decode(body))?.[1] || '未提供';
}
