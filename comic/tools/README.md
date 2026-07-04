# comic/tools — 建模工具鏈(離線,不進執行期)

把「參考圖 → 角色零件」的機械勞動自動化。這些是**離線資產製作工具**,不屬於部署的純前端網站。

## 需要的東西

- **vtracer.exe**(不進 repo,見 .gitignore):點陣 → 向量描線。
  下載:<https://github.com/visioncortex/vtracer/releases>(Windows 版 `vtracer-x86_64-pc-windows-msvc.zip`,解壓後放這裡)
- **Node.js**(extract-parts.mjs 用)
- **QFlood.cs**(量化 + 去背,PowerShell `Add-Type -Path` 載入;C# 5 語法以相容 Win PowerShell 5.1)

## 管線(單一角色)

```
# 1. 裁出頭部(PowerShell System.Drawing Clone;避開安全帶/方向盤/背包等雜物)

# 2. 量化 3 色 + flood-fill 去背(QFlood.cs)
#    量化:黑→#1C1C1C(髮/線)、腮紅→#F0D6C6、其餘→白(消除 JPEG 噪點,否則描出上百條垃圾)
#    去背:從四角沿白色外擴填成 magenta sentinel;被髮/輪廓包住的白(膚)保留
Add-Type -Path QFlood.cs -ReferencedAssemblies System.Drawing
[QFlood]::Run('head.png','head-q.png')

# 3. 描向量 —— 必須 --hierarchical cutout(非堆疊):各區不重疊,髮才是獨立形狀,
#    背景 magenta 才能整塊丟掉(堆疊模式底層會鋪滿,丟了會露出下層)
vtracer.exe --input head-q.png --output head-q.svg --colormode color --hierarchical cutout --mode spline --filter_speckle 6 --color_precision 8

# 4. 分析 + 拆零件(先看表,複核後寫 groups.json 再 emit)
node extract-parts.mjs head-q.svg                          # 只印分類表
node extract-parts.mjs head-q.svg --emit TRACED_X --groups g.json --skin '#FCFCFC' --out ../js/x-traced-parts.js
```

groups.json 四組:`base`(髮+臉+耳+頸肩)、`blush`(腮紅)、`drop`(magenta 背景→留透明)、
`patch`(臉內五官洞→填膚色補平成空白臉,再由手寫表情覆蓋)。

## extract-parts.mjs 做什麼

解析每條 path 的**顏色 + bounding box + 面積**,印出可複核的分類表並自動猜測分組,再輸出零件模組。
消掉最慢的人工步驟(逐條讀座標、心算幾何、分眼/嘴/髮)。

- **base** = 髮 + 臉輪廓 + 耳 + 頸肩(描線的難處,保留)
- **blush** = 粉色腮紅
- **drop** = 臉內小暗塊(眼/嘴/鼻)→ **丟掉,改用手寫表情**(跨角色共用同一套 5 表情)
- 一律印表供複核(絕不無聲);要覆寫自動猜測就寫 `groups.json` 傳 `--groups`

純解析、無模型、無隨機 → 同一 SVG 同一輸出(確定性)。

## 為什麼不用 AI 拆零件

全管線工具調查(../docs/tooling-research.md)結論:沒有「SVG 語意分層」現成品;動漫臉分割模型
(Anime-Face-Segmentation 等)要 PyTorch 且輸出點陣遮罩、對細線粉彩風無保證。啟發式(顏色+位置+面積)
是這類扁平風的業界現實做法,零依賴、確定性,故自寫。
