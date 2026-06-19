# Scrapbook

貼上即時 render 的剪貼簿小工具:貼上任何內容會即時轉成好讀的樣子,可儲存在瀏覽器本機、隨時回填與複製(保留格式)。純前端、零第三方相依、單頁應用。

線上版:<https://glennfriend.github.io/online-toolbox-public/scrapbook/>

---

## 功能

- **即時 render**:在輸入框貼上內容,顯示版立即轉換。
- **自動偵測類型**:JSON / 物件、HTML、Diff、Markdown、CSV、程式碼、純文字,徽章顯示偵測結果。
  - 無法轉換的物件字面值(如 `{a:"123"}`)也會排版上色,不執行任何程式碼。
  - 貼上 git diff 會像 git 一樣上色(+綠 / -紅 / hunk)。
- **儲存庫**(IndexedDB):
  - 文字與圖片都能存,重開頁面仍在。
  - chip 依分類上色:圖片=淡黃、純文字=淡灰、特殊格式(JSON/Markdown/CSV…)=淡紅。
  - 顯示目前儲存用量百分比。
- **貼上圖片**:貼上即顯示大小,超過 5MB 不存;按「儲存圖片」才輸入檔名;chip 顯示「檔名 (x.xx MB)」。
- **複製(保留格式)**:
  - 文字 → 寫入 `text/html` + `text/plain`,貼到 Teams / Trello / Word 保留排版。
  - 圖片 → 寫入 `image/png` 影像本身,可直接貼成圖片。
- **開啟**:點 chip 把「輸入 + 顯示」一起切到該筆。
- **暫存區(防遺失、免打擾)**:輸入有未存變動時切去開別筆,會自動把它存成清單第一格的「暫存」(單一、持久化於 IndexedDB,重整後還在),不再跳確認框。點暫存區即可還原(若當下輸入也有未存內容,則兩者交換,兩邊都不丟);被覆蓋時 chip 會閃一下提示。只保護「最近一次」未存的輸入。

---

## 架構

純前端 ES modules,**完全自包含**(獨立工具,不與其他工具共用程式碼)。
核心(殼層)與「內容類型 handler」分離,handler 可插拔。

```
scrapbook/
├── index.html              版面 + 載入 js/main.js
├── styles.css
└── js/
    ├── main.js             殼層:DOM、handler 登記表、共用 ctx、儲存庫清單
    ├── detect.js           內容子格式偵測(json/html/diff/markdown/csv/code/純文字)
    ├── storage.js          持久層:item CRUD + 用量估計
    ├── lib/                本工具的通用模組(與內容無關的基礎設施)
    │   ├── idb.js          IndexedDB 封裝
    │   ├── clipboard.js    富文字複製(text/html + text/plain)
    │   └── dom.js          escapeHtml + el()
    ├── handlers/           每種「儲存型別」一個 handler(自帶完整行為)
    │   ├── text.js         文字:即時 render、儲存、開啟、富文字複製、chip 分類
    │   └── image.js        圖片:貼上、大小檢查、存檔、開啟、複製成 PNG
    └── renderers/          文字子格式的純函式渲染器(text handler 內部用)
        ├── index.js        render 派發
        ├── structured.js   JSON / 物件 排版上色(不執行程式碼)
        ├── markdown.js     精簡 Markdown → HTML
        ├── html.js         白名單 sanitizer(移除 script / 事件 / 危險協定)
        ├── code.js         通用語法上色
        ├── csv.js          CSV → 表格
        └── diff.js         git diff 上色(+綠 / -紅)
```

### handler 登記表(可插拔的關鍵)

`main.js` 不認識任何具體型別,只提供殼層 + `ctx`(共用服務)。每種儲存型別由一個 handler
模組透過 `ctx.registerHandler(...)` 註冊,**自帶完整行為**:

```js
registerHandler({
  type: 'image',
  label: (item) => `${item.title} (${formatMB(item.size)})`, // chip 標籤(可選)
  category: (item) => 'cat-image',                            // chip 顏色分類(可選)
  open: (item) => { /* 點 chip:把輸入 + 顯示切到這筆 */ },
});
```

`ctx` 提供:`registerHandler / setDisplay / setBadge / setCopyHandler / addItem /
refreshSaved / showToast / notifyDisplayChanged / onDisplayChanged / markInputSaved` 及 DOM 參照。

**新增一種儲存型別** = 寫一個 `handlers/xxx.js`(在裡面 `registerHandler`),並在 `main.js` 加一行 `initXxxHandler(ctx)`。
**新增一種文字子格式**(如 diff)= 在 `detect.js` 加偵測 + `renderers/` 加一個渲染器 + dispatch 一行(不需新 handler)。
**移除** = 反向操作,核心一行都不用動。

### 解耦事件

顯示版內容變更時,核心透過 `ctx.notifyDisplayChanged(type)` 通知;handler 用 `ctx.onDisplayChanged(cb)`
訂閱(例如圖片 handler 在切回文字時收掉自己的控制項)。核心永遠發送,沒人訂閱也無妨 → 移除功能不影響核心。

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
- 圖片有 5MB 上限(`handlers/image.js` 的 `MAX_BYTES`,改一行可調)。

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

需用本機 HTTP server(ES modules 不能用 `file://` 開)。本工具自包含,從 scrapbook 內啟動即可:

```bash
cd scrapbook
python3 -m http.server 8008
# 開 http://127.0.0.1:8008/
```

## 部署

本 repo 用 GitHub Pages 發佈(Settings → Pages → 由 `main` 分支的根目錄部署)。
app 全用相對路徑,放在任何子路徑(如 `/scrapbook/`)都能運作,不需建置步驟。
