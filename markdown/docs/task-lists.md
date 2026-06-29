# ☑ markdown-it-task-lists

清單項目用 `- [ ]`(未完成)/ `- [x]`(完成)變成核取方塊。

- [x] 已完成的項目
- [ ] 待辦項目
- [ ] 另一個待辦
  - [x] 子項目也可以

**用途**:待辦清單、檢查清單。

> 預覽中的核取方塊是**唯讀**的(只反映原始碼的勾選);要改狀態請改原始碼的 `[ ]` / `[x]`。

**怎麼用**(`js/modules/task-lists.js`):

```js
const taskLists = (await import('markdown-it-task-lists')).default;
md.use(taskLists);
```
