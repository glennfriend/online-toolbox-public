import { registerCheck } from '../registry.js';
import { request, row } from '../util.js';
registerCheck({
  id: 'headers', group: '網路與 IP', title: '伺服器看到的 HTTP headers', needsNetwork: true, services: ['httpbin.org'],
  async run() {
    const data = await request('https://httpbin.org/headers');
    if (!data.headers || typeof data.headers !== 'object') throw new Error('httpbin.org: 回應缺少 headers');
    return [row('HTTP request headers', JSON.stringify(data.headers, null, 2), '這是 httpbin.org 對本次跨來源 fetch 的回報. 導覽請求或其他網站的 headers 可能不同, 代理也可能改寫或加入 headers')];
  },
});
