import { registerCheck } from '../registry.js';
import { normalizeIP, request, row } from '../util.js';
registerCheck({
  id: 'ip-info', group: '網路與 IP', title: 'IP 所在地與業者', needsNetwork: true, services: ['ipinfo.io'],
  async run() {
    const data = await request('https://ipinfo.io/json');
    normalizeIP(data.ip);
    return [row('IPinfo 對外 IP', data.ip), row('國家', data.country), row('城市 / 地區', [data.city, data.region].filter(Boolean).join(' / ') || '服務未提供', 'IP 資料庫推估, 無法當作精確位置'), row('ASN / 業者', data.org, 'ASN 業者名稱僅能粗略參考, 無法確認住宅或機房 IP'), row('IPinfo 時區', data.timezone)];
  },
});
