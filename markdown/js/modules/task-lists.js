// 功能 module:markdown-it-task-lists(parse 型)。
// 清單 `- [ ]` / `- [x]` → 核取方塊(預覽中為唯讀,反映原始碼勾選狀態)。

import { registerModule } from '../registry.js';

registerModule({
  name: 'task-lists',
  type: 'parse',
  async apply(md) {
    const mod = await import('markdown-it-task-lists');
    md.use(mod.default || mod);
  },
});
