# 原始資料收集 Log(dictionary / raw）

這裡是 **dictionary** 專案的「原始資料區」。原則:
- **只放原樣下載的原始資料**,不在這裡加工(加工是第二步,輸出到別處)。
- 每個來源一個子資料夾,內含資料檔 + `SOURCE.md`(來源網址、授權、下載日、版本、檔案清單)。
- 每次新增/更新都在本檔記一筆(日期、來源、大小、授權、備註)。
- 這些檔很大(目前約 193 MB),但**刻意納入版本控管**——網路來源會失效(收集當下已遇到數個 404),存進 git 才不會以後找不到原始資料。要重建也可照各 `SOURCE.md` 的指令重新下載。

選材標準:**有信譽(學術/官方/知名開源)、可直接下載、授權開放、格式穩定少改版**。

---

## 收集清單

| 子資料夾 | 內容 | 主要欄位/用途 | 來源 | 授權 | 大小 | 筆數 | 下載日 |
|---|---|---|---|---|---|---|---|
| `cmudict/` | CMU 發音字典 | ARPAbet 音素、重音 → IPA/音節/押韻/同音 | github: cmusphinx/cmudict | BSD-2 類(CMU) | 3.5M | 135,166 | 2026-06-20 |
| `wordnet/` | Princeton WordNet 3.1 | 定義、同/反義、上下位、部分整體 | wordnetcode.princeton.edu | WordNet License(寬鬆) | 53M(解開) | 82,192 名詞 synset+ | 2026-06-20 |
| `wordset/` | Wordset Dictionary | 定義、詞性、同義、例句(JSON) | github: wordset/wordset-dictionary | 開放(見 repo LICENSE) | 57M | a–z + misc | 2026-06-20 |
| `websters-1913/` | Webster's 1913 字典 | 完整定義(JSON) | github: matthewreagan/WebstersEnglishDictionary | 公共領域(原典) | 22M | ~ 全字 | 2026-06-20 |
| `moby/` | Moby Project + Roget | 同義詞庫、Roget、詞性、發音 | github: elitejake/Moby-Project | 公共領域(Grady Ward) | 34M | 見下 | 2026-06-20 |
| `frequency-norvig/` | Google 兆詞語料詞頻 | 詞頻(常用度/排名) | norvig.com/ngrams | 免費可用(註明出處) | 4.8M | 333,333 | 2026-06-20 |
| `frequency-google-10k/` | 最常用 10000 英文字 | 常用字排序 | github: first20hours/google-10000-english | MIT(資料源自 Google 語料) | 152K | 10,000 ×2 | 2026-06-20 |
| `wordlist-dwyl/` | 英文單字總表 | 大字表(變位字/拼相近) | github: dwyl/english-words | Unlicense(公共領域) | 4.1M | 370,105 | 2026-06-20 |
| `hyphenation/` | en_US 連字符樣式 | 音節斷點(Liang/TeX) | github: LibreOffice/dictionaries | 見 repo(TeX 樣式,寬鬆) | 104K | 11,130 樣式 | 2026-06-20 |
| `ecdict/` | 英漢字典(ECDICT,7.8k★) | **英→中釋義**、難度分級、詞頻、詞形變化 | github: skywind3000/ECDICT | MIT | 66M | 770,612 | 2026-06-21 |

`moby/` 細目:`mthesaur.txt`(同義詞庫,30,259 主條目,24M)、`roget13a.txt`(Roget 1913,1.5M)、`mobypos.txt`(詞性,233,356 詞,2.9M)、`mpron.txt`(發音,177,266 詞,5.3M)。

---

## 後續候選(尚未收,第二步前可再補)

- **SUBTLEX-US**(學術級詞頻,字幕語料)——分布在 osf.io / 大學站,多為 xlsx/zip,需另外處理。
- **Open English WordNet(OEWN)**——Princeton WordNet 的現代維護版(WN-LMF XML),關係更新。
- **NGSL / AWL / Oxford 3000·5000 / CEFR-J**——難度分級字表(部分需確認授權)。
- **GCIDE**(GNU 協作英語字典,Webster 1913+增補,GPL)——定義更完整但較大。
- **常見易混淆詞清單(curated)**——目前找到的幾個 repo 路徑已失效,待換來源或自建。
- **ConceptNet 英文子集**——常識關係,dump 較大。

> 找到合適來源就新增一個子資料夾 + `SOURCE.md`,並在上表補一列。
