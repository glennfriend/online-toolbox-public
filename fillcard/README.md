# Fillcard

挑一個**設計好的版型**,填上文字,即時產生排版精美的圖。設計(字型/字級/字色/底色/間距/對齊/換行)
全部寫死在版型裡,使用者只給文字 → 出圖永遠對齊、永遠好看。純前端、零依賴、可下載 SVG/PNG。

線上:<https://glennfriend.github.io/online-toolbox-public/fillcard/>

## 概念(和 Comic 同一套哲學)

**設計固定、內容填入**。版型是唯一的「設計真相」,AI/使用者只負責把文字放進插槽(slots)。

- **版型(template)**:一段設計好的 **SVG**,只留具名插槽給文字;每個插槽的樣式都由版型決定。
- **資料(data)**:一小段 JSON,填各插槽的文字(如標題、每月的 title/body)。
- **renderer**:`template.render(data)` → SVG → 預覽 / 下載 PNG。設計不動。

## 現有版型

| id | 說明 |
|----|------|
| `year-timeline`（下拉:十二個月 米白色) | 米色底時間軸、開口圓環、虛線 + 光澤編號牌(Anton 展示字)。英文月份 JANUARY–DECEMBER 固定;每月**標題/內文**為插槽。 |
| `year-cards`（下拉:十二個月 彩色) | 白底、實心月份圓 JAN–DEC、淡染色塊,**左右交替**(Noto Sans TC)。每月**標題/內文**為插槽。 |
| `years-bw`（下拉:各年度 黑白) | 手繪黑白時間軸:歪斜年份方框 + 灰階圓點(淺到深)+ 虛線箭頭,左右交替(Permanent Marker + Gochi Hand)。**年份/標題/內文**皆為插槽,項目數不限。 |
| `steps`（下拉:Step 3-7) | 手繪橫向步驟時間軸:格線底、彩色編號卡 + 向下箭頭 + 年份軸(Gochi Hand)。**年份/標題/內文**皆為插槽,**3–7 步**,寬度隨步數自動調整。 |
| `chevron`（下拉:Step 3-10) | 手繪箭頭色帶時間軸:彩色箭頭段(年份)+ 上下交替卡片 + 手繪捲曲箭頭(Gochi Hand)。**年份/標題/內文**皆為插槽,**3–10 步**,寬度與大標字級隨步數自動調整。 |
| `circle-image`（下拉:Simply circle image) | 深綠橫條清單:左右交替的**圓形圖章** + 花體小標語(Kaushan Script)+ 粗體大標題(Poppins)。**標題/內文/img** 皆為插槽,項目數不限。圓圈可嵌圖(`img`),圖會自動裁成圓形(`clipPath` + `slice`);空的話顯示相片佔位圖示。字少版面,字型/字級都調校過。 |

`img` 建議放 **data: URI**(自帶、可正常匯出 PNG);一般 `http` 網址只能即時預覽,匯出 PNG 會因跨網域污染 canvas 而失敗。

直式版型(米白色/彩色/各年度黑白)為**逐列動態高度**(內文多的列自動變高);Step 3-7 / Step 3-10 為橫式,寬度隨步數縮放。

## 儲存(topbar 晶片列)

因為改文字就是一張新圖,提供類似 scrapbook 的儲存:

- **＋ 儲存**:把目前內容存成一張新圖,晶片出現在 topbar,**最新在最左**。
- 晶片名稱 = 內容的 `title`(其次 `subtitle`),**最多 20 字**,超過以「…」截斷。
- **點晶片**載入該圖(連同它的版型);**選中的晶片每次改字都自動回存**。
- 晶片上的 **×** → 跳出確認,由使用者決定是否真的刪除。
- 換版型下拉 = 開一張全新草稿(脫離選中的存檔,避免預設值覆蓋它)。
- 全部存在瀏覽器 `localStorage`(key `fillcard.cards` / `fillcard.activeId`),純前端、不上傳。

## 新增版型

在 `js/templates.js` 的 `TEMPLATES` 加一筆:`{ label, desc, w, h, defaultData, render(data) }`。
`render(data)` 回傳完整 SVG 字串(用 `wrapLines()` 處理中文換行)。編輯器會自動出現在下拉選單。

## 素材與授權(重要)

**版型一律自己畫成 SVG**,不可直接搬 Canva / 稿定 / Freepik 等站的模板(授權不允許再散布其設計)。
可內嵌的素材只用開源/CC0:
- 字型:**Noto Sans TC**(中文)+ **Anton**(英文展示字,如月份/大標)—— 皆 OFL 開源,Google Fonts 動態載入(見 index.html 的 `<link>`)。特色字可再加 jf 粉圓、清松手寫(需自行子集化)。
- 編輯器中間有**可拖曳分隔線**,寬度記在 localStorage(`fillcard.leftPx`,全域共用)。
- 插圖/圖示:unDraw、SVG Repo(CC0)。

## 架構

```
fillcard/
├── index.html      編輯器:左 JSON、右即時預覽,下載 SVG/PNG(2x)
├── styles.css
└── js/
    ├── templates.js  ★ 版型庫(每個版型 = 設計固定的 SVG + 插槽 + 範例資料)
    └── main.js       編輯器殼層(選版型、填字重繪、下載)
```

- PNG 匯出:SVG→canvas;外部字型不會載進 data-URI 的 SVG,故 PNG 內的中文以**系統 CJK 字型 fallback**
  (預覽用 Noto Sans TC 正常)。要 PNG 也精準,需把字型子集化後 base64 內嵌進 SVG(待辦)。
- 部署:GitHub Pages,純前端。
