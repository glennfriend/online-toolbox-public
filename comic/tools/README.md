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

## items_before → items(收件匣,用完即空)

`raw/items_before/` 是**收件匣**。**規則:只要裡面有可轉換的檔案,就全部轉換到 `raw/items/`,
轉換完成後把 `items_before/` 裡的原檔刪除**(正常情況下收件匣是空的,只留 README)。

命名用 **WordNet**(ImageNet 的詞彙階層):id = 該物的 WordNet 詞位(小寫底線),同類多張加 `_2`、`_3`。
細節(姿勢/顏色/白天夜晚/畫風)放 tags,不進檔名。

流程:

1. 逐張看 `items_before/` 的圖,依 WordNet 決定 id(同類接續編號)。
2. 去背 + 裁切到 `raw/items/<id>.png`(見下,`convert-items.ps1` 或直接叫 `ItemCut`)。
3. 在 `js/items.js` 與 `items.md` 各加一筆 `id → { file, w, h, tags }`。
4. **刪除** `items_before/` 裡已轉換的原檔。
5. 到「素材」頁(catalog.html)用棋盤格底檢查去背是否乾淨。

### 門檻(thr)

`ItemCut` 第三參數 = 近白門檻(R/G/B 皆 ≥ 此值才算背景)。

- 白底卡通/線稿:`232`(預設)。
- 寫實黑白素描等**背景有灰階陰影**的圖:降到 `~212`,才能把灰霧也清掉(主體被輪廓包住不受影響)。
  去背後到素材頁看,有殘留灰邊就把 thr 再調低一點重跑。

### convert-items.ps1

把「批次轉換 + 刪原檔」包成一支。編輯檔頭的 `$map`(原檔名→id[,thr])後執行:

```powershell
powershell -ExecutionPolicy Bypass -File tools\convert-items.ps1
```

不在 `$map` 裡的檔案會被略過並列出(提醒你還沒分類),不會誤刪。

## 背景

背景是整格不透明底圖,不需去背;直接丟 `raw/backgrounds/`,在 `js/backgrounds.js` +
`backgrounds.md` 各加一筆(id → file + tags)。
