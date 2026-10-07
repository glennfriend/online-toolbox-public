# Kanjium — 音調(アクセント)

- **是什麼**:Kanjium 專案的 `accents.txt`,每個詞的東京音調核位置。
- **能解鎖**:音調高低線(平板 0 / 頭高 1 / 中高・尾高 n)。
- **來源**:https://github.com/mifunetoshiro/kanjium(`data/source_files/raw/accents.txt`)
- **授權**:CC BY-SA 4.0,需標示出處(JDict 的 ⓘ 浮層已放)。
- **下載日**:2026-10-07
- **筆數**:124,137
- **SHA-1**:`f7e3ac32739e97372d98698e191bff8b6738b609`

## 檔案
- `accents.txt`(3.2 MB,TSV:寫法 \t 讀音 \t 音調;讀音空白 = 純假名詞;少數音調帶詞性如 `(副)0,(名)3`)

## 重新下載
```bash
curl -L -o accents.txt https://raw.githubusercontent.com/mifunetoshiro/kanjium/master/data/source_files/raw/accents.txt
```

## 用法備註
- 用(寫法, 讀音)對 JMdict;純假名詞只在對到唯一一個「通常寫假名」的詞條時才掛,有歧義就不掛。
- README 沒寫原始資料來源(查不到);v2 可用 UniDic 的 aType(BSD)補覆蓋。
