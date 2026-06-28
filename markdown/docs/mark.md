# 🖊 markdown-it-mark

用 `==文字==` 產生螢光標記(輸出 `<mark>`)。

範例:這是 ==重點== 文字,也可以 ==標記一整句話==。

**用途**:像螢光筆一樣標重點。

**怎麼用**(`js/modules/mark.js`):

```js
const mark = (await import('markdown-it-mark')).default;
md.use(mark);
```
