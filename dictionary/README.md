# dictionary

把一個英文單字「從各種角度」解析的工具。**三層**:

1. **收集原始資料** — 把有信譽、授權開放、可下載的英文語料,原樣收進 `raw/`,記錄來源/授權/下載日。**先求完整、龐大、正確**,不加工。
2. **建置(build)** — `build/` 的 Node 腳本把 `raw/` 正規化、合併、建索引,產出**一個 SQLite 檔** `data/dictionary-<版本>.db.gz` + `manifest.json` + `build-report.md`。
3. **前端查詢** — 純前端(HTML/CSS/JS):首次下載該 .db、解壓存進瀏覽器 **OPFS**(持久),之後免下載;用 **OPFS SQLite(SAHPool VFS,跑在 Worker)** 即時查詢。

線上:<https://glennfriend.github.io/online-toolbox-public/dictionary/>

## 資料生命週期(開發者怎麼持續管理)

**真相只有一個:你 build 出來、部署的那支 `dictionary.db`。** 瀏覽器 OPFS 那份是**唯讀快取**,你不會去改它;更新永遠是單向:`raw/ → build → 部署 → 使用者下次自動同步`。

- **版本章**:每次 build 蓋一個 `版本 = 日期-內容雜湊`,寫進 DB 的 `meta` 表,也寫進 `manifest.json`;DB 檔名帶版本(新版=新網址,HTTP 不會給舊的)。
- **自動判新舊**:前端開啟先抓極小的 `manifest.json`,比對本機 OPFS 那份的 `meta.version`;**相同→用快取(秒開免下載),不同→重抓換掉**。畫面顯示目前資料版本。
- **可追溯對錯**:每筆資料記 `source`(來自哪個來源);build 輸出 `build-report.md`(各表筆數、警告);`raw/` 在 git、build 確定性→可重建、可 diff。
- **安全閥**:前端一顆「重建本機資料」鈕 = 清 OPFS 快取重抓。
- **更新流程(5 步)**:改 `raw/` 或 `build/*` → `node build/build.mjs` → 看 `build-report.md` → `git commit && push` → 使用者下次自動更新。

## 第一個功能:單字查詢(v1)

頁面一個輸入框:打字(≥2 字)即時**自動完成**(依詞頻排序的前綴建議);**Tab** 補完最上面的建議、**Enter** 查該單字;顯示 **發音(IPA)/ 常用度 / 各詞性的定義與例句**。資料來源 v1:Wordset(定義/詞性/例句)+ CMUdict(發音)+ Norvig 詞頻(排序)。結構可插拔,日後加「同義 / 易混淆 / 押韻…」只是多一張表 + 多一張結果卡。

## 目前狀態

- 已建立原始資料區 `raw/`,完成第一批收集(約 193 MB,9 個來源)。明細與來源見 [`raw/COLLECTION_LOG.md`](raw/COLLECTION_LOG.md),各來源另有自己的 `SOURCE.md`。
- **原始資料納入版本控管**:刻意把 `raw/` 一起進 git,因為網路來源會失效(收集當下就已有數個連結 404)——存進來才不會以後「沒有原始資料」。單一最大檔 23.7 MB,未觸及 GitHub 單檔 100MB 上限。代價:repo 變大(每次 clone 都會帶);GitHub Pages 也會一併部署這些(皆為開放授權資料,公開可下載無妨)。

## 能支撐哪些「角度」(資料 → 用途)

- 定義 / 詞性 / 例句:WordNet、Wordset、Webster's 1913
- 同義 / 反義 / 上下位 / 部分整體:WordNet、Moby、Roget
- 發音 IPA / 音節 / 重音 / 押韻 / 同音:CMUdict(+ 連字符樣式)
- 常用度 / 難度:Norvig 詞頻、google-10k
- 拼相近 / 音相近(易混淆字候選):dwyl 大字表 + 編輯距離、CMUdict 音素、Moby

