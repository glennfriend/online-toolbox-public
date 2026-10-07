# 中文維基詞典 — 日語詞條(wiktextract / kaikki.org)

- **是什麼**:中文維基詞典(zh.wiktionary.org)裡「日語」詞條的結構化抽取(wiktextract,由 kaikki.org 發布)。
- **能解鎖**:**日→中釋義**(分詞性、分義項,很多附日文例句+中文翻譯)。這是目前找得到唯一「人工編寫 + 開放授權 + 持續維護」的日中釋義來源。
- **來源**:https://kaikki.org/zhwiktionary/raw-wiktextract-data.jsonl.gz(整個中文維基詞典的抽取,2026-10-02 版,234 MB)
- **授權**:CC BY-SA 與 GFDL(同維基詞典),需標示出處。
- **下載日**:2026-10-07
- **筆數**:137,529 行(lang_code = ja)
- **SHA-1**:`e500841b830331720c10184d71e233bbe1a64baa`

## 檔案
- `zhwiktionary-ja.jsonl.gz`(11.7 MB)= 原始全量檔中 **頂層 `lang_code` 為 `"ja"` 的行,逐行原樣保留**(只篩選、不改內容)。
  全量檔 234 MB 太大不進 repo;kaikki 的單語言檔(`日語/kaikki.org-dictionary-日語.jsonl`)官方標示即將移除,所以從全量檔篩。

## 重新下載 + 篩選
```bash
curl -L -o raw.jsonl.gz https://kaikki.org/zhwiktionary/raw-wiktextract-data.jsonl.gz
zcat raw.jsonl.gz | node -e '
  const rl = require("readline").createInterface({ input: process.stdin });
  const gz = require("zlib").createGzip({ level: 9 }); gz.pipe(require("fs").createWriteStream("zhwiktionary-ja.jsonl.gz"));
  rl.on("line", (l) => { if (!l.includes("\"ja\"")) return; let o; try { o = JSON.parse(l) } catch { return } if (o.lang_code === "ja") gz.write(l + "\n") });
  rl.on("close", () => gz.end());'
```

## 品質備註(重要)
- **約 7.4 萬行是機器人匯入的無結構資料**(`pos: "unknown"` 且沒有詞性標題):釋義直接塞整段字典原文
  (「寝転ぶ【ねころぶ】\n自五 横躺…」)、例句有錯字、大量專業術語。**build 整批不收**。
- 有結構的詞條約 3.2 萬;簡繁混用 → build 用 OpenCC cn→tw 統一成繁體。
- 讀音從 canonical 寫法的 ruby 組出來;對 JMdict 用(寫法, 讀音),對到多個詞條就不掛(不猜)。
- 例句欄偶爾是中文說明而非日文 → 只收含假名的例句。
