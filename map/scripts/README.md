# map/scripts — 地點資料的驗證與座標補正工具

把 `data/builtin.json` 的地址**逐筆驗證是否真的存在**,並補上**門牌級座標**(誤差約 10m)。

這些都是**建置時**工具:門牌 CSV 只留在本機 `_src/`(已 gitignore),
**不進 git、不上 GitHub Pages**,瀏覽器端完全不會載到。產物只有寫回 `builtin.json` 的座標。

---

## 工具

| 指令 | 用途 |
|---|---|
| `node geocode-moi.mjs --validate` | 對照獨立來源(OSM)驗證 TWD97→WGS84 換算是否正確,不改檔 |
| `node geocode-moi.mjs --report` | 列出 builtin.json 每點能否定位、位移多少,不改檔 |
| `node geocode-moi.mjs --apply` | 把查到的座標寫回 builtin.json |
| `node verify-addresses.mjs <候選檔>` | **新資料進 builtin 前的把關**:逐筆驗證地址存在並回填座標 |
| `node nearby-numbers.mjs "<地址>" …` | 查某路段實際有哪些門牌號 —— 判斷地址是不是寫錯最快的方法 |
| `node geocode-osm.mjs <候選檔>` | 沒有門牌資料的縣市改用 OSM 定位(目前只有台南這樣做) |
| `node merge-candidates.mjs <*.resolved.json>` | 把驗證過的組併進 builtin.json 並依由北到南排序 |

流程:**寫候選檔 → `verify-addresses` → 修掉查無門牌的 → `merge-candidates`**。

---

## 門牌資料下載(要用時再下載,不進 git)

四個縣市的 CSV 欄位幾乎同構:`省市縣市代碼, 鄉鎮市區代碼, 村里, 鄰, 街路段, 地區, 巷, 弄, 號, 橫座標, 縱座標`。
**檔名必須含城市關鍵字**(taipei / taichung / kaohsiung / tainan / yilan),腳本靠檔名判斷縣市。

### 臺北市 ✅

- 資料集:<https://data.taipei/dataset/detail?id=b7c8e724-1e98-45ee-a0bd-f3840623ed97>
- 約 **124 MB / 1,155,531 筆 / UTF-8 / 每月更新**;座標 TWD97(EPSG:3826)

```bash
curl -L -o _src/taipei-address.csv "https://data.taipei/api/dataset/b7c8e724-1e98-45ee-a0bd-f3840623ed97/resource/ce76ca0c-7f94-4935-ab47-1d2a41ca2abb/download"
```

> resource id 每月換版可能改變;失效就用
> `curl -s "https://data.taipei/api/frontstage/tpeod/dataset.view?id=b7c8e724-1e98-45ee-a0bd-f3840623ed97"`
> 取 `resources[0].url`。

### 臺中市 ✅(最好用:自帶 WGS84)

- 資料集:<https://data.gov.tw/dataset/169806>(實際檔案放在 Google 雲端)
- 約 **157 MB / 1,316,674 筆**;**同時提供 TWD97 與 WGS84 經緯度** → 不必換算,誤差來源最少

```bash
# 先取「說明檔」,裡面每個月一列,最後一列是最新版的 Google Drive 連結
curl -L -o /tmp/txg-index.csv "https://newdatacenter.taichung.gov.tw/api/v1/no-auth/resource.download?rid=42350484-812f-4c08-a06f-45783904fe88"
# 再用該列的 file id 下載(下面是 115年1月版)
curl -L -o _src/taichung-address.csv "https://drive.usercontent.google.com/download?id=1oxPMFv5twHRSkK6BtlHD-8t2qfwGF1R9&export=download&confirm=t"
```

### 高雄市 ✅

- 資料集:<https://data.kcg.gov.tw/DataSet/Detail/1d7e3a54-6884-4cb0-b07c-c7c9cd411414>(115年,逐月)
- 約 **107 MB / 1,285,315 筆**;座標 TWD97

```bash
curl -L -o _src/kaohsiung-address.csv "https://data.kcg.gov.tw/File/directDownload/92a14c61-e53c-4718-b0d3-04a32694e8b6"
```

> 該站擋 curl 的預設 UA 較嚴,必要時加 `-A "Mozilla/5.0 …"`。
> 每月新增一個 resource,最新月份的 id 到資料集頁的「詳細資料」連結取得。

### 臺南市 ⏸ 見 [FINISH-TAINAN-FOOD.md](FINISH-TAINAN-FOOD.md)

資料集 <https://data.gov.tw/dataset/120044>。產生資料當天台南市府整個網段停電維護,拿不到。
官方註明其坐標為「人工點位、非準確坐標,僅供參考」,精度低於其他三市。

### 宜蘭縣 ❌