> 「易混淆字的對比平行例句」這類**對比教學內容**,原始字典給得出定義、給不出對比例句——那是第二步要再決定(精選資料集 vs 接 LLM)的範圍。

## 結構

```
dictionary/
├── README.md
├── index.html            前端查詢頁
├── styles.css
├── js/
│   ├── main.js           殼層:輸入框、自動完成、渲染字典卡
│   ├── db.js             與 worker 溝通的查詢 API(load / suggest / lookup / clear)
│   ├── db.worker.js      OPFS SQLite worker:下載/解壓/存 OPFS/版本比對/查詢
│   └── pronounce.js      點 🔊 才發音【外部相依,見下】
├── vendor/sqlite-wasm/   內嵌的官方 sqlite-wasm(不靠 CDN,長久穩定)
├── build/                離線建置(Node,不部署執行,只產出 data/)
│   ├── build.mjs         orchestrator:raw → dictionary.db + manifest + report
│   └── sources/          每個來源一個解析器(可插拔):wordset / cmudict / ecdict / frequency / arpabet
├── data/                 build 產物(部署):dictionary-<版本>.db.gz / manifest.json / build-report.md
├── browsertest/          DB 相容性實測頁
└── raw/                  原始資料區(只放原樣下載的資料,納入版控)
    ├── COLLECTION_LOG.md # 總清單:來源 / 授權 / 日期 / 大小 / 筆數
    ├── cmudict/  wordnet/  wordset/  websters-1913/  moby/
    └── frequency-norvig/  frequency-google-10k/  wordlist-dwyl/  hyphenation/   (各含 SOURCE.md)
```

## 離線使用(2026-08 起支援)

**第一次上線開過之後,之後沒網路也能查字**(Android Firefox 等現代瀏覽器)。分工:

- **`sw.js`(service worker)**:預快取 app shell(HTML/CSS/JS/wasm,約 1.5MB)→ 離線時頁面照開。
  `data/`(manifest 與 .db.gz)刻意**不進 SW 快取**——資料的持久化由 OPFS 負責,不重複存 13MB。
- **`boot()` fail-soft(main.js)**:啟動先抓 `manifest.json` 比對版本(線上行為不變);
  **拿不到 manifest(離線)→ 退用 OPFS 既有資料**,版本列顯示「・離線(未檢查更新)」;
  連本機都沒有(第一次就離線)才顯示需要網路。
- **`db.openLocal()`(db.worker.js)**:離線退路指令 —— 不比對版本,直接開 OPFS 那份。
- 已請求 `navigator.storage.persist()`,降低瀏覽器空間吃緊時清掉 OPFS/快取的機率。

離線時的功能狀態:查詢/自動完成 **全部可用**;點 🔊 退瀏覽器內建語音;「劍橋發音 ↗」外部連結開不了(本來就是外站)。

> **維護規則:改了 shell 任一檔(index.html / styles.css / js/* / vendor/*)就要把 `sw.js` 的 `VERSION` +1**,
> 使用者下次上線才會換到新版。資料更新**不用**動 VERSION(manifest 比對每次上線都做)。

## 外部相依(誠實列出)

查詢本身**完全離線**:.db 存在 OPFS、sqlite-wasm 內嵌在 `vendor/`,查字不連任何外部服務。
唯一會連外的是**發音**,而且只有在使用者主動點 🔊 時才發生:

| 功能 | 外部資源 | 抓不到時 |
|---|---|---|
| 點 🔊 播放真人發音 | `api.dictionaryapi.dev`(免 key、CORS 可用)的錄音 mp3 | 退到瀏覽器內建語音(Web Speech),仍會出聲 |

- **顯示的發音(IPA)來自內建 CMUdict,不連網**;只有「播放聲音」才會打上面那支 API。
- 兩者都失敗時只有該次播放無聲,不影響查詢。
- `browsertest/db-compat.html` 是**開發用的相容性測試頁**(會從 cdnjs / jsdelivr 載 sql.js、DuckDB-Wasm 做對照),
  不是使用者頁面,主程式不依賴它。
