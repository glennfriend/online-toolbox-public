# 背景圖庫(背景.md)

**通用背景圖,點陣圖直接鋪底,不建模。** 講故事時查這份表,用 tag 挑一張合適的背景;沒有合適的就留白(`bg: "plain"`)。角色/道具是透明去背的,直接疊在背景上。

- 圖檔放 `raw/backgrounds/`,由 GitHub Pages 直接服務。
- 目錄與 tag 存在 `js/backgrounds.js`(`BACKGROUNDS = { id: { file, tags } }`)。
- JSON 劇本用 `"bg": "<id>"` 指定該格背景;`"plain"` = 米白紙底。
- renderer 以 `<image>` 鋪滿該格(cover 裁切,圓角裁切),角色/道具/氣泡疊在上面。

## 加背景的流程(建一次、永久用)

1. 把背景圖(建議 4:3 橫幅、風格與角色相容)丟進 `raw/backgrounds/`。
2. 我(或任何人)逐張理解內容,在 `js/backgrounds.js` 加一筆:`id → { file, tags:[...] }`。
3. 更新下方清單。之後講故事只查 tag,不需再處理。

## Tag 慣例

用**具體名詞 + 場合 + 時間/氛圍**混合,方便命中,例如:
`室內` `室外` `樓梯` `大樓` `辦公室` `廚房` `教室` `診間` `街道` `山` `海` `天空` `草地`
`白天` `夜晚` `黃昏` `晴` `陰` `溫馨` `冷色` `熱鬧` `空曠`

## 目前清單(20 張,來源:いらすとや)

**室內**:classroom(教室)· gym(體育館)· room-wood(木地板房)· room-tatami(和室)
**城市/道路**:city-night(夜城市)· highway(高速公路)· road(道路)· schoolyard(學校操場)
**自然/戶外**:mountain(山)· mountain-field(山與田)· sea(海)· river(河)· cliff(懸崖)· bamboo(竹林)· lavender(薰衣草田)· winter-waterfall(冰瀑)
**天空**:sky-blue(藍天白雲)· horizon-field(地平線草原)· night-moon(月夜)
**特效**:effect-lines(效果線,適合 shout/動作格)

> 完整 id → 檔案 → tags 對照見 `js/backgrounds.js`。

## 尚缺(irasutoya 沒有「整幅背景」版本,只有物件 clip-art)

樓梯、電梯、白天城市街景(街並み)—— 這些在 irasutoya 只有單物件插圖,不是整幅場景背景。
要的話需換來源(自己 AI 生、或其他插畫庫)。
