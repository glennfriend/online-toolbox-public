// 功能 module:markdown-it-link-attributes(parse 型)。
// 讓所有連結自動加屬性:外部連結在新分頁開啟、加安全的 rel。

import { registerModule } from '../registry.js';

registerModule({
  name: 'link-attributes',
  type: 'parse',
  async apply(md) {
    const mod = await import('markdown-it-link-attributes');
    md.use(mod.default || mod, { attrs: { target: '_blank', rel: 'noopener noreferrer' } });
  },
});
