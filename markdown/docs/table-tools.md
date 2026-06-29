# 📋 表格工具(複製 4 格式 + 欄寬拖曳)

每個表格上方有 4 顆按鈕,點了把**整張表**複製成對應格式:**Markdown / Unicode(框線)/ CSV / JSON**。
表頭欄界線可**拖曳調整欄寬**,寬度記在瀏覽器(以表頭文字為記號),**重整後仍記得**(與 URL / 文件無關)。

## 範例:Ops / 法務 / 採購(提醒事項,不列 check list)

| 事項 | 提醒 |
|---|---|
| 法務簽核 Stop chip UI | Launch gate,法務通常慢,建議 Phase 1 開工同時送出 review |
| Twilio Console brand 註冊 runbook | OnRamp ops 端建立,包含對外溝通 SLA |
| SMS fallback sender number 採購 | 共用 10DLC vs 獨立 RCS 號碼 |
| Webhook URL 部署 | Ava 端 inbound + status callback URL 提供給 Twilio |

## 四種格式長怎樣(點上面按鈕複製來看)

- **Markdown**:管線表格(`| … |`),用全形寬度補齊對齊。
- **Unicode**:`┌─┬─┐` 框線表,貼到終端機 / 純文字也對齊。
- **CSV**:逗號分隔;欄位含逗號 / 引號 / 換行會用引號跳脫。
- **JSON**:每列一個物件(用表頭當 key),`JSON.stringify(…, null, 2)`。

## 欄寬拖曳

把滑鼠移到表頭兩欄之間的界線,出現藍線就能左右拖(像 Google Sheet)。拖完寬度會存起來,
**重新整理或重開都記得**。記號是「表頭文字 + 欄數」,所以表頭或欄數一改就回預設寬度。
