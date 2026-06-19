# Scrollshot

輸入網址,產生**整頁(含卷動)**的截圖,可下載 / 複製。純前端、單頁應用;截圖本身由第三方服務產生。

線上版:<https://glennfriend.github.io/online-toolbox-public/scrollshot/>

---

## 功能目的

把「我想要某個網頁的完整長截圖」變成貼上網址就拿到圖。重點是**整頁(含卷動)**,不是只截可見區。

- 輸入網址 → 取得整頁截圖並顯示。
- **下載**成 PNG、或**複製**圖片(可直接貼到 Word / Teams / Trello)。
- 可切換「整頁 / 只截可見區」與「服務」。

### 為什麼需要第三方服務(重要)

純前端(瀏覽器)**無法**對任意外部網址截圖:同源政策禁止讀別站像素,很多站也用 `X-Frame-Options`/CSP 拒絕被嵌入。所以真正「把網頁跑出來拍照」一定要有伺服器端的無頭瀏覽器。本工具的做法是讓**前端維持純靜態**,只負責「組出服務網址、顯示/下載/複製回傳的圖」,截圖交給免金鑰的第三方服務。

代價:有免費額度限制、可能有浮水印,且**目標網址會送給第三方**(勿截含機密的內網頁面)。

---

## 結構

純前端 ES modules,自包含。核心(殼層)與「截圖服務」分離,服務可插拔。

```
scrollshot/
├── index.html            版面 + 載入 js/main.js
├── styles.css
└── js/
    ├── main.js           殼層:串接 DOM、流程、服務選擇、下載/複製、錯誤與提示
    ├── services/         每個截圖服務一個模組(可插拔)
    │   ├── index.js      服務登記表 SERVICES + getService()
    │   ├── microlink.js  Microlink:免金鑰、有 CORS → 圖可 fetch 成 blob,能下載/複製
    │   └── thumio.js     thum.io:免金鑰、網址即圖;多半無 CORS → 以「顯示」為主
    └── lib/              與服務無關的通用模組
        ├── dom.js        el()
        ├── download.js   把 Blob 下載成檔
        └── clipboard.js  把影像 Blob 複製成 image/png
```

### 服務介面(可插拔的關鍵)

`main.js` 不認識任何特定服務,只透過統一介面呼叫。每個服務模組回傳:

```js
{
  id: 'microlink',
  name: 'Microlink(可下載 / 複製)',
  // capture(url, { fullPage }) -> { imageUrl, meta?, getBlob? }
  //   imageUrl : 直接給 <img> 顯示的網址
  //   meta     : 可選,{ width, height }
  //   getBlob(): 可選,取得可下載/複製的影像 Blob;沒有或失敗 → 退回「顯示 + 原圖另存」
  async capture(url, opts) { /* ... */ },
}
```

**新增一個服務** = 寫一個 `services/xxx.js`,在 `services/index.js` 的 `SERVICES` 加一筆;核心不用動。
**下載/複製的關鍵在 CORS**:服務回傳的圖能被 `fetch` 成 blob(有 CORS)才能下載/複製;否則自動降級成「顯示 + 用『原圖』連結另存」。

---

## 本機開發

ES modules 需 HTTP server(不能 `file://` 開):

```bash
cd scrollshot && python3 -m http.server 8009   # 開 http://127.0.0.1:8009/
```

## 部署

GitHub Pages,全相對路徑、無建置步驟,放在子路徑(`/scrollshot/`)即可運作。