查不到可整包下載的門牌坐標檔(data.gov.tw 上還躺著
[請各地方政府提供門牌座標檔的陳情](https://data.gov.tw/suggests/106384))。
宜蘭 3 組座標目前仍是概略值。

---

## 驗證:這套管線是對的

拿 3 個「由 OSM 獨立查證過門牌」的台北點當標準答案:

| 點 | 門牌資料 vs OSM |
|---|---|
| 霞海城隍廟(迪化街一段61號) | 差 **6 m** |
| 迪化207博物館(迪化街一段207號) | 差 **3 m** |
| 永樂市場(迪化街一段21號) | 差 52 m |

3m / 6m 證明 TWD97→WGS84 換算與比對邏輯正確(若換算錯,三點會系統性一起偏掉)。
永樂市場那 52m 是因為它是**整個街廓的大型建物**,OSM 標中心點、門牌標登記位置,屬正常差異。

**內部一致性**(更強的佐證):補正後同一條街的點會自己排成一直線 ——
大安路一段(南北向)5 點東西向只散 97m、南北 1174m;信義路四段(東西向)5 點南北只散 85m、東西 1139m;
永樂市場與大稻埕戲苑(同為迪化街一段21號)拿到**完全相同**的座標。隨機誤差做不出這種結果。

---

## 踩過的坑(改腳本前先看這裡)

這些都是實際踩到、且會**靜默給出錯誤結果**的地雷:

| 問題 | 症狀 | 解法 |
|---|---|---|
| **臺 / 台** | CSV 寫「**臺**灣大道」,一般人寫「**台**灣大道」→ 整條路查不到 | 組 key 前兩邊都用 `normTai()` 轉成「台」 |
| **區名不能用正規表示式猜** | 非貪婪 →「前鎮區」被切成「前鎮」+「區新光路」;貪婪 →「中區市府路」被切成「中區市」+「府路」 | 改用**各市實際行政區清單**比對(`DISTRICTS_OF`),由長到短 |
| **街名可能在「地區」欄** | 旗津旗下巷的「街路段」是空的,名字在「地區」欄 → 查無 | `streetOf(f) = f[4] \|\| f[5]` |
| **全形數字** | CSV 的號是「９１號」 | `toHalf()` |
| **連字號門牌** | 「53-4號」會被誤讀成「4號」 | `normDash()` 統一成「53之4號」 |
| **多層之** | 台中有「2之3之2號」 | `baseNo` 用 `(?:之\d+)*` |
| **樓層** | 「91號二樓」 | 只取到「號」為止,同棟共用座標 |

---

## ⚠ 這套方法修得了什麼、修不了什麼

- **修得了**:座標誤差(原本用街道推估可能偏 100–1000m,實測最大位移 1088m),以及**抓出寫錯的地址**。
- **修不了**:
  - **店還在不在** —— 門牌庫收錄的是「地址」,店倒了門牌還在。
  - **營業時間、評分** —— 開放資料沒有,只能從網路查,也最容易過期。

「查無門牌」等於在說**這個地址不存在**。用 `nearby-numbers.mjs` 看該路段實際有哪些號碼,
一看就知道是不是寫錯。實例:迪化街一段是 …28, 30, **34**, 34之1, 36…,**根本沒有 32 號**
→ 小藝埕的地址是錯的(正解 34 號),不是店收了。

---

## 新增資料的建議做法

1. **地址一定要寫到門牌號**(`○○路○段○號`),巷弄也寫清楚 —— 有門牌才驗得了、補得了座標。
2. 找**權威名單**當來源。實務上「米其林必比登」名單的地址品質最好
   (台中 23 家、高雄 21 家、台南 30 家,官方公布、媒體逐一整理)。
3. 先跑 `verify-addresses.mjs`;**查無門牌 = 地址存疑**,上網查正確地址 →
   再用 `nearby-numbers.mjs` 確認該號真的存在 → 才寫回。
4. **沒有可信來源的欄位就不要填**。目前新增的三市資料**一律不填 `rating`** ——
   找不到可信來源,寧缺勿造。營業時間有寫的都標成參考值。
5. 座標沒把握就誠實留 `approx: true`,前端會顯示「座標概略」。
6. 前端外連 Google Maps 一律用**店名 + 地址**(見 `js/main.js` 的 `gmapQuery()`),
   不要用我們的座標 —— Google 自己的搜尋比我們準,且會落在店家資訊卡。

## `geo` 欄位的意思

| 值 | 意思 | approx |
|---|---|---|
| `moi-address` | 政府門牌資料,門牌級(約 10m) | 無 |
| `moi-nearest` | 該號未登記,借用同路段最接近的門牌 | `true` |
| `osm` | OSM 查到且**門牌號相符** | 無 |
| `osm-approx` | OSM 只查到路/地標層級 | `true` |
| (無) | 未經驗證的舊資料 | 通常 `true` |
