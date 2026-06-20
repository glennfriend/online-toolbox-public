# Princeton WordNet 3.1

- **是什麼**:普林斯頓大學的英文詞彙語意網路。把詞按「同義集(synset)」組織,並標出語意關係。
- **能解鎖**:定義(gloss)、詞性、**同義 / 反義、上位/下位(is-a)、部分/整體(part-of)、衍生詞**、部分例句。
- **來源**:https://wordnet.princeton.edu/download(檔:`wn3.1.dict.tar.gz`,來自 https://wordnetcode.princeton.edu/）
- **授權**:WordNet License(寬鬆、BSD 類,可自由使用含商用,需保留聲明)。
- **下載日**:2026-06-20
- **版本**:3.1

## 檔案
- `wn3.1.dict.tar.gz` — 原始壓縮檔(16M)。
- `dict/` — 解開後的資料庫(53M):`data.noun/verb/adj/adv`(synset 定義與關係)、`index.*`(詞 → synset)、`*.exc`(不規則變化)等。名詞 synset 82,192 個。

## 重新下載
```bash
curl -L -o wn3.1.dict.tar.gz https://wordnetcode.princeton.edu/wn3.1.dict.tar.gz
tar -xzf wn3.1.dict.tar.gz   # 解出 dict/
```

> 備註:第二步可考慮改用 Open English WordNet(OEWN,維護版,WN-LMF XML),關係較新。
