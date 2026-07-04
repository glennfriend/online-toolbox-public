# default / items_before_noisy — 髒原圖收件匣(用完即空)

畫風 **default(手繪卡通)**、主體**附近有雜質**的配件原圖丟這裡:散點、網點、分鏡殘框、殘字等。
處理=去背 + **只保留最大的連通塊**(主體),其餘小塊雜質清成透明。

**規則:只要這裡有可轉換的檔案就全部轉換到 `../items/`,轉換後刪原檔**(正常是空的,只留這個 README)。

- 工具:`[ItemCut]::CutNoisy(原檔, ../items/<id>.png, 212)`(門檻通常比乾淨圖低才吃得掉灰底)。
- 命名:WordNet,登記到 `js/items.js` 的 `STYLES.default.items`。細節見專案根 `tools/README.md`、`items.md`。
- 注意:雜質(如分鏡外框)**與主體相連**會被當同一塊留下 → 先手動裁掉明顯外框再丟進來。
- 很乾淨(純白底)的圖放隔壁 `../items_before_clean/`。
