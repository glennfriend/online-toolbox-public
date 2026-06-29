// 功能 module:markdown-it-link-attributes(parse 型)。
// 只對「外部 http(s) 連結」加 target=_blank + 安全 rel;
// 站內錨點(#…)與相對連結不受影響(否則 # 會被開成新分頁,該留在本頁往下跳)。

import { registerModule } from '../registry.js';

registerModule({
  name: 'link-attributes',
  type: 'parse',
  async apply(md) {
    const mod = await import('markdown-it-link-attributes');
    md.use(mod.default || mod, {
      matcher: (href) => /^https?:\/\//i.test(href),
      attrs: { target: '_blank', rel: 'noopener noreferrer' },
    });
  },
});
