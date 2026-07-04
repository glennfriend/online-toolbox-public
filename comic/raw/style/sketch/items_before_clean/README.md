# sketch / items_before_clean — 乾淨原圖收件匣(用完即空)

畫風 **sketch(寫實黑白素描)**、主體 + **乾淨白底**、週圍無雜質的配件原圖丟這裡。處理=單純去背。

**規則:只要這裡有可轉換的檔案就全部轉換到 `../items/`,轉換後刪原檔**(正常是空的,只留這個 README)。

- 工具:`[ItemCut]::Cut(原檔, ../items/<id>.png, 212)`;上半身人像用 `Cut(原檔, out, 212, 6, $false)`。
  寫實黑白素描背景常有灰階陰影,門檻用 ~212(比卡通的 232 低)才吃得掉灰霧。細節見專案根 `tools/README.md`。
- 命名:WordNet,登記到 `js/items.js` 的 `STYLES.sketch.items`。
- 有雜質的圖放隔壁 `../items_before_noisy/`。
