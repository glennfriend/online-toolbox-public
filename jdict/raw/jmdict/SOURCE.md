# JMdict(含精選例句的英文版)

- **是什麼**:EDRDG 維護的日→多語字典,這份是英文釋義版並附 Tatoeba 精選例句(約 3.2 萬句,EDRDG 挑過、每週同步)。
- **能解鎖**:詞條(漢字寫法/讀音/詞性/英文釋義)、常用度標記(news1/ichi1/spec/gai1/nfXX)、例句、外來語來源。
- **來源**:http://ftp.edrdg.org/pub/Nihongo/JMdict_e_examp.gz(專案頁 https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project)
- **授權**:CC BY-SA 4.0(EDRDG License,https://www.edrdg.org/edrdg/licence.html)。**使用的頁面必須標示出處**(JDict 的 ⓘ 浮層已放)。
- **下載日**:2026-10-07(檔內 `JMdict created: 2026-10-07`)
- **筆數**:218,869 詞條、32,310 例句
- **SHA-1**:`4027e7b80467c601f4880e597d5ff8dbe18028b9`

## 檔案
- `JMdict_e_examp.gz`(13.1 MB,XML,原樣保存)

## 重新下載
```bash
curl -L -o JMdict_e_examp.gz http://ftp.edrdg.org/pub/Nihongo/JMdict_e_examp.gz
```

## 用法備註
- 格式規律(每個元素一行),`build/sources/jmdict.mjs` 用正規表示式逐個 `<entry>` 解析,不需要 XML 套件。
- 詞性/標記是 DTD 自訂實體(`&v5k;`),保留代碼本身,說明文字另存進 DB meta.entities,前端給中文標籤。
- 常用度標記是 2000 年前後的資料,只是粗略指標(EDRDG 自己也這樣說);之後可補 Jiten 詞頻(CC BY-SA 4.0)。
