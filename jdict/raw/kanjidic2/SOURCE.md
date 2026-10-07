# KANJIDIC2

- **是什麼**:EDRDG 維護的漢字資料庫。
- **能解鎖**:音讀/訓讀/名乘、英文字義、筆畫數、年級(1–6 小學、8 常用、9–10 人名用)、舊制 JLPT 1–4 級、新聞頻率排名;
  另外 build 用年級欄位替「繁體→新字體」對照表把關(見 `build/sources/charfold.mjs`)。
- **來源**:http://ftp.edrdg.org/pub/Nihongo/kanjidic2.xml.gz(專案頁 https://www.edrdg.org/wiki/index.php/KANJIDIC_Project)
- **授權**:CC BY-SA 4.0(EDRDG License,https://www.edrdg.org/edrdg/licence.html),使用頁面須標示出處。
- **下載日**:2026-10-07(database_version 2026-280)
- **筆數**:13,108 字
- **SHA-1**:`9095e925715593fb4e1cfbc3e5b079ff12e64a94`

## 檔案
- `kanjidic2.xml.gz`(1.5 MB,XML,原樣保存)

## 重新下載
```bash
curl -L -o kanjidic2.xml.gz http://ftp.edrdg.org/pub/Nihongo/kanjidic2.xml.gz
```
