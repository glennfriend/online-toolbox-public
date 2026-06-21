# ECDICT — 英漢字典資料庫

- **是什麼**:目前 GitHub 最權威完整的開源英漢字典(7.8k★)。每個英文字/詞附**中文釋義**、英文定義、音標、詞性、難度標籤、詞頻、詞形變化。
- **能解鎖**:**英文 → 繁體中文釋義**(本專案要的「看不懂英文」解法)、難度分級(中考/高考/CET4/6/考研/TOEFL/IELTS/GRE)、柯林斯星級、牛津 3000、BNC/當代詞頻、詞形變化。
- **來源**:https://github.com/skywind3000/ECDICT(`ecdict.csv`)
- **授權**:MIT
- **下載日**:2026-06-21
- **筆數**:770,612

## 檔案
- `ecdict.csv`(65.9MB)。表頭:
  `word, phonetic, definition, translation, pos, collins, oxford, tag, bnc, frq, exchange, detail, audio`
  - `translation` = **中文釋義(簡體)**,例:serendipity → `n. 偶然发现珍宝的运气/才能, 易遇奇缘的运气`
  - `tag` = 難度標籤(zk 中考 / gk 高考 / cet4 / cet6 / ky 考研 / gre / toefl / ielts)
  - `collins` 柯林斯星級(1–5)、`oxford` 是否牛津 3000、`exchange` 詞形變化(複數/時態/比較級…)

## 重新下載
```bash
curl -L -o ecdict.csv https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv
```

## 用法備註
- 中文是**簡體** → build 階段用 **OpenCC(s2twp)** 轉成台灣繁體(連詞彙在地化:软件→軟體)再存。
- 770k 筆遠多於目前 wordset 的 10.8 萬,join 後幾乎所有常用字都有中文。
- 也可考慮更大的 `skywind3000/ECDICT-ultimate`(長尾更多,但更大);一般用途此核心庫已足。
