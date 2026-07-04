# 背景圖庫(backgrounds)

背景 = **完全不透明**的整格底圖,鋪滿一格(cover 裁切)。**跟配件一樣依畫風(style)分層**:
圖檔放 `raw/style/<style>/backgrounds/`,執行期由 `js/backgrounds.js` 的 `BACKGROUNDS_BY_STYLE[<style>]`
索引,故事用 `panel.bg` 引用(在該故事的 `style` 底下解析)。配件去背後疊在背景上。
卡通故事用卡通背景、寫實故事用寫實背景 → 畫風不混。

新增背景 = 丟圖進 `raw/style/<style>/backgrounds/` + 在 `js/backgrounds.js` 對應 style 加一筆 + 更新本檔。
來源:いらすとや(irasutoya,免費;同一作品用超過 20 張需付費授權)。

## default(手繪卡通)

| id | 檔案 | 意義 | tags |
|----|------|------|------|
| classroom | bg_school_room.jpg | 教室 | 教室 · 室內 · 學校 · 黑板 |
| gym | bg_school_taiikukan.jpg | 體育館 | 體育館 · 室內 · 學校 · 運動 |
| room-wood | room_yuka_flooring.png | 木地板房間 | 室內 · 房間 · 木地板 · 窗戶 |
| room-tatami | room_yuka_tatami.png | 和室榻榻米 | 室內 · 房間 · 榻榻米 · 和室 |
| city-night | city_night_yoruno_machi.png | 夜晚城市街道 | 城市 · 街道 · 夜晚 · 大樓 |
| highway | highway.png | 高速公路 | 高速公路 · 道路 · 車 · 交通 · 城市 |
| road | road.png | 郊區馬路 | 道路 · 馬路 · 戶外 · 樹 · 白天 |
| schoolyard | bg_school_koutei.jpg | 學校操場 | 學校 · 操場 · 建物 · 戶外 · 白天 |
| mountain | mountain_yama.png | 山景 | 山 · 山上 · 戶外 · 天空 · 草地 · 白天 |
| mountain-field | mountain_field.jpg | 山與田(鄉村) | 山 · 田 · 鄉村 · 戶外 · 綠色 |
| sea | sea_ocean.png | 海 | 海 · 海邊 · 水中 · 自然 · 藍色 |
| river | bg_natural_river.jpg | 河流 | 河流 · 水中 · 自然 · 藍色 |
| cliff | cliff.png | 懸崖 | 懸崖 · 岩石 · 戶外 · 自然 |
| bamboo | bg_takeyabu_layer2.jpg | 竹林 | 竹林 · 自然 · 戶外 · 綠色 |
| lavender | lavender_field.jpg | 薰衣草花田 | 花田 · 薰衣草 · 戶外 · 紫色 · 天空 |
| winter-waterfall | winter_waterfall.png | 冬天瀑布 | 冬天 · 瀑布 · 冰 · 自然 |
| sky-blue | sky_blue.jpg | 藍天白雲 | 天空 · 藍天 · 雲 · 白天 · 戶外 |
| horizon-field | bg_chiheisen_green.jpg | 草原地平線 | 地平線 · 草地 · 天空 · 戶外 · 白天 · 空曠 |
| night-moon | bg_moon_sky_mikaduki.jpg | 夜空月亮 | 夜晚 · 天空 · 月亮 · 星空 · 戶外 |

## sketch(寫實黑白素描)

尚無背景(需另備寫實/黑白底圖)。
