import { registerCheck } from '../registry.js';
import { row, unsupported } from '../util.js';
registerCheck({
  id: 'timezone-ip', group: '網路與 IP', title: '時區與 IP 國家比對', needsNetwork: true, services: [], afterNetwork: true,
  run({ results }) {
    const data = results.get('ip-info');
    const country = data?.find(item => item.label === '國家')?.value;
    if (!/^[A-Z]{2}$/.test(country || '')) return [unsupported('時區與 IP 國家比對', 'IPinfo 未提供有效國家, 無法比對')];
    const locale = new Intl.Locale(`und-${country}`);
    const zones = locale.getTimeZones?.() ?? locale.timeZones;
    if (!zones?.length) return [unsupported('時區與 IP 國家比對', '瀏覽器未提供 Intl.Locale 國家時區清單, 無法可靠比對')];
    const canonical = zone => new Intl.DateTimeFormat('en', { timeZone: zone }).resolvedOptions().timeZone;
    const current = canonical(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const match = zones.some(zone => canonical(zone) === current);
    return [row('時區與 IP 國家比對', `${current} / ${country}: ${match ? '一致' : '不一致'}`, match ? '時區屬於該國的時區清單, 仍無法保證匿名' : '對方可能懷疑 VPN / Proxy. 手動時區設定或 IP 資料庫誤差也可能造成差異', 'caution')];
  },
});
