# 🔗 markdown-it-link-attributes

讓所有連結自動加屬性。本工具設定為:**外部連結在新分頁開啟**,並加上安全的 `rel`。

範例:[這個連結會開新分頁](https://markdown-it.github.io/)

**用途**:外部連結開新分頁、加 `rel="noopener noreferrer"` 防止 tabnabbing(新分頁竄改原頁)。

**怎麼用**(`js/modules/link-attributes.js`):

```js
const la = (await import('markdown-it-link-attributes')).default;
md.use(la, { attrs: { target: '_blank', rel: 'noopener noreferrer' } });
```
