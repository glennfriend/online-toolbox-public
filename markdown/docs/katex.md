# ∑ 數學公式(@vscode/markdown-it-katex)

行內公式:$E = mc^2$、$\sqrt{a^2 + b^2}$

區塊公式:

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

**用途**:數學 / 科學筆記。引擎用 **KaTeX**(快、純前端;模組會自動載入 KaTeX 的 CSS)。

**怎麼用**(`js/modules/katex.js`):

```js
const katex = (await import('@vscode/markdown-it-katex')).default;
md.use(katex);
```
