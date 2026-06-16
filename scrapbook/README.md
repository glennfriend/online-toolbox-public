# Scrapbook

貼上即時 render 的剪貼簿小工具:貼上任何內容會即時轉成好讀的樣子,可儲存在瀏覽器本機、隨時回填與複製(保留格式)。純前端、零第三方相依、單頁應用。

線上版:<https://glennfriend.github.io/online-toolbox-public/scrapbook/>

---

## 功能

- **即時 render**:在輸入框貼上內容,顯示版立即轉換。
- **自動偵測類型**:JSON / 物件、HTML、Markdown、CSV、程式碼、純文字,徽章顯示偵測結果。
  - 無法轉換的物件字面值(如 `{a:"123"}`)也會排版上色,不執行任何程式碼。
- **儲存庫**(IndexedDB):
  - 文字與圖片都能存,重開頁面仍在。
  - chip 依分類上色:圖片=淡黃、純文字=淡灰、特殊格式(JSON/Markdown/CSV…)=淡紅。
  - 顯示目前儲存用量百分比。
- **貼上圖片**:貼上即顯示大小,超過 5MB 不存;按「儲存圖片」才輸入檔名;chip 顯示「檔名 (x.xx MB)」。
- **複製(保留格式)**:
  - 文字 → 寫入 `text/html` + `text/plain`,貼到 Teams / Trello / Word 保留排版。
  - 圖片 → 寫入 `image/png` 影像本身,可直接貼成圖片。
- **開啟**:點 chip 把「輸入 + 顯示」一起切到該筆(輸入框已有內容會先確認再替換)。

---

## 架構

純前端 ES modules,核心與「內容類型功能」分離,功能可插拔。

```
scrapbook/
├── index.html              版面 + 載入 js/main.js
├── styles.css              版面、配色、chip 分類色
└── js/
    ├── main.js             控制器:即時 render、儲存庫、複製、type handler 派發
    ├── detect.js           內容類型偵測(啟發式)
    ├── storage.js          持久層:item CRUD + 用量估計(用 idb.js)
    ├── idb.js              通用 IndexedDB 封裝(與本專案無關,可重用)
    ├── clipboard.js        富文字複製(text/html + text/plain)
    ├── util.js             共用:escapeHtml
    ├── features/
    │   └── image.js        圖片功能(可插拔):貼上、大小檢查、存檔、複製成 PNG
    └── renderers/
        ├── index.js        render 派發
        ├── structured.js   JSON / 物件 排版上色(不執行程式碼)
        ├── markdown.js     精簡 Markdown → HTML
        ├── html.js         白名單 sanitizer(移除 script / 事件 / 危險協定)
        ├── code.js         通用語法上色
        └── csv.js          CSV → 表格
```

### type handler 登記表(可插拔的關鍵)

`main.js` 不寫死任何類型,改用登記表派發每種 item 的行為:

```js
registerHandler({
  type: 'image',
  label: (item) => `${item.title} (${formatMB(item.size)})`, // chip 標籤(可選)
  open: (item) => { /* 點 chip 時:把輸入+顯示切到這筆 */ },
});
```

**新增一種內容功能** = 寫一個 `features/xxx.js`,在裡面 `registerHandler(...)`,並在 `main.js` 加一行 `initXxxFeature(...)`。
**移除一種功能** = 刪掉該模組 + 拿掉那一行。核心不受影響。

### 解耦事件

`main.js` 顯示文字時會在 `display` 上發出 `scrapbook:text-shown` 事件。功能模組(如圖片)監聽它來收掉自己的控制項、還原複製行為。核心永遠發送,沒人監聽也無妨 → 移除功能不影響核心。

---

## 儲存(IndexedDB)

- 用 IndexedDB 而非 localStorage:容量大很多(數百 MB～數 GB),且可原生存 Blob(圖片不需轉 base64、不膨脹)。
- item 結構:`{ id, type, title, payload, createdAt, size? }`(text 的 payload 是字串、image 的是 Blob)。
- 舊資料(沒有 `type` 的舊結構)讀取時寬鬆當成文字,不做破壞性遷移。
- 仍會從舊版 localStorage 做一次性搬遷(搬完清掉舊 key)。

### 限制(任何純前端方案皆同)

- 綁**單一瀏覽器 + 單一裝置**,不跨裝置、不自動備份。
- 使用者清「Cookie 和網站資料」、無痕關閉、Safari ITP(7 天未造訪)、磁碟不足回收 → 都可能清掉。
- 磁碟上**未加密**:不要存密碼 / token / 機密。
- 圖片有 5MB 上限(`features/image.js` 的 `MAX_BYTES`,改一行可調)。

---

## 安全性

- 顯示貼上的 HTML 時用白名單 sanitizer:移除 `<script>`、`on*` 事件屬性、`javascript:` 等危險協定;不執行任何貼上的程式碼。
- 偵測為「程式碼 / JSON」時只做語法上色,不執行。

---

## 已知取捨

- 類型偵測是啟發式,少數內容可能猜錯類型(例如含逗號的散文偶爾被當 CSV)。
- 複製圖片到外部 App 以 `image/png` 為主(非 PNG 會先用 canvas 轉檔)。
- 圖片無法塞進 textarea,所以開啟圖片時輸入框會清空(圖片沒有對應文字)。

---

## 本機開發

需用本機 HTTP server(ES modules 不能用 `file://` 開):

```bash
cd scrapbook
python3 -m http.server 8008
# 開 http://127.0.0.1:8008/
```

## 部署

本 repo 用 GitHub Pages 發佈(Settings → Pages → 由 `main` 分支的根目錄部署)。
app 全用相對路徑,放在任何子路徑(如 `/scrapbook/`)都能運作,不需建置步驟。
