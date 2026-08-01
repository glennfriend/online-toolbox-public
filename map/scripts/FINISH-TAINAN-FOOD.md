# 待辦:補完「台南 - 美食」(12 點)

## 現況

「台南 - 美食」12 家店已經全部選好、地址與說明都寫好了,存在
[`candidates/tainan.json`](candidates/tainan.json) 的 `b-tainan-food` 組裡。

**唯一缺的是座標**,原因很單純:

> 產生資料當天(2026-08-01),**臺南市整個政府網段停電維護**
> (永華市政大樓高壓變壓器汰換,7/31 18:00 – **8/2 17:30**),
> `data.tainan.gov.tw`、`soa.tainan.gov.tw`、`gis.tainan.gov.tw` 全部無法連線,
> 拿不到台南門牌坐標資料。

台南**景點**組能完成,是因為那些是國際知名地標,可以用 OSM 英文名查到;
但**小吃店 OSM 完全沒有資料**,而且實測發現 Nominatim / Photon 對台灣中文地址
會**自信地回傳錯誤結果**(台南店家配到淡水、龜山、喀拉蚩、阿根廷),不能用。
與其塞不可靠的座標進去,先不收。

## 台南開放平台恢復後,怎麼補完(三個指令)

```bash
cd map/scripts

# 1. 下載台南門牌坐標(檔名一定要含 tainan,腳本靠檔名判斷縣市)
curl -L -o _src/tainan-address.csv "https://data.tainan.gov.tw/File/ResourceCsvDownload/af44f904-2f4c-49b2-aaf8-1a64dce09bd4"

# 2. 驗證地址 + 回填座標(查無門牌的會列出來,那就是地址要修)
node verify-addresses.mjs candidates/tainan.json

# 3. 併進 builtin.json(景點組會一併以門牌級座標覆蓋,精度比現在的 OSM 更好)
node merge-candidates.mjs candidates/tainan.resolved.json
```

> 資料集頁(若上面的 resource id 失效,到這裡重拿):
> <https://data.gov.tw/dataset/120044> → `distribution[].resourceDownloadUrl`
> 台南市的檔案有 7 個 resource(分批),必要時全部下載,腳本會逐檔掃描。

## 注意

- 臺南市官方對這份資料的說明是:**「坐標係各戶政事務所人工點位,非準確坐標位置,僅供參考」**,
  精度低於台北/台中/高雄。補完後仍建議抽樣核對。
- `geocode-moi.mjs` 的 `CITIES` 已經預留 `臺南市` 一列,但 `districts` 是 `null`
  (沒資料無法反推區代碼對照表)。下載後請照台北/台中/高雄的做法,
  用代表街道反推並**逐一核對**後填進 `TNN_DISTRICT`,再把 `districts` 指過去。
  台南的行政區名稱清單已經寫在 `TNN_DISTRICTS`(給地址解析用),可以直接對照。
