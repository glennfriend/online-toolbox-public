import { registerCheck } from '../registry.js';
import { request, row } from '../util.js';
registerCheck({
  id: 'download', group: '網路與 IP', title: '到最近 Cloudflare 節點的下載速度', needsNetwork: true, services: ['speed.cloudflare.com'],
  async run() {
    const start = performance.now();
    const bytes = await request('https://speed.cloudflare.com/__down?bytes=1000000', 'bytes', 20000);
    const seconds = (performance.now() - start) / 1000;
    if (bytes.byteLength !== 1000000) throw new Error(`speed.cloudflare.com: 預期 1000000 bytes, 收到 ${bytes.byteLength}`);
    return [row('到最近 Cloudflare 節點的下載速度', `${(bytes.byteLength * 8 / seconds / 1000000).toFixed(2)} Mbps`, `下載 ${(bytes.byteLength / 1000000).toFixed(1)} MB, ${seconds.toFixed(2)} 秒. 含連線建立, 小樣本可能低估頻寬. 此結果僅代表最近節點`, 'caution')];
  },
});
