# Comic

JSON 劇本 → SVG 漫畫。**劇本與素材分離**:任何人(含 AI agent)只要產出一小段 JSON,renderer
用固定的點陣素材(去背配件 + 背景 + 白底黑字對話框)組出漫畫。純前端、零依賴、零 build。

線上:<https://glennfriend.github.io/online-toolbox-public/comic/>(編輯器)·
[catalog.html](https://glennfriend.github.io/online-toolbox-public/comic/catalog.html)(素材)

## 目標

1. **畫風一致**:配件是固定的去背點陣圖,renderer 只做組合,不重畫。
2. **token 低**:AI 只產 JSON 劇本(幾百 token)。
3. **畫出要的內容**:JSON 描述「用哪個角色、放哪、說什麼」,其餘交給 renderer。

> 早期走過「手寫 SVG / vtracer 向量建模」路線,已**全面廢除**改點陣素材(見 git 歷史)。

---

# 給 AI agent:怎麼產一則故事

一則故事 = 一個 JSON 檔。看完本節即可正確產出,不需讀程式碼。

## Schema

```json
{
  "version": 1,
  "title": "中文標題",
  "layout": "grid-2x2",
  "panels": [
    {
      "bg": "room-wood",
      "items": [
        { "item": "girl/1",     "pos": { "x": 0.27, "y": 0.66 }, "scale": 0.8 },
        { "item": "old_man/main","pos": { "x": 0.74, "y": 0.66 }, "scale": 0.82, "flip": true }
      ],
      "texts": [
        { "text": "小美:「你好!」", "pos": { "x": 0.04, "y": 0.05 }, "w": 0.5 }
      ]
    }
  ]
}
```

- `layout`:`single`(1)、`grid-2x2`(4,最常用)、`strip-1x4`(4 直排)、`grid-2x3`(6)。每格 800×560。
- `panel.bg`:背景 id(見 `backgrounds.md`)或 `"plain"`(米白紙底)。沒有醫院/辦公室/商店背景 → 用 `plain`。
- `panel.items[]`:疊在背景上的去背配件(依陣列順序,後者在上)。
  - `item` = **`"角色/變化"`**(如 `girl/1`、`penguin/sleepy`);只寫 `"penguin"` = 取該角色第一個變化。
  - `pos` = 配件**中心**的格內比例(x 左→右、y 上→下)。
  - `scale` = 佔格**高度**比例(一格兩人各 ~0.6;一格一人 ~0.8)。
  - `flip: true` = 水平翻轉(右側角色設 true 才會面向左邊的人)。
- `panel.texts[]`:白底黑字對話框(不是氣泡)。`text`、`pos`(左上角比例)、`w`(寬度比例 0.4~0.66)、
  `align`(`left`|`center`)。文字會自動換行;每個框放一句話,speaker 寫進文字裡(`「小美:…」`)。

## ★ 最重要的規則:一個人 = 一個不同的角色

**一則漫畫裡,每個不同的「人」必須用不同的角色資料夾**。絕不可以用同一個角色(例:兩隻企鵝、或
`girl/1` 和 `girl/2`)去演兩個不同的人——長得一樣,讀者分不出誰是誰。

- 兩人對話:`girl/1` + `old_man/main`,或 `penguin/*` + `dog/*`。
- 一格盡量**同畫風**:要嘛全用卡通真人(`girl`/`girl_2`/`old_man`),要嘛 `penguin` + `dog`;
  別把卡通真人和企鵝混在同一格。
- 卡通真人是**固定表情**(情緒靠對白帶);企鵝可換表情(`grumpy`/`sleepy`/`wow`…)→ 情緒反轉的
  梗優先用企鵝。

## 排版慣例

- 角色低放:`pos.y` ≈ 0.62~0.68。兩人:左 x≈0.27、右 x≈0.74(右邊 `flip:true`)。
- 對話框放**空白處**(格子上緣,或說話者對側);一格兩個框就一個左上、一個右下,別重疊。
- 標點與文字一律**繁體中文**(專案硬規則,任何情況都不用簡體)。

## 可用素材

- **角色/配件**:見 [`items.md`](items.md)(角色清單 + 每個角色的變化 + tags),或素材頁 catalog.html。
  執行期唯一真相是 [`js/items.js`](js/items.js)。
- **背景**:見 [`backgrounds.md`](backgrounds.md) / [`js/backgrounds.js`](js/backgrounds.js)。

## 存檔(要保留的故事)

1. 建 `scripts/<id>.json`。2. 在 `scripts/index.json` 加一筆 `{ "id", "name", "file" }`。
命名 `YYYY-MM-DD 名稱`(日期在前)。細節見 [`scripts/README.md`](scripts/README.md)。
(編輯器裡的臨時小改不必存 —— 會即時編進網址 #hash,「複製連結」即可分享/重現。)

---

# 素材製作(新增角色/背景)

- **新配件**:原圖丟 `raw/assets/items_before_clean/`(乾淨白底)或 `items_before_noisy/`(附近有雜質)
  → `tools/ItemCut` 去背裁切到 `raw/assets/items/<角色>/<變化>.png` → 登記 `js/items.js` + `items.md`
  → 刪原檔。指令與去背演算法見 [`tools/README.md`](tools/README.md) 與 [`items.md`](items.md)。
- **新背景**:圖丟 `raw/assets/backgrounds/` → 登記 `js/backgrounds.js` + `backgrounds.md`。

# 架構

```
comic/
├── index.html      編輯器:左 JSON、右即時預覽,下載 SVG/PNG(2x)
├── catalog.html    素材頁:配件(依角色分組)+ 背景,人工核對
├── styles.css      app 外框
├── README.md / items.md / backgrounds.md   ← 文件(agent 讀這些)
├── js/
│   ├── renderer.js   ★ JSON 劇本 → SVG(背景 + 配件 + 對話框、版型)
│   ├── items.js      配件索引 ITEMS[角色].variants[變化] + resolveItem("角色/變化")
│   ├── backgrounds.js 背景索引 BACKGROUNDS[id]
│   ├── main.js       編輯器殼層(#hash 同步、劇本下拉、下載)
│   ├── catalog.js    素材頁
│   └── urlsync.js    網址 #hash 編碼
├── scripts/        存起來的劇本 JSON + index.json
├── tools/          離線素材製作(ItemCut.cs 去背、convert-items.ps1)
└── raw/assets/     素材原檔:backgrounds/ items/<角色>/ items_before_clean|noisy/
```

- 錯誤容忍:缺欄位用預設、未知值 fallback,全部收進 warnings 顯示在預覽上方 + console(絕不無聲)。
- 素材圖與 PNG 匯出:live 預覽用相對路徑載圖沒問題;PNG 下載用 canvas,點陣圖不一定內嵌(已知限制)。

# 部署

GitHub Pages(deploy from branch,`.nojekyll`)。push 後 CDN 約幾秒~1 分更新;偶爾兩次相近的 push
會漏發後一個,補一個 commit 觸發重建即可。用 `網址?cb=亂數` 可分辨「沒發佈」還是「只是快取」。
