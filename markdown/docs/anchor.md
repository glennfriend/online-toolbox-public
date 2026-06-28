# 🔗 markdown-it-anchor

為每個標題自動加上 `id`,並在標題後面加一個可點的 `#`(把滑鼠移到下面標題試試,點它會跳到該段並把連結放進網址)。

## 範例標題 A
## 範例標題 B

**用途**:文章內跳轉、產生目錄(TOC)、分享某個段落的連結。

**怎麼用**(本工具 `js/modules/anchor.js`):

```js
const anchor = (await import('markdown-it-anchor')).default;
md.use(anchor, {
  permalink: anchor.permalink.linkInsideHeader({ symbol: '#', placement: 'after' }),
});
```
