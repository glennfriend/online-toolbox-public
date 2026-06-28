// 功能 module:markdown-it-anchor(parse 型)。
// 為每個標題加 id,並在標題後面加可點的「#」。plugin 延遲載入 CDN,失敗則略過(核心照常)。

import { registerModule } from '../registry.js';

registerModule({
  name: 'anchor',
  type: 'parse',
  async apply(md) {
    const mod = await import('markdown-it-anchor');
    const anchor = mod.default || mod;
    const opts = {};
    if (anchor.permalink?.linkInsideHeader) {
      opts.permalink = anchor.permalink.linkInsideHeader({ symbol: '#', placement: 'after' });
    }
    md.use(anchor, opts);
  },
});
