# jdict

可離線的日文字典(給台灣使用者)。架構完全沿用 [`dictionary/`](../dictionary/README.md)(英文字典),**三層**:

1. **收集原始資料** — 開放授權、允許再散布的日文語料原樣收進 `raw/`(見 [`raw/COLLECTION_LOG.md`](raw/COLLECTION_LOG.md))。
2. **建置(build)** — `build/` 的 Node 腳本把 `raw/` 解析、對接、建索引,產出**一個 SQLite 檔** `data/jdict-<版本>.db.gz` + `manifest.json` + `build-report.md`。
3. **前端查詢** — 純前端:首次下載該 .db(gzip 約 26MB)、解壓存進瀏覽器 **OPFS**,之後免下載;用 **OPFS SQLite(SAHPool VFS,跑在 Worker)** 查詢。

線上:<https://glennfriend.github.io/online-toolbox-public/jdict/>

## 功能(v1)

| 功能 | 做法 |
|---|---|
| 日文 / 羅馬字 / **台灣繁體漢字** 都能查 | 搜尋鍵正規化(`js/normalize.js`):NFKC、片假名→平假名、**字形折疊**(學習→学習、國際→国際);羅馬字用 wanakana 轉假名 |
| 自動完成 | `keys` 表前綴查詢(`key >= ? AND key < ?||'￿'`),依常用度排序;羅馬字打一半(gak)也會補 |
| **活用還原** | 自寫規則表(`js/deinflect.js`,不搬 GPL 程式碼):食べなかった → 食べる;**候選一定要通過 JMdict 詞性驗證**才採用 |
| **整句切詞** | 貼整句日文 → 每個位置找查得到的段(含活用還原),再往後看一段決定切點;每段可點查。不需要分詞器 |
| 英文反查 | FTS5(contentless)撈候選,再依「釋義完全相同 > 開頭相同」+ 義項順序 + 常用度重排(eat → 食べる) |
| **繁中釋義** | 中文維基詞典(約 2.1 萬詞條;常用詞約 38% 有中文)。沒有中文的詞顯示英文(JMdict) |
| 振假名 / 音調 / 例句 / 漢字 | JMdict 讀音、Kanjium 音調高低線、JMdict 精選例句 + 維基中文例句、KANJIDIC2 漢字卡 |
| 發音 | 見下方「外部相依」 |
| 離線 | 同 dictionary:`sw.js` 快取 shell,資料在 OPFS;拿不到 manifest 時退用本機資料 |

**不支援(v2 候選)**:用中文意思反查日文(來源沒有中文→日文的對應)、手寫/部首查字、讀音模糊比對、JLPT 分級、更好的詞頻排序。

## 資料品質原則(怎麼對接)

- 各來源**只在對得上、沒有歧義時才掛**到 JMdict 詞條;對不到、對到多個的一律不掛(不猜),數量寫在 `data/build-report.md`。
- 中文維基詞典約 7.4 萬行機器人匯入的無結構資料**整批不收**(詳見 [`raw/zhwiktionary/SOURCE.md`](raw/zhwiktionary/SOURCE.md))。
- 字形折疊表由 OpenCC(tw→jp,逐字)產生,再用 KANJIDIC2 把關:常用漢字本身不折(擋掉 OpenCC 的 著→着、核→覈)、目標不是常用/人名用漢字的不折(擋掉 參→蔘)。

## 資料生命週期

同 dictionary:**真相只有一個 = build 出來、部署的那支 .db**;瀏覽器 OPFS 是唯讀快取。

- **版本章** = 日期 + 雜湊(SCHEMA + 原始檔 + build 腳本 + `normalize.js`)→ 任一改變版本必變,使用者下次上線自動重抓。
- **更新流程**:改 `raw/` 或 `build/*` → `node jdict/build/build.mjs` → 看 `build-report.md` → commit & push。
- 活用規則有回歸測試:`node jdict/build/test-deinflect.mjs`(改 `js/deinflect.js` 後要跑)。
- 建置依賴只有 `opencc-js`(`cd jdict/build && npm install`)。

## 結構

```
jdict/
├── index.html / styles.css / sw.js
├── js/
│   ├── main.js          殼層:搜尋框、渲染詞條卡/切詞/漢字卡
│   ├── db.js            與 worker 溝通的查詢 API
│   ├── db.worker.js     OPFS SQLite:下載/版本比對/suggest/lookup(精確→活用→英文→切詞)
│   ├── normalize.js     搜尋鍵正規化(前端與 build 共用 → 兩邊鍵一定一致)
│   ├── deinflect.js     活用還原規則(純函式,Node 可測)
│   ├── labels.js        JMdict 代碼 / 維基標籤 → 中文
│   └── pronounce.js     發音【外部相依】
├── vendor/              sqlite-wasm(官方)、wanakana(MIT)— 內嵌,不靠 CDN
├── build/               build.mjs + sources/(jmdict / kanjidic2 / kanjium / zhwiktionary / charfold)+ test-deinflect.mjs
├── data/                build 產物(部署)
└── raw/                 原始資料(納入版控)
```

DB 表:`entries`(JMdict)/ `keys`(搜尋鍵)/ `gloss_fts`(英文反查)/ `zh`(中文釋義)/ `pitch`(音調)/ `kanji` / `fold`(字形折疊)/ `meta`。
要加新「角度」= 多一個 `sources/*.mjs` + 一張表 + `main.js` 多一個 render 函式。

> **維護規則:改了 shell 任一檔(index.html / styles.css / js/* / vendor/*)就要把 `sw.js` 的 `VERSION` +1。**

## 外部相依(誠實列出)

查詢本身**完全離線**。唯一會連外的是**點 🔊 發音**:

| 功能 | 外部資源 | 抓不到時 |
|---|---|---|
| 點 🔊 播真人錄音 | **JapanesePod101** `assets.languagepod101.com/dictionary/japanese/audiomp3.php`(**非官方網址**:沒有公開 API、沒開 CORS;其服務條款限個人非商業使用、且不允許透過非公開介面存取。使用者知情後決定採用,屬個人自用) | 退瀏覽器內建日語語音(Web Speech),優先挑本機語音(離線可用) |

- 該網址沒有錄音時會回一段固定的「尚無錄音」提示音 → 用**長度(約 5.69 秒)**辨識,是它就改用內建語音。
- 這是非官方網址,**隨時可能失效或被擋**;失效時只影響「真人錄音」,查字與離線不受影響。
- 裝置沒有日語語音時(部分 Android 需安裝 Google TTS 日語語音資料),離線或無錄音時會無聲;ⓘ 浮層會提示。

## 授權與出處

JMdict、KANJIDIC2 為 Electronic Dictionary Research and Development Group 之財產,依 [EDRDG 授權](https://www.edrdg.org/edrdg/licence.html)(CC BY-SA 4.0)使用;
中文釋義來自中文維基詞典(CC BY-SA / GFDL,經 kaikki.org 抽取);音調來自 Kanjium(CC BY-SA 4.0)。
因此 `data/` 的 .db 也以 **CC BY-SA** 釋出。頁面上的出處標示在 ⓘ 浮層。
