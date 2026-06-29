# Markdown

用 Markdown 語法即時 render 成 HTML 顯示。**本機文件庫(像 HackMD,邊打邊自動存)**、三種檢視、可切主題、程式碼上色。純前端、無後端、無 API key。

線上版:<https://glennfriend.github.io/online-toolbox-public/markdown/>

---

## 功能

- **即時預覽**:左邊寫 Markdown,右邊即時出 HTML。
- **本機文件庫**:多份筆記存在瀏覽器(localStorage)。開啟某份 = 正在編輯它,**改了就自動存回那份**(概念同 HackMD;無暫存區、不走網址分享)。標題自動取內容第一行。
- **三種檢視**:左右並排 / 只編輯 / 只預覽。
- **主題可切**:`default`(GitHub 風,本機檔)、`github`(官方 github-markdown-css)。每個主題 = 一個 `themes/<name>.css`。
- **內建示範文件(不可刪、置頂)**:一份總覽 + 每個 plugin 各一份(`docs/*.md`),打開即看效果與用法。
- **功能 module(可插拔,各自獨立)**:
  - 程式碼上色(highlight.js)、程式碼工具列(語言名 + 複製)
  - 表格工具(複製成 Markdown / Unicode / CSV / JSON + 欄寬拖曳記憶)
  - Mermaid 圖(渲染 + 匯出:原始碼 / PNG / SVG / Base64 / 複製到剪貼簿)
  - Chart 圖表(宣告式 ```chart:radar/bar/line/pie,ECharts)
- **下載單一 HTML**(⬇ HTML):存 markdown 原文 + 引用本站 render 模組 + CDN 庫,開啟時(需連網)現場重渲染,效果與工具內一致;檔案很小。
  - 任務清單 `- [ ]`(markdown-it-task-lists)、螢光標記 `==…==`(markdown-it-mark)
  - 數學公式(@vscode/markdown-it-katex)、外部連結開新分頁(markdown-it-link-attributes)

## 安全(目前的決定)

**目前策略:全部 escape。** markdown-it 以 `html:false` 啟動 → 使用者寫的原始 HTML **一律當純文字**,從根本避免 XSS(render = 把 HTML 塞進 DOM,瀏覽器會執行其中的 `onerror` / `javascript:` 連結等)。

> 之後若要像 GitHub / HackMD 允許部分原始 HTML,**不能只 escape,要改成「允許 + 消毒(allowlist sanitizer)」**:HackMD/CodiMD 用 markdown-it + DOMPurify;GitHub 用 cmark-gfm + 白名單過濾。屆時參考其做法,並把消毒器列為誠實的外部相依。

## 架構

純前端 ES modules,**核心(解析)與功能(module)分離,功能可插拔**(沿用本 repo 的登記表模式)。

```
markdown/
├── index.html            外框 + import map(CDN 核心/plugin)+ 載入 js/main.js
├── styles.css            app 外框與三種檢視版面
├── themes/
│   ├── default.css       預覽內文樣式(GitHub 風,本機檔)
│   └── github.css        官方 github-markdown-css(CDN @import)
├── docs/                 內建文件(.md):demo + 各 plugin 示範(同源 fetch 載入)
└── js/
    ├── main.js           殼層:文件庫 / 編輯器 / 預覽 / 檢視模式 / 主題 / 內建文件 串接
    ├── renderer.js       markdown-it 薄 adapter(核心可抽換;html:false 安全基線)
    ├── registry.js       module 登記表 + 隔離(try/catch,壞了只錯單一 module)
    ├── store.js          文件庫(localStorage;內建文件 id 以 __ 開頭、不可刪、置頂)
    └── modules/          功能 module(可插拔)
        ├── mermaid.js          Mermaid 圖渲染 + 5 種匯出(post,需先於 highlight/codeblock)
        ├── highlight.js        程式碼上色(post)
        ├── codeblock.js        程式碼工具列:語言名 + 複製(post)
        ├── table-tools.js      表格:複製 Markdown/Unicode/CSV/JSON + 欄寬拖曳(post,純前端)
        ├── mark.js             ==螢光標記==(parse)
        ├── katex.js            數學公式(parse)
        ├── link-attributes.js  連結開新分頁(parse)
        └── task-lists.js       任務清單 - [ ] / - [x](parse)
```

### module 介面(可插拔的關鍵)

```js
registerModule({
  name: 'highlight',
  type: 'post',           // 'parse' | 'render' | 'post'
  apply,                  // parse/render: apply(md);  post: apply(rootEl)(可 async)
  css,                    // (選填)模組自帶的 CSS 字串
});
```

- **post**(對 render 後的 DOM 再加工)隔離最佳:單一元素失敗只影響它自己。**建議新功能優先用 post / render 規則覆寫**。
- **parse**(改 tokenizer)隔離較粗:套用失敗則該 module 失效,但其餘與整個程式照常。
- registry 對每個 module 包 try/catch:**任一 module 壞掉只記 console、略過,不讓整個程式掛掉。**

### 外部相依(誠實列出)

- 走 CDN(`index.html` 的 import map)、**延遲載入**,抓不到時誠實退回、外殼仍可用:
  - `markdown-it`(核心)、`highlight.js`(上色)
  - plugin:`markdown-it-mark`、`@vscode/markdown-it-katex`(+ `katex` CSS)、`markdown-it-link-attributes`、`markdown-it-task-lists`、`mermaid`
  - 註:`table-tools` 是純前端、無外部相依(自己讀 DOM 表格 + 複製/拖曳)
- CSS:`github` 主題 `@import` 自 `github-markdown-css`(CDN);`katex` 主題 CSS 由 katex module 注入。
- 自己寫的 module 是本機檔,不需 CDN、不需建置。

## 計畫(TODO)

- 更多功能 module:任務清單、callout 容器(`::: note`)、emoji、圖表(mermaid)…(各自獨立、逐一加)。
- 更多主題(含深色)。

## 部署

GitHub Pages,全相對路徑、無建置步驟,放在子路徑(`/markdown/`)即可。
