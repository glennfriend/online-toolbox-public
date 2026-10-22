import { registerCheck } from '../registry.js';
import { collectSources, normalizeIP, request, row } from '../util.js';

const traces = ['https://claude.ai/cdn-cgi/trace', 'https://1.1.1.1/cdn-cgi/trace'];
const ipify = ['https://api.ipify.org?format=json', 'https://api64.ipify.org?format=json'];
registerCheck({
  id: 'public-ip', group: '網路與 IP', title: '對外 IP 多來源比對', needsNetwork: true,
  services: [...traces, ...ipify].map(url => new URL(url).hostname),
  async run() {
    const sources = await collectSources([
      ...traces.map(url => ({ url, read: async () => {
        const data = Object.fromEntries((await request(url, 'text')).trim().split('\n').map(line => {
          const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1)];
        }));
        return { ip: normalizeIP(data.ip), note: `Cloudflare colo: ${data.colo || '未提供'}, loc: ${data.loc || '未提供'}` };
      } })),
      ...ipify.map(url => ({ url, read: async () => ({ ip: normalizeIP((await request(url)).ip), note: url.includes('api64') ? 'IPv4 / IPv6 雙協定來源, 回應含冒號才表示這次使用 IPv6' : 'IPv4 專用來源' }) })),
    ]);
    const rows = sources.map(({ source, data, error }) => error
      ? row(new URL(source.url).hostname, error, '', 'error')
      : row(new URL(source.url).hostname, data.ip, data.note));
    const ok = sources.filter(item => item.data);
    const families = [false, true].map(v6 => ok.filter(item => item.data.ip.includes(':') === v6));
    const mismatch = families.some(items => new Set(items.map(item => item.data.ip)).size > 1);
    const comparable = families.some(items => items.length >= 2);
    rows.push(row('來源比對', !comparable ? '同一協定有效來源不足, 無法比對' : mismatch ? '同一協定 IP 不同, 可能分流或代理不一致' : '目前有效來源的同一協定 IP 一致', 'IPv4 與 IPv6 分開比對. 一致仍無法保證匿名, 不同協定使用不同 IP 屬正常', 'caution'));
    return rows;
  },
});
