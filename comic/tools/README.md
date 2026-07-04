# comic/tools — 素材製作工具(離線,不進執行期)

把「原圖 → 可用配件」的機械勞動自動化。屬**離線資產製作**,不屬部署的純前端網站。

> 註:本專案已改為**點陣素材**路線(背景不透明 + 配件去背疊上去),不再向量描線。
> 舊的向量建模工具(vtracer / QFlood / QBg / extract-parts / prop-extract)已移除,見 git 歷史。

## ItemCut.cs —— 配件去背

把一張「主體 + 白底」的圖去背成「主體不透明、週圍透明」的 PNG,並裁切到主體外框。
從四邊泛洪清掉**與邊緣相連**的近白像素 → 透明;主體內部的白(白外套、白狗身)因為被輪廓
包住、不與邊緣相連,會保留 → 不會挖穿主體。

需要:Windows PowerShell(System.Drawing)。

```powershell
Add-Type -Path ItemCut.cs -ReferencedAssemblies System.Drawing
# Cut(輸入, 輸出, 近白門檻)  門檻 232:R/G/B 皆 ≥ 232 才算背景白
[ItemCut]::Cut("raw\items_before\xxx.png", "raw\items\my-item.png", 232)
```

## 新增配件的流程

1. 原圖(主體 + 白底)丟進 `raw/items_before/`。
2. 跑 `[ItemCut]::Cut(...)` 去背 + 裁切,輸出到 `raw/items/`,取語意檔名(如 `dog-run.png`)。
3. 在 `js/items.js` 加一筆 `id → { file, w, h, tags }`,並更新 `items.md`。
4. 到「素材」頁(catalog.html)用棋盤格底檢查去背是否乾淨。

## 背景

背景是整格不透明底圖,不需去背;直接丟 `raw/backgrounds/`,在 `js/backgrounds.js` +
`backgrounds.md` 各加一筆(id → file + tags)。
