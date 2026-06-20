# Pipeflow

貼上資料 → 程式偵測 **tags** → 推薦可用的轉換,點一下進到下一步,串成你要的資料管線。改第一格,後面全部跟著重算。純前端、零第三方相依、單頁應用。

線上版:<https://glennfriend.github.io/online-toolbox-public/pipeflow/>

---

## 功能目的

把零散的「整理 / 轉換 / 萃取」工作串成一條看得見的管線。每一步都是純函式轉換,前一步的輸出餵給下一步(像 Unix pipe 或 notebook 的 cell 鏈)。

- 貼上任何資料 → 自動判斷 **tags**(`csv` `tsv` `json` `markdown` `html` `mermaid` `sql` `url` `has-urls` `number-list`…);沒命中任何「可見」格式時才是 `text`(純文字)。另有隱藏的結構 tag(如 `multi-line`)只用來閘控 mod、不顯示成 chip。每個 tag 有 `desc`,滑鼠移上去看真正意思。
- 依 tags 列出**最可能用得到的轉換**,點一下就進到下一格,該格再產生自己的 tags 與可用轉換。
- **reactive**:改第一格輸入(或某步的參數),下游每一步都跟著重算。
- 目前是**線性鏈**(一條 cell→cell→cell);分支之後再加。
- 標題下有**範例按鈕**,一點即載入展示資料(可預設一整條管線,例如直接出 ER 圖)。

### 三種 mod:轉換 / 渲染 / 參數化

- **transform mod**(多數):`run(input, tags) → text`,**文字進、文字出**,輸出餵給下一步。
- **render mod**(如 Mermaid):**不改資料**,只是把這一步的文字「用圖顯示」。關鍵:**這一步的「資料」仍然是原本的文字(例如 mermaid 原始碼)**——所以
  - 若還要再轉換,一律是對**那份原始碼**做(不是對渲染出來的 SVG);
  - reactive 照常:改上游 → 圖跟著重畫;
  - 渲染出來的圖是**葉節點(終點)**,通常沒有再轉換的意義。
- **參數化 / 非同步 mod**(如 SQL 查詢):`param:true` 會在那一步顯示輸入框 + 「執行」鈕(參數存在 chain 裡,跟著 reactive);`async:true` 表示 `run` 是非同步(要等外部資源)。

### v1 的轉換(pipeline mod)

`轉成 JSON` / `轉成 Markdown 表格`、`a-z 排序` / `數字排序`(需多行;a-z 不套用 json/markdown/html/mermaid/sql)、`JSON 美化` / `JSON 縮成一行`、`統計資訊`、`萃取 urls`、`萃取有內容的連結`(HTML 專用)、`依第一欄分組加總`(純 JS)、`Schema → ER 圖`(SQL CREATE TABLE → mermaid erDiagram 文字,再接 `convert to Mermaid`;**容忍 phpMyAdmin / mysqldump 的雜訊**——自動略過 `--` / `#` / `/* */` 註解與 `INSERT`/`SET` 等非 DDL 語句,並正確處理 `) ENGINE=… AUTO_INCREMENT=…;` 收尾、表級 `PRIMARY KEY` 與 `CONSTRAINT … FOREIGN KEY`)、`convert to Mermaid`(render 類)、`SQL 查詢`(參數化 + 非同步,用 DuckDB-Wasm 對 CSV 下任意 SQL)。後兩類 + SQL 用到外部 CDN(見下)。每個 pipe 互相獨立、依 tags 出現。

### 效能與「絕不無聲」原則

- **debounce**(停止輸入 250ms 才重算)+ 只在真正變動時重算 → 打字不卡。
- 偵測 tags 跑在「已上限的輸入」上,永遠快。
- **輸入上限 ~2MB / 1 萬行**:超過就只處理前 N 行(取樣模式),並用**明顯橫幅**告知;下游每一步也標「基於取樣資料」。
- 唯讀結果太長只顯示前 N 行並註明行數。
- 原則:任何截斷 / 取樣 / 出錯都要在畫面講清楚,不讓使用者誤判或拿到錯資料。

---

## 結構

純前端 ES modules,自包含。核心(殼層 + 管線)與「tags」「mods」分離,兩者都可插拔。

