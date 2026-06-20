# Wordset Dictionary

- **是什麼**:開源的英文字典資料,JSON 格式,結構乾淨。
- **能解鎖**:定義、詞性、同義、**例句**(已結構化,第二步最好用)。
- **來源**:https://github.com/wordset/wordset-dictionary(`data/` 目錄)
- **授權**:開放(以 repo 內 LICENSE 為準;使用前再確認)。
- **下載日**:2026-06-20

## 檔案
- `data/a.json` … `data/z.json` + `data/misc.json`(共 27 檔,57M)。
  每個 key 是單字,值含 `meanings[]`(`def`、`speech_part`、`example`、`synonyms` …)。

## 重新下載
```bash
for L in a b c d e f g h i j k l m n o p q r s t u v w x y z misc; do
  curl -L -o "data/$L.json" "https://raw.githubusercontent.com/wordset/wordset-dictionary/master/data/$L.json"
done
```
