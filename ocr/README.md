# OCR

把**圖片裡的文字**抽成可複製文字——**繁中 + 簡中 + 英文**(可混排)。拖 / 貼 / 上傳圖片即可。**純前端、圖片不上傳、免 API key**。

線上版:<https://glennfriend.github.io/online-toolbox-public/ocr/>

---

## 功能

- **取圖多種方式**:拖放、直接貼上(Ctrl/⌘+V)、點擊上傳;貼上後按 **Enter** 直接辨識。
- **支援圖片與 PDF**:圖片直接辨識;PDF 用 `pdf.js` 逐頁 render 成圖再 OCR,可選頁數範圍(1–3 / 1–10 / 11–20 / 整份)。
- **一個模型吃繁+簡+英**:用 PaddleOCR **PP-OCRv6 small**(透過 `ppu-paddle-ocr`),單一模型統一辨識簡體 / 繁體 / 英文與 50+ 語言。
- **影像前處理(可選,預設關)**:轉灰階、自動拉對比、放大小圖,對小字 / 低對比 / 偏暗的截圖較有幫助;清晰文件通常不需要。
- **結果可編輯可複製**:辨識出的逐行文字放進文字框,改完一鍵複製;**選取一段文字會自動複製**(並去掉頭尾空白),不必再按「複製」。
- **框疊原圖 + 低信心校對(僅圖片模式)**:在預覽圖上疊出每段文字的偵測框(低信心畫紅框);右側列出「低信心的行 + 信心%」,點一下會在原圖閃示該行的框、並在文字框選取定位,方便優先校對。textarea 維持純文字不變。
- **純前端**:辨識在瀏覽器內用 `onnxruntime-web` 跑,**不上傳、無後端、無金鑰**。
- **模型持久快取(顯示進度)**:模型首次下載(數十 MB)時顯示進度%,之後存進 **Cache API 持久快取**(已請求 `storage.persist()`,不會被無聲清掉),再開即秒載入;用 manifest(版本 + 各檔 SHA-256)控管更新。

## 限制(老實說)

- **清晰印刷體**(截圖、文件照)效果最好;**手寫、嚴重模糊、藝術字、複雜版面(多欄/表格)、直排** 不保證。
- **繁體**:PP-OCRv6 單模型已同時涵蓋繁 / 簡,清晰印刷體最佳。
- **首次需網路**下載模型;之後離線可用(已快取)。
- 速度:WebGPU(若可用)較快,否則單執行緒 WASM 保底,每張圖數秒。

## 結構

```
ocr/
├── index.html
├── styles.css
└── js/
    ├── main.js        殼層:取圖(拖/貼/上傳)、預覽、按鈕、流程編排、顯示結果
    ├── ocr.js         OCR 引擎層(唯一碰 PaddleOCR / onnxruntime-web 的地方)
    ├── modelcache.js  模型持久快取(Cache API + 進度 + 版本/hash)— 獨立模組
    ├── preprocess.js  影像前處理(純 canvas;灰階/對比/放大)— 獨立模組
    └── pdfdoc.js      PDF → canvas(延遲載入 pdf.js)— 獨立模組
```

> **模組互不影響**:`preprocess.js`(影像)與 `pdfdoc.js`(PDF)彼此分離,一邊壞了不影響另一邊;
> 共用的只有引擎層的 `recognizeCanvas(canvas, onStatus)`(canvas 進、文字出)。
> **要換引擎或自架模型,只改 `ocr.js`。**

## 技術 / 維護註記

- 引擎:**`ppu-paddle-ocr`** 的瀏覽器入口 `/web`(PP-OCRv6 small)+ **onnxruntime-web**(WebGPU 優先、否則 WASM)。設定照官方 demo 的「無打包器 CDN」用法。
- **關鍵**:`index.html` 的 **import map** 把 `onnxruntime-web` 指到瀏覽器專用 bundle(`ort.all.bundle.min.mjs`),**避開 CDN 把 Node 版打包進來造成的 `process.binding` 錯**;`ppu-ocv/web`、`ppu-ocv/canvas-web` 也由 import map 提供。函式庫本體由 `ocr.js` 的 `WEB_ENTRY`(jsdelivr)動態載入。
- **PDF**:用 `pdfjs-dist` v6 的 ESM build(import map 提供 `pdfjs-dist` → `build/pdf.min.mjs`),`pdfdoc.js` 延遲載入(丟 PDF 才抓),worker 用 `GlobalWorkerOptions.workerSrc` 指向同版的 `build/pdf.worker.min.mjs` — **改版本時兩個 URL 要一起改**。
- **模型載入**:`ocr.js` 從 web 入口拿 `DEFAULT_MODEL`(PP-OCRv6 small 三個檔的網址),交給 `modelcache.js` 自己 `fetch`(串流進度)、存進 **Cache API**,再把 `ArrayBuffer` 餵進 `new PaddleOcrService({ model })` — 函式庫因此不會自己抓、由我們全權控管快取。**想強制所有人重抓模型**:把 `modelcache.js` 的 `MANIFEST_VERSION` +1。**自架 / 釘 commit**:改 `loadModels` 收到的網址即可(或直接改 `DEFAULT_MODEL` 來源)。
  - 註:manifest 的 SHA-256 是「下載當下的內容指紋」,用於完整性記錄與版本比對;模型網址釘在 `main` 分支,**上游若就地更新同一網址不會自動觸發重抓**(要重抓就 +`MANIFEST_VERSION`,或把網址釘到某個 commit)。
- ⚠️ **GitHub Pages 不能設 COOP/COEP** → WASM 為單執行緒(較慢);WebGPU 不受影響。函式庫附 `coi-serviceworker.js` 可開多執行緒,本工具**暫未啟用**(避免它會重載頁面+改寫所有 fetch 的副作用)。

## 計畫(TODO)

- **框疊 / 校對清單支援 PDF**:目前框疊+低信心清單僅圖片模式(PDF 是多頁、預覽僅縮圖)。日後可做「逐頁切換 + 對應頁的框」。
- **低信心門檻可調**:目前固定 `LOW_CONF = 0.85`(在 `main.js`),日後可開成選項。

## 部署

GitHub Pages,全相對路徑、無建置步驟,放在子路徑(`/ocr/`)即可。
