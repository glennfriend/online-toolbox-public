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
| `year-timeline` | 一年 12 個月時間軸(多彩)。英文月份 JAN–DEC 固定;每月的**標題**與**內文**是插槽。760×1636。 |

## 新增版型

在 `js/templates.js` 的 `TEMPLATES` 加一筆:`{ label, desc, w, h, defaultData, render(data) }`。
`render(data)` 回傳完整 SVG 字串(用 `wrapLines()` 處理中文換行)。編輯器會自動出現在下拉選單。

## 素材與授權(重要)

**版型一律自己畫成 SVG**,不可直接搬 Canva / 稿定 / Freepik 等站的模板(授權不允許再散布其設計)。
可內嵌的素材只用開源/CC0:
- 字型:**Noto Sans TC**(Google Fonts,動態子集,見 index.html 的 `<link>`);特色字可用 jf 粉圓、清松手寫(OFL/免費商用,需自行子集化)。
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
