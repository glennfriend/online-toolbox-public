# 3d / items_before_noisy — 髒原圖收件匣(用完即空)

畫風 **3d**、主體附近有雜質(散點/殘框/殘字)的配件原圖丟這裡。

**規則:有可轉換的檔案就全部轉換到 `../items/`,轉換後刪原檔**(正常是空的,只留這個 README)。

- 工具:`[ItemCut]::CutNoisy(原檔, ../items/<id>.png, 212)`(去背 + 只留最大連通塊)。
- 命名:WordNet;登記 `js/items.js` 的 `STYLES['3d'].items`。細節見專案根 `items.md`、`tools/README.md`。
