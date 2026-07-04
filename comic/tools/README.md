# comic/tools — 建模工具鏈(離線,不進執行期)

把「參考圖 → 角色零件」的機械勞動自動化。這些是**離線資產製作工具**,不屬於部署的純前端網站。

## 需要的東西

- **vtracer.exe**(不進 repo,見 .gitignore):點陣 → 向量描線。
  下載:<https://github.com/visioncortex/vtracer/releases>(Windows 版 `vtracer-x86_64-pc-windows-msvc.zip`,解壓後放這裡)
- **Node.js**(extract-parts.mjs 用)
- 量化:內嵌在下方 PowerShell(System.Drawing),無需安裝

## 管線(單一角色)

```
# 1. 裁出頭部(依參考圖構圖,PowerShell System.Drawing Clone)
# 2. 量化成固定調色盤(消除 JPEG 噪點 —— 不量化會描出上百條垃圾 path)
#    黑→#1C1C1C(髮/線)、腮紅色系→#F0D6C6、其餘→白;衣服若要保留改加第 4 色
# 3. 描向量
vtracer.exe --input head-q.png --output head-q.svg --colormode color --mode spline --filter_speckle 6 --color_precision 8
# 4. 分析 + 拆零件(先看表,複核後再 emit)
node extract-parts.mjs head-q.svg                          # 只印分類表
node extract-parts.mjs head-q.svg --emit TRACED_X --out ../js/x-traced-parts.js
```

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
