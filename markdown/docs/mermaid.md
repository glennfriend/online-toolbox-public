# 🧩 Mermaid 圖

在程式碼區塊標 `mermaid` 語言,就會渲染成流程圖 / 關係圖 / 時序圖等(語法見 mermaid 官網)。

每張圖上方有 5 顆按鈕:

原始碼: 複製 mermaid 原始碼
PNG: 下載 PNG 圖檔
SVG: 複製 `<svg>` 向量標記
Base64: 複製 `<img src="data:…base64">` 內嵌碼
複製圖片: 把圖(PNG)複製到剪貼簿

Example: 依賴關係(現況卡點)

```mermaid
graph TD
    L8[laravel/framework 8.73] --> S8[laravel/scout v8]
    L9[laravel/framework 9.0] -.要求.-> S9[laravel/scout v9]
    S8 --> D4[babenkoivan/scout-elasticsearch-driver v4.3<br/>archived 2021]
    D4 -.限制.-> S8
    S9 --> Dnew[babenkoivan/elastic-scout-driver v2.0<br/>+ plus + migrations]
    Dnew --> ES7[Elasticsearch 7.x server]
    D4 --> ES7

    style D4 fill:#f99
    style L9 fill:#9cf
    style Dnew fill:#9f9
```
