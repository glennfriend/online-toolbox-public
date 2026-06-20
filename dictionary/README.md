# dictionary

把一個英文單字「從各種角度」解析的資料專案。**分兩步走**:

1. **收集原始資料(進行中)** — 把有信譽、授權開放、可下載的英文語料,原樣收進 `raw/`,並記錄來源/授權/下載日。**先求完整、龐大、正確**,不在這步加工。
2. **整理(尚未開始)** — 把 `raw/` 的各種格式正規化、分類、建索引,產出「好搜尋、好查詢」的精簡資料 + 之後給工具用的查詢層。

## 目前狀態

- 已建立原始資料區 `raw/`,完成第一批收集(約 193 MB,9 個來源)。明細與來源見 [`raw/COLLECTION_LOG.md`](raw/COLLECTION_LOG.md),各來源另有自己的 `SOURCE.md`。
- **原始資料納入版本控管**:刻意把 `raw/` 一起進 git,因為網路來源會失效(收集當下就已有數個連結 404)——存進來才不會以後「沒有原始資料」。單一最大檔 23.7 MB,未觸及 GitHub 單檔 100MB 上限。代價:repo 變大(每次 clone 都會帶);GitHub Pages 也會一併部署這些(皆為開放授權資料,公開可下載無妨)。

## 能支撐哪些「角度」(資料 → 用途)

- 定義 / 詞性 / 例句:WordNet、Wordset、Webster's 1913
- 同義 / 反義 / 上下位 / 部分整體:WordNet、Moby、Roget
- 發音 IPA / 音節 / 重音 / 押韻 / 同音:CMUdict(+ 連字符樣式)
- 常用度 / 難度:Norvig 詞頻、google-10k
- 拼相近 / 音相近(易混淆字候選):dwyl 大字表 + 編輯距離、CMUdict 音素、Moby

> 「易混淆字的對比平行例句」這類**對比教學內容**,原始字典給得出定義、給不出對比例句——那是第二步要再決定(精選資料集 vs 接 LLM)的範圍。

## 結構

```
dictionary/
├── README.md
└── raw/                  # 原始資料區(只放原樣下載的資料,納入版控)
    ├── COLLECTION_LOG.md # 總清單:來源 / 授權 / 日期 / 大小 / 筆數
    ├── cmudict/          (+ SOURCE.md)
    ├── wordnet/
    ├── wordset/
    ├── websters-1913/
    ├── moby/
    ├── frequency-norvig/
    ├── frequency-google-10k/
    ├── wordlist-dwyl/
    └── hyphenation/
```
