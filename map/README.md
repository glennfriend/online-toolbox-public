# Map

把地點分「**組**」記錄,每個點有 emoji、標題、內容;點清單裡的地點,右邊地圖就跳過去。**純前端、免 API key、資料存在本機**。

線上版:<https://glennfriend.github.io/online-toolbox-public/map/>

---

## 功能目的

不是「在地圖上畫圖釘」的工具,而是「**我自己的地點清單 + 一個能跳位置的地圖**」:

- **兩種組**:
  - 🔒 **內建組**:來自版控的 `data/builtin.json`,工具載入後**唯讀**(使用者不能新增 / 刪改 / 改名)。適合由 AI agent 產生、commit 進 repo 當公用資料。
  - **使用者組**:存在瀏覽器 `localStorage`,可搜尋加點 / 匯入 / 改名 / 刪除。
- **每個點**:`emoji + 標題 + 經緯度 + 評分 + 地址 + 營業時間 + tags + 備註`。
- **加點**(使用者組):找店家最準的方式是**貼 Google Maps「網址列」連結**(含 `@lat,lng`,會優先取 `!3d!4d` 精確座標);也可搜地址/地標(Nominatim,免 key)、或直接貼 `lat,lng`。
- **點清單 → 看詳情 + 地圖跳位**:點任一列,下方顯示完整資訊、右邊地圖切到該座標。
- **匯出 / 匯入**:任何組都可匯出 **JSON**;匯入 JSON 會成為一個新的「使用者組」。

## 為什麼免 key(關鍵設計)

要在 Google 地圖上「自訂標記 + 程式控制」必須用 Maps JavaScript API,**需要 API key + 帳單**。本工具刻意避開:

- **地圖只當「觀景窗」**:用免 key 的嵌入網址 `https://maps.google.com/maps?q=<lat>,<lng>&z=<zoom>&output=embed`,放進 `<iframe>`。切換地點 = 換 iframe 的 `src`。
- **標記不畫在地圖上**:所有點都是「我自己的清單資料」,由我的 UI 呈現與掌控;地圖只負責「跳到某座標」。

> 取捨:`output=embed` 是長年穩定但**非官方文件**的用法(官方有文件的 Embed API 才要 key);切換地點時 iframe 會**重載閃一下**;一次只顯示**一個**地點(沒有同時多圖釘)。哪天若失效,把 iframe 換成 Leaflet + OpenStreetMap 即可(同樣免 key)。

## 資料格式(= 給 AI agent 產生資料的契約)

一個檔 = 一組(`data/builtin.json` 則是 `{ groups: [ …多組… ] }`)。匯出/匯入皆為 JSON。**單組 schema**:

```json
{
  "name": "忠孝復興 捷運站 餐點",
  "points": [
    {
      "emoji": "🍜",
      "title": "某拉麵店",
      "lat": 25.0417, "lng": 121.5440, "z": 16,
      "rating": 4.5,
      "address": "台北市…",
      "hours": "11:30–14:00, 17:00–21:00",
      "tags": ["拉麵", "日式拉麵"],
      "note": "推薦鹽味",
      "approx": true
    }
  ]
}
```

- `lat` / `lng` 必填(範圍內才會被接受);其餘皆可省略。`emoji` 預設 `📍`、`z`(縮放)預設 16。
- `tags` 可給陣列或逗號字串;`rating` 數字(0–5);**`approx: true`** 表示**座標為概略**(詳情會標示),用於「靠網路查、座標非精確」的資料。

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
    ├── main.js     殼層:內建+使用者組、搜尋選點、詳情、地圖跳位、匯出入、事件
    ├── store.js    使用者組的 localStorage 存取
    ├── geo.js      解析座標 / Nominatim 搜尋 / 免 key 地圖嵌入網址(純函式)
    └── io.js       匯出/匯入 + 點正規化(JSON)(純函式)
└── data/
    └── builtin.json  內建(版控)組;唯讀,由 agent 產生填入
```

> ⚠️ 內建組裡若 `approx: true`,表示座標是靠網路概略推估、非精確,僅供參考;要精確請改用 Google Maps 連結重新定位。

## 部署

GitHub Pages,全相對路徑、無建置步驟,放在子路徑(`/map/`)即可。
