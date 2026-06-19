# Curvelab

互動式「公式圖形庫」:選一個公式,拉動參數(或按播放),即時看圖形怎麼變、怎麼被「畫」出來,並解釋每個公式的意義。純前端、零第三方相依,用瀏覽器開 `index.html` 即可,不需要 server。

---

## 功能目的

把「有意義的公式」做成可以動手玩的圖,讓使用者透過調整參數理解公式,而不只是看靜態圖。重點放在**對國中生有意義、能學、能看出「曲線是怎麼形成的」**的圖。

兩個原則貫穿全部的圖:

- **每個圖獨立成一個檔案、可插拔** —— 新增或移除一個圖,都不會動到其他圖或核心。
- **數字是教學品質的** —— 畫面上每個數字不是精確值就是明確標示的近似值(`≈`),任何顯示的等式都「用畫面上的數字算得出來」,學生驗算不會兜不起來(由 `num.js` 統一規範)。

### 目前的圖(19 個)

**函數 · 線**:直線 `y=mx+b`、二次函數 `y=ax²+bx+c`、拋物線 `y=x²`(生成)、反比 `y=k/x`、絕對值 `y=a|x−h|+k`、聯立方程式(兩線交點,附代入消去法逐步推導)、方程式的解 `f(x)=0`、畢氏定理 `a²+b²=c²`、正弦・餘弦(單位圓同一轉點的兩投影)、正切 `tan=sin/cos`。

**形狀 · 生成**:圓 `x²+y²=r²`、橢圓、雙紐線(∞)、擺線、螺線、心臟線、星形線、利薩茹、懸鏈線。

---

## 結構

刻意不用框架、不用 ES modules(改用傳統 `<script>`),所以直接用瀏覽器開即可、放在 GitHub Pages 子路徑(`/curvelab/`)就能跑。核心與「圖形功能」分離,圖可插拔。

```
curvelab/
├── index.html              版面 + 樣式 + 載入器(依序載入下列 JS)
├── js/
│   ├── theme.js            共用:主題色(從 CSS 變數讀出給 SVG 用)
│   ├── num.js              共用:數字顯示規範(四捨五入 / 精確 vs 近似 / = vs ≈)
│   ├── plot.js             共用:createPlot() 繪圖工具(座標換算、格線/軸、函數&參數取樣)
│   ├── ui.js               共用:UI 小工具 + tracer(生成型動畫的共用描繪器)
│   ├── expr.js             共用:運算式解析器(無 eval)+ 數值找根
│   ├── registry.js         核心:registerGraph 登記表 + App 外殼(分欄按鈕、掛載、切換收尾)
│   └── graphs/             每個圖一個獨立檔案
│       ├── line.js  quadratic.js  parabola.js  inverse.js  abs.js
│       ├── sine.js  tan.js  system.js  roots.js  pythagoras.js
│       ├── circle.js  ellipse.js  lemniscate.js
│       └── catenary.js  cycloid.js  spiral.js  cardioid.js  astroid.js  lissajous.js
└── README.md
```

### 載入與初始化

`index.html` 用一個小**載入器**依序載入上面的 JS:版本號用 `Date.now()`,讓瀏覽器每次都抓最新檔(免去快取新舊不相容),全部載完才呼叫 `App.init()`。各圖在載入時呼叫全域的 `registerGraph(...)` 把自己登記進 `GRAPHS`;`App` 依每個圖的 `group` 把右側按鈕**分欄**(函數 · 線 / 形狀 · 生成)。

### 圖形模組介面

```js
registerGraph({
  id:    'circle',          // 唯一識別
  name:  '圓',              // 按鈕顯示名稱
  eq:    'x²+y²=r²',        // 按鈕副標(公式)
  group: '形狀 · 生成',      // 歸到哪一欄
  create(root){             // 把自己的 UI 與邏輯全建進 root,狀態關在自己的閉包裡
    // ... 用 createPlot / Num / UI /(生成型可用 UI.tracer)
    return { destroy(){} }; // 選用:切換離開時收尾(例如停掉動畫)
  },
});
```

切換圖時,`App` 會先呼叫上一個圖的 `destroy()`(若有),清空顯示區,再建立新圖,所以圖與圖之間不會互相污染。

**新增一個圖**(兩步,核心完全不用動):
1. 在 `js/graphs/` 新增一個檔案,裡面 `registerGraph({ ... group: '...' })`。
2. 把檔名加進 `index.html` 載入器的 `files` 陣列(陣列順序 = 同一欄裡按鈕的順序)。

**移除一個圖** = 刪檔 + 從 `files` 陣列移除那一行。

### 共用模組重點

- **`num.js`**:`Num.round / show / sameAt / rel` —— 統一數字格式與「該用 = 還是 ≈」。等式的結果一律由「畫面顯示的值」算出,確保可驗算。
- **`plot.js` `createPlot()`**:`sx/sy` 座標換算、`grid()`、`axes()`、`funcPath()`(函數取樣)、`paramPath()`(參數式取樣)、`clientToMath()`(拖曳)。要讓圓/橢圓不變形,讓 `width/height` 比例 = `x/y` 範圍比例。
- **`ui.js` `UI.tracer()`**:把「按播放/拖 t,點沿參數曲線 (fx(t),fy(t)) 移動、沿路描出曲線」做成共用元件;生成型的圖共用它,再用 `opts.decorate` 加上自己的招牌示意(旋轉半徑、滾動的圓…)。
- **`expr.js`**:自寫小型運算式解析器(`tokenize → shunting-yard → RPN → eval`),**不使用 `eval()`**;供「方程式的解」解析使用者輸入,並以數值法找根。