```
pipeflow/
├── index.html            版面 + 載入 js/main.js
├── styles.css
└── js/
    ├── main.js           殼層:水平步驟列、debounce 重算、取樣/上限提示、串接
    ├── pipeline.js       核心:由「輸入 + mod 鏈」算出每個 step(純函式,不碰 DOM)
    ├── tags/
    │   ├── index.js      defineTag 登記 + detectTags + matchAny / matchAll
    │   └── defs.js        各 tag 定義(url / csv / tsv / json / markdown / number-list …)
    ├── examples.js       範例資料(可附預設管線 chain)
    ├── mods/
    │   ├── index.js      defineMod 登記 + modsFor(tags) + getMod
    │   ├── convert.js     轉 JSON / 轉 Markdown
    │   ├── sort.js        a-z / 數字排序
    │   ├── json.js        JSON 美化 / 縮成一行
    │   ├── stats.js       統計資訊
    │   ├── urls.js        萃取 urls / 萃取有內容的連結
    │   ├── groupby.js     依第一欄分組加總(純 JS)
    │   ├── schema.js      Schema → ER 圖(SQL CREATE TABLE → mermaid 文字)
    │   ├── diagram.js     convert to Mermaid  ← render 類,用外部 lib/mermaid.js
    │   └── sql.js         SQL 查詢  ← 參數化 + 非同步,用外部 lib/duckdb.js
    └── lib/              通用模組:dom / num / sample(上限取樣) / table(表格解析)
        ├── mermaid.js   【外部相依】CDN 載入 Mermaid
        └── duckdb.js    【外部相依】CDN 載入 DuckDB-Wasm(CSV 下任意 SQL)
```

### 兩層可插拔

- **新增一種 tag** = 在 `tags/defs.js` 多 `defineTag({ name, desc, match })`。`desc` 是這個 tag 的「真正意思」,會顯示在 UI 的滑鼠提示上(讀程式 / 用工具時都能確認語意,減少誤會)。`match` 用 `matchAny([regex…])`(任一中即可,多數情況)或 `matchAll([regex…])`(全部中才算,較嚴謹),也可傳自訂函式。不求極精確,只求不易誤判。
- **新增一種轉換** = 寫一個 `mods/xxx.js`,再到 `main.js` import。`appliesTo` 可是 `[tag…]`、`'*'`(永遠)或 `function(tags)->bool`;命中就出現在按鈕列,登記順序 = 按鈕優先序。兩種 mod:
  - transform:`defineMod({ id, label, appliesTo, run(input, tags) -> text })`(純函式)。
  - render:`defineMod({ id, label, appliesTo, kind:'render', render(input, container) })`(把圖畫進 container;不改資料)。
  - 參數化 / 非同步:加 `param:true`(+ `defaultParam` / `paramLabel`)會出現輸入框 + 「執行」;加 `async:true` 讓 `run` 可 `await`。
  - 用到外部 CDN 的 mod 加 `external:'名稱'`,UI 會自動顯示「使用外部資源」徽章。

### 外部相依(CDN,不內嵌)

只有兩個 mod 用到外部資源,各自集中在一個 lib 檔(其餘程式零相依),一眼看出是外部的、要換 library 只動那一檔;用到時 UI 會顯示「使用外部資源」徽章,錯誤也分「載入失敗」與「執行失敗」清楚顯示,方便除錯。

- **Mermaid**(`js/lib/mermaid.js`,`convert to Mermaid`):mermaid 原始碼 → 圖。載入失敗 →「無法載入外部 Mermaid…」;語法錯 →「Mermaid 無法繪製這段語法…(含 parse 位置)」。版本 `mermaid@11`。
- **DuckDB-Wasm**(`js/lib/duckdb.js`,`SQL 查詢`):把 CSV 當資料表 `t`、跑任意 SQL(`group by`/join…),回傳結果 CSV。載入失敗 →「無法載入外部 DuckDB-Wasm…」;查詢錯 →「SQL 執行失敗:…」。版本 `@duckdb/duckdb-wasm@1.29.0`。

要升級 / 更換,改對應 lib 檔頂端的 `CDN` 常數即可。

> 補充:`SQL Schema → ER 圖` **不需要** DB 引擎——純文字解析 `CREATE TABLE` → mermaid `erDiagram`,離線可用,再接 `convert to Mermaid` 即成 ER 圖。解析採「先去註解 → 括號配對切出欄位區塊」而非脆弱的 `)\s*;` 收尾,因此能直接吃 phpMyAdmin / mysqldump 匯出的整份檔(夾雜註解、`INSERT` 資料、`ENGINE=…` 表選項都自動略過)。

### 版面方向可換

`main.js` 的 `LAYOUT` 常數('row' 左到右 / 'col' 上到下)決定容器排法與箭頭方向;step 卡片本身不管方向,所以日後要改成上到下,只動這個常數與 CSS,邏輯不變。

---

## 已知取捨

- tag 偵測是啟發式;少數內容可能多貼或漏貼 tag(刻意不追求極精確)。
- CSV 解析用簡單切分(v1 不處理引號內逗號)。
- 重轉換目前在主執行緒跑;因輸入有上限,實務上夠快。真有超大需求再考慮 Web Worker。
- `convert to Mermaid` 與 `SQL 查詢 (DuckDB)` 需要連網(CDN);離線或 CDN 失效時會顯示載入錯誤,其餘功能不受影響。DuckDB 首次載入要下載較大的 WASM,會顯示「處理中…」。

## 本機開發

ES modules 需 HTTP server:

```bash
cd pipeflow && python3 -m http.server 8012   # 開 http://127.0.0.1:8012/
```

## 部署

GitHub Pages,全相對路徑、無建置步驟,放在子路徑(`/pipeflow/`)即可運作。
