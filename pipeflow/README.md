# Pipeflow

貼上資料 → 程式偵測 **tags** → 推薦可用的轉換,點一下進到下一步,串成你要的資料管線。改第一格,後面全部跟著重算。純前端、零第三方相依、單頁應用。

線上版:<https://glennfriend.github.io/online-toolbox-public/pipeflow/>

---

## 功能目的

把零散的「整理 / 轉換 / 萃取」工作串成一條看得見的管線。每一步都是純函式轉換,前一步的輸出餵給下一步(像 Unix pipe 或 notebook 的 cell 鏈)。

- 貼上任何資料 → 自動判斷 **tags**(`csv` `tsv` `json` `markdown` `url` `has-urls` `number-list`…);沒命中任何結構格式時才是 `text`(純文字)。「永遠都能用」的 mod 用 `appliesTo:'*'`,不靠 `text`。
- 依 tags 列出**最可能用得到的轉換**,點一下就進到下一格,該格再產生自己的 tags 與可用轉換。
- **reactive**:改第一格輸入,下游每一步都跟著重算(純函式 → 結果穩定)。
- 目前是**線性鏈**(一條 cell→cell→cell);分支之後再加。

### v1 的轉換(pipeline mod)

`轉成 JSON` / `轉成 Markdown 表格`、`a-z 排序` / `數字排序`、`JSON 美化` / `JSON 縮成一行`、`統計資訊`、`萃取 urls`。

### 效能與「絕不無聲」原則

- **debounce**(停止輸入 250ms 才重算)+ 只在真正變動時重算 → 打字不卡。
- 偵測 tags 跑在「已上限的輸入」上,永遠快。
- **輸入上限 ~2MB / 1 萬行**:超過就只處理前 N 行(取樣模式),並用**明顯橫幅**告知;下游每一步也標「基於取樣資料」。
- 唯讀結果太長只顯示前 N 行並註明行數。
- 原則:任何截斷 / 取樣 / 出錯都要在畫面講清楚,不讓使用者誤判或拿到錯資料。

---

## 結構

純前端 ES modules,自包含。核心(殼層 + 管線)與「tags」「mods」分離,兩者都可插拔。

```
pipeflow/
├── index.html            版面 + 載入 js/main.js
├── styles.css
└── js/
    ├── main.js           殼層:水平步驟列、debounce 重算、取樣/上限提示、串接
    ├── pipeline.js       核心:由「輸入 + mod 鏈」算出每個 step(純函式,不碰 DOM)
    ├── tags/
    │   ├── index.js      defineTag 登記 + detectTags + matchAny / matchAll
    │   └── defs.js        各 tag 定義(url / csv / tsv / json / markdown / number-list …)
    ├── mods/
    │   ├── index.js      defineMod 登記 + modsFor(tags) + getMod
    │   ├── convert.js     轉 JSON / 轉 Markdown
    │   ├── sort.js        a-z / 數字排序
    │   ├── json.js        JSON 美化 / 縮成一行
    │   ├── stats.js       統計資訊
    │   └── urls.js        萃取 urls
    └── lib/              通用模組:dom / num / sample(上限取樣) / table(表格解析)
```

### 兩層可插拔

- **新增一種 tag** = 在 `tags/defs.js` 多 `defineTag({ name, match })`。`match` 用 `matchAny([regex…])`(任一中即可,多數情況)或 `matchAll([regex…])`(全部中才算,較嚴謹),也可傳自訂函式。不求極精確,只求不易誤判。
- **新增一種轉換** = 寫一個 `mods/xxx.js`,`defineMod({ id, label, appliesTo:[tag…], run(input, tags) })`(純函式),再到 `main.js` import。`appliesTo` 命中目前 step 的 tags 就會出現在按鈕列;登記順序 = 按鈕優先序。

### 版面方向可換

`main.js` 的 `LAYOUT` 常數('row' 左到右 / 'col' 上到下)決定容器排法與箭頭方向;step 卡片本身不管方向,所以日後要改成上到下,只動這個常數與 CSS,邏輯不變。

---

## 已知取捨

- tag 偵測是啟發式;少數內容可能多貼或漏貼 tag(刻意不追求極精確)。
- CSV 解析用簡單切分(v1 不處理引號內逗號)。
- 重轉換目前在主執行緒跑;因輸入有上限,實務上夠快。真有超大需求再考慮 Web Worker。

## 本機開發

ES modules 需 HTTP server:

```bash
cd pipeflow && python3 -m http.server 8012   # 開 http://127.0.0.1:8012/
```

## 部署

GitHub Pages,全相對路徑、無建置步驟,放在子路徑(`/pipeflow/`)即可運作。
