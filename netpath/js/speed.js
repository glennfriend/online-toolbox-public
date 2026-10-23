import { timedFetch, round } from './probe.js';
const MB = 1000000;

async function download(bytes, signal) {
  const result = await timedFetch(`https://speed.cloudflare.com/__down?bytes=${bytes}&netpath=${Date.now()}`, { signal, timeout: 25000 });
  if (!result.response.ok) throw new Error(`下載 HTTP ${result.response.status}`);
  if (result.body.byteLength !== bytes) throw new Error(`下載大小不符: ${result.body.byteLength} / ${bytes} bytes`);
  return { mbps: round(bytes * 8 / result.ms / 1000), ms: round(result.ms), bytes };
}
async function upload(signal) {
  // text/plain 為簡單 POST, 不觸發 application/octet-stream 的 CORS preflight
  const body = new Uint8Array(MB);
  const result = await timedFetch(`https://speed.cloudflare.com/__up?netpath=${Date.now()}`, { signal, timeout: 25000, method: 'POST', headers: { 'Content-Type': 'text/plain' }, body });
  if (!result.response.ok) throw new Error(`上傳 HTTP ${result.response.status}`);
  return { mbps: round(MB * 8 / result.ms / 1000), ms: round(result.ms), bytes: MB };
}
export async function measureSpeed(signal, update) {
  const record = { t: Date.now(), download: null, upload: null, errors: [] };
  update('下載 1 MB');
  try {
    record.download = await download(MB, signal);
    if (record.download.ms < 1500 && !signal.aborted) { update('下載 10 MB'); record.download = await download(10 * MB, signal); }
  } catch (error) { if (signal.aborted) throw error; record.errors.push(error.message); }
  if (signal.aborted) throw new DOMException('已暫停', 'AbortError');
  update('上傳 1 MB');
  try { record.upload = await upload(signal); }
  catch (error) { if (signal.aborted) throw error; record.errors.push(error.message); }
  return record;
}
