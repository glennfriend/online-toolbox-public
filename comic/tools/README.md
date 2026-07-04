# comic/tools — 素材製作工具(離線,不進執行期)

把「原圖 → 可用配件」的機械勞動自動化。屬**離線資產製作**,不屬部署的純前端網站。

> 註:本專案已改為**點陣素材**路線(背景不透明 + 配件去背疊上去),不再向量描線。
> 舊的向量建模工具(vtracer / QFlood / QBg / extract-parts / prop-extract)已移除,見 git 歷史。

## ItemCut.cs —— 配件去背

把一張圖去背成「主體不透明、週圍透明」的 PNG,並裁切到主體外框。需要 Windows PowerShell(System.Drawing)。

```powershell
Add-Type -Path ItemCut.cs -ReferencedAssemblies System.Drawing
[ItemCut]::Cut("raw\items_before_clean\xxx.png", "raw\items\my_item.png", 232)        # 乾淨白底
[ItemCut]::CutNoisy("raw\items_before_noisy\yyy.png", "raw\items\my_item.png", 212)   # 附近有雜質
[ItemCut]::FillHoles("raw\items\my_item.png", 6)                                       # 搶救:補內部破洞
```

**演算法(去背怎麼保住主體內部的白)**:單純「四邊泛洪清近白 → 透明」會從細縫漏進主體,把該有的白
(白襯衫、白雲)也挖成透明破洞;但主體之間的**寬**空隙(狗四腿間)又必須透明。故先算「真正的外部」=
把泛洪的近白區**侵蝕 R 像素**(細縫被切斷)、只留**仍與邊緣相連**的部分、再**膨脹 R 像素**還原邊界。
於是:細縫相連的內部白 → 判為主體(不透明,還原原色);寬空隙 → 仍是外部(透明)。R 預設 6。

- `Cut(in,out,thr[,R])`:乾淨圖去背 + 裁切,內部漏白還原成原色。
- `CutNoisy(in,out,thr[,R])`:去背後**只保留最大連通塊**=主體,其餘小塊(散點/網點/殘框/殘字)清成透明。
  注意:與主體相連的雜質(如貼著頭髮的分鏡外框)會被留下 → 先手動裁掉明顯外框再處理。
- `FillHoles(path,R)`:沒有原圖時的就地搶救,把封閉/細縫相連的透明破洞填成不透明白(寬空隙保留)。

### 門檻(thr)

近白門檻(R/G/B 皆 ≥ 此值才算背景):白底卡通/線稿用 `232`(預設);寫實黑白素描等**背景有灰階**的
降到 `~212` 才吃得掉灰霧。去背後到素材頁(棋盤格底)看,有殘留灰邊就把 thr 再調低一點重跑。

## 收件匣 → items(用完即空)

兩個收件匣,依主體週圍乾不乾淨分。**規則:只要收件匣有可轉換的檔案就全部轉換到 `raw/items/`,轉換後刪原檔**
(正常情況收件匣是空的,只留 README)。命名用 **WordNet**(ImageNet 的詞彙階層):id = 該物的 WordNet
詞位(小寫底線),同類多張加 `_2`、`_3`;細節(姿勢/顏色/畫風)放 tags,不進檔名。

| 收件匣 | 放什麼 | 工具 |
|--------|--------|------|
| `raw/style/<style>/items_before_clean/` | 主體 + 乾淨白底 | `Cut`,thr 232(人像加 `,6,$false`) |
| `raw/style/<style>/items_before_noisy/` | 主體附近有雜質 | `CutNoisy`,thr ~212 |

流程:逐張看圖 → 依 WordNet 決定 id → 去背到 `raw/items/<id>.png` → 登記 `js/items.js` + `items.md`
→ 刪收件匣原檔 → 素材頁(catalog.html)棋盤格檢查。原檔刪後若要用更好演算法重跑,需重新提供原圖。

### convert-items.ps1

把「批次轉換 + 刪原檔」包成一支(乾淨圖用)。編輯檔頭 `$map`(原檔名→id[,thr])後執行:

```powershell
powershell -ExecutionPolicy Bypass -File tools\convert-items.ps1
```

不在 `$map` 裡的檔案會被略過並列出(提醒尚未分類),不會誤刪。

## 背景

背景是整格不透明底圖,不需去背;直接丟 `raw/backgrounds/`,在 `js/backgrounds.js` +
`backgrounds.md` 各加一筆(id → file + tags)。
