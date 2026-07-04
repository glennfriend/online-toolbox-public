# default / items_before_clean — 乾淨原圖收件匣(用完即空)

畫風 **default(手繪卡通)**、主體 + **乾淨白底**、週圍無雜質的配件原圖丟這裡。處理=單純去背。

**規則:只要這裡有可轉換的檔案就全部轉換到 `../items/`,轉換後刪原檔**(正常是空的,只留這個 README)。

- 工具:`[ItemCut]::Cut(原檔, ../items/<id>.png, 232)`;上半身人像用 `Cut(原檔, out, 232, 6, $false)`
  (不從下緣去背,貼下緣的白衣服才不會被吃掉)。細節見專案根 `tools/README.md`、`items.md`。
- 命名:WordNet,登記到 `js/items.js` 的 `STYLES.default.items`。
- 有雜質的圖放隔壁 `../items_before_noisy/`;別的畫風放 `raw/style/<其他畫風>/`。
