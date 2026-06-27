# OCR

把**圖片裡的文字**抽成可複製文字——**繁中 + 簡中 + 英文**(可混排)。拖 / 貼 / 上傳圖片即可。**純前端、圖片不上傳、免 API key**。

線上版:<https://glennfriend.github.io/online-toolbox-public/ocr/>

---

## 功能

- **取圖三種方式**:拖放、直接貼上(Ctrl/⌘+V)、點擊上傳。
- **一個模型吃繁+簡+英**:用 PaddleOCR 的 **PP-OCRv5**(`lang:'ch'`),官方技術報告說明它以單一模型統一辨識簡體/繁體/拼音/英文/日文。
- **結果可編輯可複製**:辨識出的逐行文字放進文字框,改完一鍵複製。
- **純前端**:辨識在瀏覽器內用 `onnxruntime-web` 跑,**不上傳、無後端、無金鑰**;模型首次下載(約 20MB)後由瀏覽器快取,之後秒載入。

## 限制(老實說)

- **清晰印刷體**(截圖、文件照)效果最好;**手寫、嚴重模糊、藝術字、複雜版面(多欄/表格)、直排** 不保證。
- **繁體**靠 PP-OCRv5 才好(舊版 v4 偏簡體)。
- **首次需網路**下載模型;之後離線可用(已快取)。
- 速度:WebGPU(若可用)較快,否則單執行緒 WASM 保底,每張圖數秒。

## 結構

```
ocr/
├── index.html
├── styles.css
└── js/
    ├── main.js   殼層:取圖(拖/貼/上傳)、預覽、按鈕、顯示結果
    └── ocr.js    OCR 整合層(唯一碰 PaddleOCR / onnxruntime-web 的地方)
```

> **要換引擎或自架模型,只改 `ocr.js`。** 殼層只認 `recognize(blob, onStatus)`。

## 技術 / 維護註記

- 引擎:官方 **`@paddleocr/paddleocr-js`**(PP-OCRv5)+ **onnxruntime-web**;`ortOptions.backend:'auto'`(WebGPU 優先、否則 WASM)。
- 目前用 **esm.sh** 載入函式庫(`ocr.js` 的 `LIB_URL`),模型走函式庫預設來源、瀏覽器快取。日後若要**自架/釘版本**:改 `LIB_URL`,並用 `textDetectionModelAsset.url` / `textRecognitionModelAsset.url` 指向自架的 `.tar`(ustar、未壓縮,內含 `inference.onnx` + `inference.yml`)。
- ⚠️ **GitHub Pages 不能設 COOP/COEP 標頭** → 不能用多執行緒 WASM(SharedArrayBuffer);故不開 worker 多執行緒,靠 WebGPU 或單執行緒 WASM。

## 部署

GitHub Pages,全相對路徑、無建置步驟,放在子路徑(`/ocr/`)即可。
