# 原始資料收集 Log(jdict / raw)

這裡是 **jdict**(日文字典)的「原始資料區」。原則同 `dictionary/raw/`:
- **只放原樣下載的原始資料**,不在這裡加工(加工在 `build/`)。
- 每個來源一個子資料夾,內含資料檔 + `SOURCE.md`(來源網址、授權、下載日、版本、SHA-1、重新下載指令)。
- **刻意納入版本控管**:網路來源會失效,存進 git 才不會以後找不到原始資料。
- 選材標準:**有信譽、可直接下載、授權允許公開再散布、格式穩定**。授權不允許再散布的(BCCWJ、NHK、OJAD、Wadoku…)一律不收。

---

## 收集清單

| 子資料夾 | 內容 | 用途 | 來源 | 授權 | 大小 | 筆數 | 下載日 |
|---|---|---|---|---|---|---|---|
| `jmdict/` | JMdict 英文版 + 精選例句 | 詞條、讀音、詞性、英文釋義、常用度、例句 | ftp.edrdg.org | CC BY-SA 4.0(EDRDG) | 13.1M | 218,869 | 2026-10-07 |
| `kanjidic2/` | KANJIDIC2 | 漢字音訓、字義、筆畫、年級、舊 JLPT | ftp.edrdg.org | CC BY-SA 4.0(EDRDG) | 1.5M | 13,108 | 2026-10-07 |
| `kanjium/` | Kanjium accents.txt | 音調 | github: mifunetoshiro/kanjium | CC BY-SA 4.0 | 3.2M | 124,137 | 2026-10-07 |
| `zhwiktionary/` | 中文維基詞典日語詞條(篩自 kaikki 全量檔) | **繁中釋義**、中文例句翻譯 | kaikki.org/zhwiktionary | CC BY-SA / GFDL | 11.7M | 137,529 行 | 2026-10-07 |

---

## 後續候選(2026-10-07 研究過,v2 再收)

- **Jiten 詞頻表**(jiten.moe,CC BY-SA 4.0,約每月重建)——取代 JMdict 舊常用度標記當排序依據;需先確認能精準對到 JMdict。
- **open-anki-jlpt-decks**(MIT,源自 tanos.co.uk)——JLPT N5–N1 分級,UI 要標「非官方」。
- **KRADFILE / RADKFILE**(EDRDG,CC BY-SA 4.0)——部件查字。
- **KanjiVG**(CC BY-SA 3.0)——筆順 SVG。
- **UniDic aType**(BSD)——補 Kanjium 缺的音調。
- **Tatoeba 日中句對**(CC BY 2.0 FR,約 3.3 萬對,簡繁混雜)——中文例句。

## 研究後確定不收
- zh-ja-dict(LLM 生成、無人工驗證)、BabelNet(非商用)、各種「中日大辞典」MDX(商業辭典轉檔)、CC-CEDICT 同形詞直接當釋義(同形異義:手紙=衛生紙)。
- BCCWJ、JPDB、Innocent/Netflix 詞頻(授權不明或不允許再散布)、JParaCrawl(研究限定)、JMnedict(太大、需求低)。
