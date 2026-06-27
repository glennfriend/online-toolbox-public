# Map

把地點分「**組**」記錄,每個點有 emoji、標題、內容;點清單裡的地點,右邊地圖就跳過去。**純前端、免 API key、資料存在本機**。

線上版:<https://glennfriend.github.io/online-toolbox-public/map/>

---

## 功能目的

不是「在地圖上畫圖釘」的工具,而是「**我自己的地點清單 + 一個能跳位置的地圖**」:

- **多組(group)**:每組是一批地點;可新增 / 改名 / 刪除 / 切換組。
- **每個點**:`emoji 圖示 + 標題 + 內容 + 經緯度`。
- **加點**:搜尋地名(OpenStreetMap Nominatim,免 key)、或直接貼 **Google Maps 連結** / `lat,lng`。
- **點清單 → 地圖跳位**:點任一列,右邊地圖就切到該座標。
- **匯出 / 匯入**:每組可存成 **JSON(主)** 或 **CSV(輔)**,也可匯入成新的一組。
- 全部存在瀏覽器 `localStorage`,不上傳、不需要帳號。

## 為什麼免 key(關鍵設計)

要在 Google 地圖上「自訂標記 + 程式控制」必須用 Maps JavaScript API,**需要 API key + 帳單**。本工具刻意避開:

- **地圖只當「觀景窗」**:用免 key 的嵌入網址 `https://maps.google.com/maps?q=<lat>,<lng>&z=<zoom>&output=embed`,放進 `<iframe>`。切換地點 = 換 iframe 的 `src`。
- **標記不畫在地圖上**:所有點都是「我自己的清單資料」,由我的 UI 呈現與掌控;地圖只負責「跳到某座標」。

> 取捨:`output=embed` 是長年穩定但**非官方文件**的用法(官方有文件的 Embed API 才要 key);切換地點時 iframe 會**重載閃一下**;一次只顯示**一個**地點(沒有同時多圖釘)。哪天若失效,把 iframe 換成 Leaflet + OpenStreetMap 即可(同樣免 key)。

## 資料格式(= 給 AI agent 產生資料的契約)

一個檔 = 一組。匯入會自動判別 JSON / CSV。**JSON schema**:

```json
{
  "name": "我的美食地圖",
  "points": [
    { "emoji": "🍜", "title": "某拉麵店", "note": "推薦鹽味", "lat": 25.0478, "lng": 121.5170, "z": 16 }
  ]
}
```

- `lat` / `lng` 是**資料本體**(必填、範圍內才會被接受);`emoji` 預設 `📍`;`note`、`z`(縮放,預設 16)可省略。
- CSV 欄位:`emoji,title,note,lat,lng`(第一列為標頭)。

### 給 AI agent 用

因為這是純前端工具、**沒有後端**,所以 agent **不需要驅動它**(不用 curl 打 API、不用 playwright):

1. agent 直接**產生一份符合上面 schema 的 JSON**(一組、多個點)。
2. 交給使用者 → 使用者在工具裡**匯入** → 地圖清單立刻就緒、點了就跳位。

唯一可能需要外部呼叫的是「**地名 → 座標**」的地理編碼:agent 可用 Nominatim(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=...`,免 key)把地名換成 `lat/lng`,再填進 JSON。匯出檔與匯入檔同格式,所以「agent 產出 = 可直接給人匯入的檔」。

## 結構

純前端 ES modules,自包含。殼層只管 DOM/事件,其餘是純函式模組。

```
map/
├── index.html
├── styles.css
└── js/
    ├── main.js     殼層:組/點清單、搜尋選點、地圖跳位、匯出入、事件
    ├── store.js    localStorage 多組存取
    ├── geo.js      解析座標 / Nominatim 搜尋 / 免 key 地圖嵌入網址(純函式)
    └── io.js       匯出/匯入(JSON、CSV)(純函式)
```

## 部署

GitHub Pages,全相對路徑、無建置步驟,放在子路徑(`/map/`)即可。
