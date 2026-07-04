# 配件圖庫(items)

配件 = 一張去背的點陣圖:**主體不透明、週圍透明**,所以疊在任何背景上都不會出現白框。
原圖放 `raw/items_before/`(還沒去背),跑 `tools/ItemCut` 去背+裁切後輸出到 `raw/items/`。
執行期由 `js/items.js` 索引,講故事時用 `id` 引用。

新增流程:原圖 → `raw/items_before/` → `[ItemCut]::Cut(in,out,232)` → `raw/items/` → 在 `js/items.js`
與本檔各加一筆。

| id | 檔案 | 尺寸 | 意義 | tags |
|----|------|------|------|------|
| girl | girl.png | 222×268 | 丸子頭女生、開襟衫,微笑上半身 | 女生 · 人物 · 丸子頭 · 開襟衫 · 微笑 |
| dog-run | dog-run.png | 264×187 | 奔跑中的狗(側面) | 狗 · 動物 · 奔跑 · 側面 |
| dog-trot | dog-trot.png | 292×169 | 小跑步的狗(側面) | 狗 · 動物 · 小跑 · 側面 |
| dog-jump | dog-jump.png | 216×272 | 跳躍中的狗 | 狗 · 動物 · 跳躍 · 開心 |
| dog-dash | dog-dash.png | 255×262 | 衝刺中的狗 | 狗 · 動物 · 衝刺 · 快速 |
| dog-sit | dog-sit.png | 261×224 | 乖乖坐著的狗 | 狗 · 動物 · 坐 · 乖 |
| bird | bird.png | 43×21 | 遠方海鷗剪影 | 鳥 · 海鷗 · 天空 · 飛 |
| bird-b | bird-b.png | 43×25 | 遠方海鷗剪影 | 鳥 · 海鷗 · 天空 · 飛 |
| bird-c | bird-c.png | 32×17 | 遠方海鷗剪影(較小) | 鳥 · 海鷗 · 天空 · 飛 · 小 |
| cloud | cloud.png | 130×80 | 白色線稿雲 | 雲 · 天空 · 線稿 · 白 |
| cloud-small | cloud-small.png | 70×46 | 小朵白色線稿雲 | 雲 · 天空 · 線稿 · 小 |
| cloud-face | cloud-face.png | 142×96 | 有表情的黃色雲(可愛) | 雲 · 天空 · 表情 · 黃色 · 可愛 |
| cloud-yellow | cloud-yellow.png | 129×65 | 黃色雲(傍晚感) | 雲 · 天空 · 黃色 · 傍晚 |
| plant | plant.png | 140×212 | 有表情的盆栽 | 植物 · 盆栽 · 綠色 · 室內 · 表情 |
| clock | clock.png | 118×118 | 掛鐘 | 時鐘 · 鐘 · 時間 · 室內 |
| window-day | window-day.png | 193×200 | 白天的窗(太陽、藤蔓) | 窗戶 · 白天 · 室內 · 太陽 · 植物 |
| window-night | window-night.png | 158×185 | 夜晚的窗(月亮、星星、小盆栽) | 窗戶 · 夜晚 · 室內 · 月亮 · 星星 |
| heart | heart.png | 48×48 | 粉紅愛心 | 愛心 · 心 · 粉紅 · 喜歡 · 情感 |
