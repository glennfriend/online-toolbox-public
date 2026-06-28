// 功能 module:markdown-it-mark(parse 型)。==文字== → <mark> 螢光標記。

import { registerModule } from '../registry.js';

registerModule({
  name: 'mark',
  type: 'parse',
  async apply(md) {
    const mod = await import('markdown-it-mark');
    md.use(mod.default || mod);
  },
});
