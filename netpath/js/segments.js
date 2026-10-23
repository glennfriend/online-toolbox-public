// 固定欄位讓歷史資料緊湊, 自訂目標使用最後三個欄位
export const SAMPLES = 3;
export const SEGMENTS = [
  { id: 'cdn', slot: 0, title: '最近的 CDN 節點', color: '#2563eb', url: 'https://speed.cloudflare.com/__down?bytes=0', note: 'CDN 是附近的內容配送站. 這裡量你到 Cloudflare 的來回時間' },
  { id: 'taiwan', slot: 1, title: '台灣機房', color: '#16836b', url: 'https://asia-east1-5tkroniexa-de.a.run.app/api/ping', note: '量你到台灣 Google Cloud 機房的來回時間' },
  { id: 'west', slot: 2, title: '海外 / 美西', color: '#b16a0c', url: 'https://us-west1-5tkroniexa-uw.a.run.app/api/ping', note: '量你到美國西岸機房的來回時間' },
  { id: 'east', slot: 3, title: '海外 / 美東', color: '#9054bd', url: 'https://us-east1-5tkroniexa-ue.a.run.app/api/ping', note: '量你到美國東岸機房的來回時間' },
];
const CUSTOM_COLORS = ['#bd4c69', '#587a19', '#087f98'];
export function targets(custom) {
  return [...SEGMENTS, ...custom.map(item => ({ ...item, id: `custom${item.slot}`, title: new URL(item.url).hostname, color: CUSTOM_COLORS[item.slot - 4], custom: true, note: '量自訂 URL 含重新導向的總時間. 只能讀總時間, 401 / 403 也算有回應' }))];
}
export function validateURL(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('請填 HTTPS URL, 並移除帳號與密碼');
  if (url.href.length > 2048) throw new Error('URL 最多 2048 字元');
  url.hash = '';
  return url.href;
}
