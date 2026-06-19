# Chart

貼上資料(JSON / CSV / 從 Excel·Google Sheet 複製的 TSV / Markdown 表格),選欄位與圖種,產生**清楚的靜態統計圖**:數值直接標在圖上,不用互動也看得到全部資訊。可匯出 PNG / SVG。

線上版:<https://glennfriend.github.io/online-toolbox-public/chart/>

---

## 功能目的

把「我手上有一份資料,想看成圖」變成:貼上 → 選 X/Y/圖種 → 出圖。設計重點:

- **任何常見格式都能貼**:JSON(物件陣列 / 陣列的陣列 / 物件含陣列)、CSV、TSV(Excel、Google Sheet 直接複製就是 Tab 分隔)、Markdown 表格。格式自動偵測,猜錯可手動指定。
- **同一份資料可切換任何圖種**:長條 / 橫條 / 折線 / 區域 / 圓餅 / 環圈 / 散布 / 雷達。
- **靜態、資訊攤開**:關動畫、數值直接標在圖上、圖例常駐——不用滑、不用點就看得完(刻意不做互動:互動代表「不互動就看不到全部」)。
- **重複類別自動彙總**:選的類別欄(X)若有重複(像原始明細裡「蘋果」出現多次),自動依類別合併(預設加總,可改平均 / 計數)——所以原始明細也能直接畫,不用先自己整理。
- 匯出 **PNG**(點陣)或 **SVG**(向量,可無限放大)。
- **儲存庫**:把目前輸入的資料存進瀏覽器本機(IndexedDB),之後點一下即可回填、可刪除(同 scrapbook 的儲存,但不需要「暫存」)。
- **範例**:標題列右側的「範例…」下拉,選 JSON / CSV / TSV / Markdown 任一,直接把示範資料載入輸入區。

> 目前是 Phase 1:解析 + 選欄位 + 出圖,涵蓋多數情況。更進階的重塑(長↔寬 pivot、跨欄轉置等)之後再加。

## 圖表函式庫:ECharts(CDN 優先,自帶本地備援)

本工具用 [Apache ECharts](https://echarts.apache.org/) 繪圖(其他工具是零第三方相依,**這個是刻意的例外**——自己重刻一套圖表庫不切實際)。載入策略(見 `js/echarts-loader.js`):

1. **先載 CDN**(`cdn.jsdelivr.net/npm/echarts`):有網路時快、可能跨站快取。
2. **CDN 失敗就載本地自帶的 `vendor/echarts.min.js`**:確保 CDN 掛掉、被擋、或離線時,工具**永遠能用**。

代價:repo 裡多一個約 1MB 的 `vendor/echarts.min.js`。要升級 ECharts 版本時,同時更新 `vendor/echarts.min.js` 與 `echarts-loader.js` 裡的 CDN 版本號。

---

## 結構

純前端 ES modules,自包含。核心(殼層)與「輸入格式解析」「圖種」分離,兩者都可插拔。

```
chart/
├── index.html              版面 + 載入 js/main.js
├── styles.css
├── vendor/echarts.min.js   自帶的 ECharts(CDN 失敗時的備援)
└── js/
    ├── main.js             殼層:貼資料 → 偵測/解析 → 顯示表 → 選 X/Y/圖種 → 出圖 → 匯出
    ├── echarts-loader.js   載入 ECharts(CDN 優先、失敗用本地)
    ├── detect.js           輸入格式偵測(json / tsv / csv / markdown)
    ├── table.js            統一二維表模型 + 型別判斷 + 依類別彙總(group-by)
    ├── parse/              每種輸入格式一個解析器(可插拔)→ 統一表
    │   ├── index.js        解析派發 parse(raw, format)
    │   ├── json.js         JSON 三種常見形狀
    │   ├── delimited.js    CSV / TSV(共用,支援引號跳脫)
    │   └── markdown.js     Markdown 表格
    └── charts/             每種圖一個模組(可插拔):(table, mapping) → ECharts option
        ├── index.js        圖種登記表 CHARTS + getChart
        ├── base.js         共用 option 基底(靜態:關動畫、值標在圖上、配色)
        ├── bar.js          長條 / 橫條
        ├── line.js         折線 / 區域
        ├── pie.js          圓餅 / 環圈
        ├── scatter.js      散布
        └── radar.js        雷達
```

### 資料管線

```
原始文字
  → detect.js 偵測格式(或使用者手動指定)
  → parse/ 對應解析器        → 統一二維表 { columns:[{name,type}], rows:[...] }
  → table.js 依 X 欄彙總 Y 欄  → { categories, series }
  → charts/ 對應圖種 build()  → ECharts option
  → 繪圖 / 匯出
```

「統一二維表」是整條管線的腰桿:不管原始是什麼格式,都先變成它;之後所有圖種都只認它。

### 兩層可插拔

- **新增輸入格式** = 寫一個 `parse/xxx.js`(回傳統一表),在 `parse/index.js` 的 `PARSERS` 加一筆。
- **新增圖種** = 寫一個 `charts/xxx.js`(`build(table, mapping)` 回傳 ECharts option),在 `charts/index.js` 的 `CHARTS` 加一筆。
- 兩者核心(`main.js`)都不用動。

### 欄位對應 `mapping`

圖種拿到的 `mapping = { xIdx, yIdxs:[...], agg }`:`xIdx` 是類別欄、`yIdxs` 是一或多個數值欄、`agg` 是重複類別的彙總方式(`sum`/`avg`/`count`)。各圖種自己決定怎麼用(例:圓餅只用第一個 Y;散布把 X 與第一個 Y 當兩個數值座標;雷達把多個 Y 當各指標)。

---

## 已知取捨

- 型別判斷是啟發式(整欄都是數字才當數值欄;日期目前當文字標籤)。
- 散布圖的 X 欄最好是數值;雷達圖適合「少數幾列 × 多個數值欄」。
- Phase 1 不含長↔寬 pivot;要把「某欄的值攤成多系列」目前需自己先轉好,或多選幾個 Y 欄(寬表)。

## 本機開發

ES modules 需 HTTP server:

```bash
cd chart && python3 -m http.server 8011   # 開 http://127.0.0.1:8011/
```

## 部署

GitHub Pages,全相對路徑、無建置步驟,放在子路徑(`/chart/`)即可運作。
