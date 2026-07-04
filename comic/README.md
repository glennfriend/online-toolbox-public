# Comic

JSON 劇本 → 向量漫畫。**劇本與渲染分離**:任何人(包含 AI agent)只要產出 30~80 行 JSON,renderer 用固定的 SVG 角色資產庫組出漫畫 —— 畫風不是「類似」,是逐 pixel 完全相同。

線上版:<https://glennfriend.github.io/online-toolbox-public/comic/>(編輯器)/ [catalog.html](https://glennfriend.github.io/online-toolbox-public/comic/catalog.html)(角色型錄)

## 三個目標(專案存在的理由)

1. **畫風一致**:所有零件是寫死的 SVG path(`js/assets.js`),renderer 只做組合,永不漂移。
2. **token 低用量**:AI 只產 JSON 劇本(幾百 token),不重畫任何線條。
3. **畫出要的內容**:JSON 描述「誰、什麼表情、在哪、說什麼」,其餘交給 renderer。

## 工作流程(定案)

```
建模(一次性成本)
→ 使用者提供圖(上傳檔案到 raw/ 或給網址)
→ 3 色量化(消除 JPEG 噪點;不量化會描出上百條垃圾 path)
→ vtracer 轉向量
→ AI agent 拆解 + 整理成圖塊零件(髮/臉/五官/身體 分層)
→ 存進資產庫(js/assets.js),建模完成

頁面瀏覽(人機同步)
→ 使用者從「角色型錄頁」看到目前建好的所有模型
→ AI agent 看 assets.js(唯一真相;型錄頁由它自動產生,兩者永遠一致)

跟 AI agent 講故事(每次的日常使用)
→ AI 只產 JSON 劇本(~50 行)
→ renderer 組成漫畫(同 JSON 永遠出同圖)

最終效果:速度快、token 低消耗、畫風 100% 一致
```

> 全管線工具調查(vtracer 之外還有沒有更好的?拆零件有沒有現成品?)結論見
> [docs/tooling-research.md](docs/tooling-research.md) —— 短版:vtracer 是同類最佳;
> 拆零件沒有現成品,啟發式自動分類是正解;整線替代品不存在,自建正確。

## 畫風規範(依 4 張參考圖,不是黑白風)

- 細灰線輪廓 `#3A3A3A`(線寬 3);**只有頭髮**是純黑大色塊 `#1F1F1F`
- 臉:紙白留白、點狀黑眼睛、細線眉、小弧線嘴、粉色腮紅 `#F5C4B8`、無鼻
- 衣服:柔和粉彩色塊(米白 `#F4EDDF`、抹茶綠 `#CBD5B9`…)+ 細線描邊
- 頭大身小、圓潤、無漸層、無陰影、無材質
- 色票統一收在 `assets.js` 的 `STYLE`,零件一律取用,不得散落

## 進度(分期,畫風定稿才擴產)

| Phase | 內容 | 狀態 |
|---|---|---|
| 1 | 1 角色(bun,丸子頭)× 2 表情、單格 renderer、speech 氣泡、型錄頁、SVG/PNG 匯出 | ✅ 本期 |
| 2 | 氣泡引擎完整版(thought/shout/narration、多氣泡防重疊、不壓臉) | ⬜ |
| 3 | 4 角色 × 5 表情、4 背景、效果元件(速度線/汗滴/驚嘆)、配件 | ⬜ |
| 4 | 多格版型(2x2 / 1x4 / 2x3)、表單模式 | ⬜ |
| 5 | agent-prompt.md(貼給任何 LLM 產劇本)+ 端到端驗收 | ⬜ |

## 劇本 Schema(Phase 1 已支援的子集)

```json
{
  "version": 1,
  "layout": "single",
  "panels": [
    {
      "bg": "plain",
      "cast": [{ "char": "bun", "pos": "right", "face": "left", "emotion": "happy" }],
      "bubbles": [{ "speaker": "bun", "type": "speech", "text": "今天也要好好吃飯!" }]
    }
  ]
}
```

- `cast[].char`:`bun`(丸子頭女生)— 之後擴充
- `cast[].pos`:`left | center | right` 或 `{ "x": 0~1 }`
- `cast[].face`:`left` 水平翻轉(預設面向右)
- `cast[].emotion`:`neutral | happy` — 之後擴充
- 錯誤容忍:缺欄位用預設值、未知值 fallback,警告顯示在預覽上方 + console(絕不無聲)

## 架構

```
comic/
├── index.html        編輯器:左 JSON、右即時預覽,下載 SVG/PNG(2x)
├── catalog.html      角色型錄:角色 × 表情 全組合,人工核對畫風(調教用)
├── styles.css        app 外框(漫畫畫風不在這裡)
└── js/
    ├── assets.js     ★ 角色資產庫 = 畫風唯一來源(STYLE 色票 + 零件 path)
    ├── renderer.js   JSON 劇本 → SVG(排版、氣泡、tail 指向)
    ├── main.js       編輯器殼層
    └── catalog.js    型錄頁
```

- 座標系:每角色以頭部中心為原點,零件可互換;新角色 = `assets.js` 加一個 entry。
- 新表情 = 該角色 `faces` 加一段(只換眼/眉/嘴,臉型髮型不動)。

## 部署

GitHub Pages,純前端零依賴(無 CDN、無 build、無 API key)。
