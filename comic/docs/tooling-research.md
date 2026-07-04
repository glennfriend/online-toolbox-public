# 全管線工具調查(2026-07-04)

深度調查:5 個搜尋方向、19 個來源、94 條主張中 25 條經 3 票交叉驗證(23 確認、2 駁回)。
目的:確認管線每一階段「有沒有更好的現成工具」。

## 結論總表

| 階段 | 結論 | 行動 |
|---|---|---|
| 1. 點陣→向量 | **vtracer 是同類最佳**,不換 | 維持;遠期可用其 WASM 版進瀏覽器 |
| 2. 拆語意零件 | 沒有現成品;啟發式是業界現實 | **寫自動分類腳本**(零依賴、確定性) |
| 3. 角色零件系統 | 我們的架構=業界標準模式 | 借 DiceBear/comicgen 的 slot 命名慣例 |
| 4. 分格+氣泡 | 無標準 schema;氣泡有現成庫 | Phase 2 先評估 comical-js |
| 5. 整線替代品 | **不存在**,自建正確 | 無 |

## 1. 點陣插畫 → 向量

- **vtracer**(現用,visioncortex):彩色描線(potrace 只能黑白)、擬合 O(n)(potrace O(n²))、
  stacked/cutout 兩種分層模式、path 數比 Adobe Illustrator Image Trace 少;**有 WASM 版可全瀏覽器執行**。✅ 維持
- LIVE(Picsart,CVPR 2022):分層向量化,5 path 可重建簡單圖(DiffVG 要 256),但需 CUDA + GCC 5~6 + Python 3.7 + Linux → Windows 不可行 ❌
- StarVector:LLM 向量化,**推理時取樣 5 個候選挑分數最高 = 非確定性**,且需 GPU、單張 41~74 秒 ❌
- 分割引導向量化(arXiv 2408.15741):model-free(拉普拉斯/分水嶺/Otsu + DiffVG 優化)、分層輸出,研究碼、依賴 DiffVG 編譯 → 觀望
- LayerPeeler(2025):VLM 引導「剝層」,向量化+語意分層二合一,但大模型推理、非確定性 → 只可當離線工具,現不採

## 2. 自動拆語意零件(最痛點)

**沒有「SVG 語意分層」現成品。** 點陣側的候選:

- **siyeong0/Anime-Face-Segmentation**:唯一正面命中——UNet(MobileNetV2)把動漫臉分成
  **7 類:background/hair/eye/mouth/face/skin/clothes**(與需求 1:1)。輸出 512×512 點陣遮罩
  (仍需拿遮罩對 SVG path 分類);Python+PyTorch;訓練風格為日系動漫,對細線粉彩風效果無保證。→ 啟發式失手時的備援
- Anzhc/Anzhcs_YOLOs:動漫眼睛分割模型準確(mAP50 0.925 box / 0.868 mask);「head+hair 模型」的宣稱被駁回(0-3)
- anime-face-detector(hysts):28 特徵點 landmark(非分割)、只支援近正面、需整套 OpenMMLab → 重
- anime-segmentation(SkyTNT):只做「人物 vs 背景」去背 ❌;AniSeg:只到臉 bbox+人物 mask ❌
- yakhyo/face-parsing(BiSeNet 19 類):**真人臉**(CelebAMask-HQ)訓練,對風格化插畫有風險 ❌

**採用方案:連通元件 + 顏色 + 位置啟發式**(圖已量化 3~4 色:粉=腮紅、臉區小黑塊=五官、大黑塊=髮)——零安裝、確定性、正是業界對這類扁平風的現實做法。

## 3. 2D 角色零件系統(借鑑對象)

- **DiceBear**(MIT):seed → **逐 byte 相同** SVG(跨語言移植也要求一致)——與本專案確定性目標同構;
  零件=具名 slot(hair/eyes/mouth/accessories)+ JSON schema 選項 → assets.js 命名的參考範本
- **gramener/comicgen**:紙娃娃分層 SVG 漫畫角色,零件按資料夾(faces/、bodies/),
  以 名字×角度×表情×姿勢 組合 → 與本專案同概念;可借三軸(emotion/pose/angle)分類法
- paperdoll(fralonra):doll → slot → fragment 三層資料模型,命名可借
- AvataaarsJs:頭像零件庫(僅頭部),參考價值低

## 4. 漫畫分格 + 對話氣泡

- **comical-js**(BloomBooks,MIT,npm,TypeScript):專做漫畫氣泡/標註/tail 的純前端庫,
  有真實產品(Bloom)在用 → **Phase 2 氣泡引擎動工前先評估**(需確認輸出可嵌 SVG 且確定性)
- comic-web-markup:宣告式漫畫標記語言 + SVG 渲染引擎(自動排角色與氣泡)——與本專案同構的先例,
  單人小專案 → 參考 schema 設計,不直接採用
- **不存在公認的「漫畫劇本 JSON 規範」** → 自訂 schema 正當

## 5. 整條管線的替代品

AI Comic Factory 類(擴散模型生圖):每次生成漂移(畫風不逐 pixel 一致)、需 GPU/付費 API、非純前端
→ 三大目標全不滿足。comicgen 唯一確定性,但綁死它自家 clip-art 風,不能吃使用者的參考圖畫風。
**「自訂畫風 + 逐 pixel 一致 + 純前端」的組合沒有現成品 → 自建是正確決策。**

## 主要來源

- <https://github.com/visioncortex/vtracer>
- <https://github.com/Picsart-AI-Research/LIVE-Layerwise-Image-Vectorization>
- <https://arxiv.org/html/2312.11556v4>(StarVector)/ <https://arxiv.org/html/2408.15741v1> / <https://layerpeeler.github.io/>
- <https://github.com/siyeong0/Anime-Face-Segmentation> / <https://huggingface.co/Anzhc/Anzhcs_YOLOs>
- <https://github.com/hysts/anime-face-detector> / <https://github.com/SkyTNT/anime-segmentation> / <https://github.com/jerryli27/AniSeg> / <https://github.com/yakhyo/face-parsing>
- <https://github.com/dicebear/dicebear> / <https://github.com/gramener/comicgen> / <https://github.com/fralonra/paperdoll> / <https://github.com/HB0N0/AvataaarsJs>
- <https://github.com/BloomBooks/comical-js> / <https://github.com/abuseofnotation/comic-web-markup>
