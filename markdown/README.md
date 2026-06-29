# Markdown

瀏覽器內的 Markdown 編輯/預覽工具:**本機文件庫(像 HackMD,邊打邊自動存)**、即時預覽、可切主題、多種功能模組(程式碼上色、表格工具、數學、Mermaid、Chart…)、可下載成單一 HTML。純前端、無後端、無 API key。

線上版:<https://glennfriend.github.io/online-toolbox-public/markdown/>

---

## 功能

- **即時預覽**:左邊寫 Markdown、右邊即時出 HTML(`breaks` 開啟:單一換行就斷行,像 HackMD)。
- **本機文件庫**:多份筆記存瀏覽器(localStorage),開啟即編輯、**改了自動存回**;標題取內容第一行。側欄上半是你的文件(依最近更新)、下半是內建示範(依名稱排序、不可刪)。
- **三種檢視**:左右並排 / 只編輯 / 只預覽;側欄可收合;編輯與預覽**捲動同步**。
- **主題**:`default`(clean)、`github`(官方 github-markdown-css),並排按鈕即時切換。
- **下載單一 HTML**:見下方〈下載 HTML〉。

### 功能模組(可插拔,各自獨立)

| 模組 | 作用 | 語法 |
|---|---|---|
| highlight | 程式碼上色(highlight.js) | ```` ```js ```` |
| codeblock | 程式碼右上角「語言名複製鈕」 | (自動) |
| json-format | JSON 自動以 2 空格格式化 | ```` ```json ```` |
| table-tools | 表格複製成 Markdown/Unicode/CSV/JSON + 欄寬拖曳記憶 | (自動,任何表格) |
| mark | 螢光標記 | `==文字==` |
| katex | 數學公式(KaTeX) | `$…$` / `$$…$$` |
| link-attributes | 外部連結開新分頁(站內 `#` 不受影響) | (自動) |
| task-lists | 任務清單 | `- [ ]` / `- [x]` |
| mermaid | 圖(渲染 + 5 種匯出:原始碼/PNG/SVG/Base64/複製圖片) | ```` ```mermaid ```` |
| chart | 圖表(宣告式,ECharts) | ```` ```chart ```` |

> 內建示範文件:總覽(功能示範)+ 各模組一份(打開就看效果與寫法)。

## 安全

預設 **`html: false`**:使用者寫的原始 HTML **一律當純文字**(escape),從根本避免 XSS。
日後若要允許部分原始 HTML,需改用「允許 + 消毒(DOMPurify 之類白名單)」,並把消毒器列為外部相依。

## 架構

純前端 ES modules,**核心(解析)與功能(模組)分離,功能可插拔**。

```
markdown/
├── index.html            外框 + import map(CDN 庫)+ 載入 js/main.js
├── styles.css            app 外框與三種檢視版面
├── themes/{default,github}.css   預覽內文樣式(套在 .md-preview;換主題=換檔)
├── docs/*.md             內建文件(同源 fetch 載入)
└── js/
    ├── main.js           殼層:文件庫/編輯/預覽/檢視/主題/側欄/捲動同步/下載 串接
    ├── renderer.js       markdown-it 薄 adapter(核心可抽換;html:false;breaks:true)
    ├── registry.js       模組登記表 + 隔離(try/catch:壞了只錯單一模組)
    ├── store.js          文件庫(localStorage:list/開啟/自動存/刪/內建保護)
    └── modules/*.js      各功能模組(見上表)
```

### 模組介面(可插拔的關鍵)

```js
registerModule({
  name,
  type,      // 'parse' | 'render' | 'post'
  apply,     // parse/render: apply(md)(可 async,plugin 多從 CDN 載);post: apply(rootEl)
  css,       // (選填)模組自帶的 CSS 字串
});
```

- **post**(對 render 後的 DOM 加工)隔離最好;**parse**(掛 markdown-it plugin)套用失敗則該模組失效,但其餘與整個程式照常。
- registry 對每個模組包 try/catch:**任一模組壞掉只記 console、略過,不讓整個程式掛掉。**
- 順序要求:會「接管程式碼區塊」的模組(mermaid、chart、json-format)需**先於** highlight/codeblock 註冊(見 `main.js` import 順序)。

### 外部相依(誠實列出,皆 CDN、延遲載入、抓不到誠實降級)

- 核心/上色:`markdown-it`、`highlight.js`
- plugin:`markdown-it-mark`、`@vscode/markdown-it-katex`(+ katex CSS)、`markdown-it-link-attributes`、`markdown-it-task-lists`
- 圖:`mermaid`、`echarts`(Chart 用,script tag 載入)
- 主題:`github` 主題 `@import` 自 `github-markdown-css`
- 自己寫的模組是本機檔,不需 CDN、不需建置。

## 下載 HTML

頂列「Download HTML」:把目前文件存成**單一 HTML**——內含 markdown 原文 + import map(CDN 庫)+ 以絕對網址引用本站 render 模組 + 當前主題。**開啟時(需連網)現場重渲染,效果與工具內一致**(連 ECharts 互動都在),檔案很小(~3KB,不打包 MB 級的庫)。

- 取捨:**需連網**才畫得出來;`![]()` 圖片走原網址連線(不內嵌)。
- 因引用本站 JS,本站網址變動會使舊檔失效(個人用可接受;要完全自包需改成「內嵌全部 JS」,檔案會大很多)。

## 部署

GitHub Pages,全相對路徑、無建置步驟,放在子路徑(`/markdown/`)即可。
