// 功能 module:JSON 自動格式化(post 型)。
// 對 ```json 區塊,合法 JSON → 以 2 空格縮排重排;非合法 JSON 原樣保留。
// 必須先於 highlight 註冊(main.js import 順序),格式化後才上色。

import { registerModule } from '../registry.js';

registerModule({
  name: 'json-format',
  type: 'post',
  apply(root) {
    root.querySelectorAll('pre > code.language-json').forEach((code) => {
      const text = code.textContent;
      try {
        const formatted = JSON.stringify(JSON.parse(text), null, 2);
        if (formatted !== text) code.textContent = formatted;
      } catch {
        // 不是合法 JSON,原樣保留(不破壞使用者內容)
      }
    });
  },
});
