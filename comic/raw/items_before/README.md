# items_before — 配件收件匣(用完即空)

未去背的配件原圖(主體 + 不透明白底)丟這裡。

**規則:只要這裡有可轉換的檔案,就全部轉換成去背配件放到 `../items/`,轉換完成後把這裡的原檔刪除。**
所以正常情況下這個資料夾是空的(只留這個 README)。

轉換步驟見 `../../items.md` 與 `../../tools/README.md`:
逐張看圖 → 依 WordNet 決定 id → `[ItemCut]::Cut` 去背裁切到 `../items/<id>.png` → 登記 `js/items.js` + `items.md` → 刪掉這裡的原檔。
