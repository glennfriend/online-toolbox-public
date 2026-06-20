# 詞頻 — Norvig / Google Web Trillion Word Corpus

- **是什麼**:Peter Norvig 從 Google 兆詞網路語料整理的單字出現次數表。
- **能解鎖**:常用度 / 頻率排名(判斷一個字常不常見、難不難)。
- **來源**:https://norvig.com/ngrams/(`count_1w.txt`)
- **授權**:Norvig 免費提供;底層為 Google 語料,使用請註明出處。
- **下載日**:2026-06-20

## 檔案
- `count_1w.txt` — 333,333 行,每行 `word<TAB>count`,依次數由高到低。4.8M。

## 重新下載
```bash
curl -L -o count_1w.txt https://norvig.com/ngrams/count_1w.txt
```
