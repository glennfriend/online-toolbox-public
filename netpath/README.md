# Netpath

連線分段測速, 用時間曲線比較到 CDN, 台灣與海外的 HTTP 來回時間

純前端靜態頁, 零第三方程式庫, 不需建置或安裝. 資源全用相對路徑, 可部署至 GitHub Pages 的 `/netpath/`

## 使用與隱私

- 首次開頁只載入本站資源, 按 "開始" 才連檢測服務
- 開始狀態保存在 localStorage, 即瀏覽器的本機儲存區. reload 後自動續跑, 按 "暫停" 後 reload 不連外
- 網站主機仍會收到頁面與本機資源的請求. 開始後檢測服務會看到 IP, HTTP headers 與連線資訊
- 每個請求都設定 `cache: 'no-store'`, `credentials: 'omit'`, `referrerPolicy: 'no-referrer'`
- 內建目標使用 `redirect: 'error'`. 自訂目標使用 `mode: 'no-cors'` 與 `redirect: 'follow'`, 可能連到清單以外的網域
- 不使用 analytics, Cookie, CDN script, Service Worker 或 footprint 的檔案
- trace 回應含 IP, 程式只取 `colo`, 不顯示或儲存原文
- 自訂 URL 保存在 localStorage, 也會寫入匯出的 JSON. 請避免填入機密
- 不修改根目錄 `index.html` 與 `sw.js`. 需要網路的工具依 footprint 慣例不列入離線入口

## 架構

topbar 下方是全頁共用的 consent 卡, 包含開始 / 暫停, 間隔, 服務網域與流量提醒. 卡片下方依序是 "分段", "曲線", "速度", "自訂目標", "說明" 五個 tabs. 首次開頁預設顯示 "分段", 每次只顯示一個 panel. 卡片標題描述具體內容, 不重複 tab 名稱

"說明" 在桌面靠右, 手機時接在最後一起水平捲動. 排錯指引, 量測限制, 儲存估算, 背景分頁 timer, GCPing 停用提醒與文件連結集中在這個 tab. 其他 tab 保留操作控制, 結果與必要的卡片註記

tabs 採 `button` 與 `tablist / tab / tabpanel` 角色. 左右鍵循環切換五個分頁, Home / End 移到首尾. 手機只有 tab 列可水平捲動, 頁面本身保持固定寬度. 各 panel 由 `index.html` 的 template 移入, 切換保留既有 DOM 與表單內容

切換 tabs 只改顯示, 不會停止, 重啟或重新執行量測. 最後觀看的 tab 存在 `netpath.v1` 的 `tab` 欄位, 透過原本有 try/catch 的 store 儲存. reload 回到同一個 tab, 舊資料沒有此欄位或值無效時回到 "分段"

canvas 只在 "曲線" 可見時繪製. 隱藏時繼續量測與儲存, 不使用寬度 0 的畫布重畫. 切回來會取最新樣本繪製, ResizeObserver 也會略過隱藏狀態

"分段" 的紅點表示最近一輪有任一目標請求失敗, 成功輪次或清除記錄後隱藏. "速度" 的藍點只在測速執行中顯示. 其他 tab 沒有狀態標記, 不建立無意義的數量 badge

`js/tabs.js` 依 footprint 的結構複製調整後獨立維護, 不 import footprint 檔案. 分頁模組只負責顯示, 鍵盤與狀態點, 量測排程仍由 `js/main.js` 管理

## 功能與量測邊界

上方示意路徑: 裝置 -> WiFi / 分享器 -> ISP -> CDN -> 台灣 -> 美西 -> 美東

每個可測目標的數值都是 "裝置到該目標" 的往返時間. 實際網路路由可能不同, 請求未必經過圖中的前一個目的地. 不能相加或相減來還原各段時間

| 卡片 | 實際意義 |
|---|---|
| 裝置 | 計時起點, 沒有可獨立量的網路延遲 |
| WiFi / 分享器 | 無法量測. HTTPS 公開頁受 mixed content, Chrome Private Network Access 等限制, 不掃描內網 |
| ISP | 無法量出單段延遲或辨識業者. 圖上以中華電信等業者說明角色 |
| CDN | 到 Cloudflare 所導向節點的來回時間, 未必是地理最近節點 |
| 台灣 / 美西 / 美東 | 到 GCPing 固定區域端點的來回時間 |
| 總延遲 | 裝置到美東的完整 HTTP 時間, 直接使用美東樣本 |

每輪對每個目標依序送 3 次 fetch, 各目標平行執行. 用 `performance.now()` 計時, 內建目標計時至 body 讀完. 自訂目標只能量到 opaque 回應, 包含重新導向的總時間. 至少 2 次成功才顯示中位數. 每次最多等 6 秒, 包含重新導向與可讀的 body. 沒有暖機剔除, 首次連線的 DNS / TLS 成本照實保留

最近 5 分鐘的中位數與 p95 使用各輪的中位數, p95 採 nearest-rank. 失敗率為失敗請求數 / 總請求數, 包含部分成功的輪次. 少於 2 次成功的輪次不算有效中位數. 逾時, 內建端點非 2xx, 網路 / CORS / 重新導向失敗都記為失敗

Timing-Allow-Origin 是服務允許瀏覽器提供跨站計時細項的設定. 有許可時可展開 DNS / TCP / TLS / TTFB. TCP 不含 TLS, TTFB 從 requestStart 到 responseStart. 重用連線時前三項可能為 0, 不代表家中網路零延遲

卡片細項顯示最近一次成功請求, 卡片主要數值為本輪中位數. 兩者來源明確分開. 細項只保留在記憶體, reload 後顯示尚無細項, 歷史中位數仍在

Cloudflare 若提供 `cfRequestDuration` 才扣除, 並另外顯示該次估算. 不改動主要曲線與統計, 不把其他可能重疊的 Server-Timing duration 相加. 本次驗證只收到 `cfSpeedEdge` 與 `cfSpeedWorker`, 所以不扣除. `cf-ray` 沒有 expose 時 JS 讀不到, 優先使用 `cf-meta-colo`. trace 的 colo 另標示來源, 不假設兩個服務使用相同節點

### 持續記錄與曲線

- 間隔選 5 / 15 / 60 秒, 預設 5 秒. 從每輪開始時間計算下輪間隔
- 每次只執行一輪. 若請求超過間隔, 等本輪完成才開始下輪, 不補跑漏掉的輪次
- 背景分頁可能被瀏覽器拉長到 1 分鐘以上, 睡眠與關頁期間無法記錄
- canvas 使用實際 Unix 時間畫 X 軸. 可選最近 10 分鐘 / 1 小時 / 6 小時 / 全部
- 有失敗的輪次斷線並畫紅點, 缺少中位數時紅點畫在圖頂端. 不補 0, 相隔超過 90 秒也斷線
- 支援滑鼠, 觸控與左右鍵 / Home / End 讀取樣本. 卡片與文字提供圖表之外的結果
- 暫停中止目前請求, 未完成輪次不寫成失敗. 清除或更換目標時, 舊輪次完成結果會丟棄

### 速度

開始後預設每 10 分鐘一次, 第一次等滿 10 分鐘. 可關閉自動測速, 或按 "立即測". reload 使用上次測速時間延續計時, 到期只跑一次

每次先下載 1,000,000 bytes. 若讀完小於 1,500 ms, 再下載 10,000,000 bytes, 顯示後者結果. 上傳固定 1,000,000 bytes, 使用簡單 POST `Content-Type: text/plain`, 不需額外 CORS preflight. 下載失敗仍嘗試上傳, 各自顯示錯誤. 每個請求最多等 25 秒

每次約 2-12 MB, 不含協定與重試成本. 10 分鐘一次的上限約 72 MB / 小時. 關閉自動測速仍有小量延遲探測流量. 自訂大檔 URL 另計. 測速時暫停延遲輪次, 避免自己的傳輸塞滿連線

Mbps = 實際 bytes * 8 / 毫秒 / 1000. 這是到 Cloudflare 的短時間單請求速度, 含 DNS, 握手與伺服器時間. 上傳包含等回應時間, 可能低估線路上限. 不代表特定國家的頻寬

### 自訂目標

最多 3 個 HTTPS URL, 使用 `mode: 'no-cors'` 與 `redirect: 'follow'`. 量到的是含重新導向的總時間, 且只量得到總時間. opaque 回應表示內容, HTTP 狀態與計時細項對 JS 隱藏. 401 / 403 也算有回應, 無法證明服務健康或檔案下載完畢

自訂目標允許跟隨重新導向, 可能連到服務清單以外的網域. 重新導向後的服務也會看到連線資訊. 保留原始 query, 避免改壞簽章 URL. 內建端點仍禁止重新導向

加入 URL 不會自動視為同意開始. 已開始時下一輪會包含新目標. 移除目標也會清除該欄歷史, 避免重用欄位時混入舊目標資料

## 外部端點

| 網域 / 路徑 | 用途 | CORS / Timing |
|---|---|---|
| `speed.cloudflare.com/__down?bytes=0` | CDN 延遲與可讀的節點代碼 | ACAO `*`, TAO `*` |
| `speed.cloudflare.com/__down?bytes=1000000` / `10000000` | 下載測速 | ACAO `*`, TAO `*` |
| `speed.cloudflare.com/__up` | POST 上傳測速 | ACAO `*`, TAO `*` |
| `1.1.1.1/cdn-cgi/trace` | 每次開頁開始後查一次 colo | ACAO `*`, 無 TAO |
| `asia-east1-5tkroniexa-de.a.run.app/api/ping` | 台灣 | ACAO `*`, 無 TAO |
| `us-west1-5tkroniexa-uw.a.run.app/api/ping` | 美西 | ACAO `*`, 無 TAO |
| `us-east1-5tkroniexa-ue.a.run.app/api/ping` | 美東 | ACAO `*`, 無 TAO |

ACAO 是 Access-Control-Allow-Origin, 決定網頁可否讀跨站回應. TAO 是 Timing-Allow-Origin, 決定能否讀計時細項

2026-10-23 使用帶 `Origin: https://example.com` 的 curl 驗證, 結果見 [cors-verification.txt](cors-verification.txt). 區域端點沿用 footprint 已驗證的網址, 未讀取或 import footprint 的程式

GCPing [官方 README](https://github.com/GoogleCloudPlatform/gcping) 已公告停用代管服務. 未來失效時顯示失敗與原因, 不切換到其他區域. Cloudflare 量測方式可參考[官方說明](https://blog.cloudflare.com/how-does-cloudflares-speed-test-really-work/), 本工具沒有載入其套件

## 儲存格式與估算

localStorage key: `netpath.v1`. 所有讀寫都在 try/catch 內. 讀不到或超出額度會顯示提示, 記憶體中的量測與匯出繼續運作

- 固定容量環形緩衝, 最多 17,280 輪, 新資料覆蓋最舊資料
- 讀取, 顯示, 儲存與匯出時剔除超過 24 小時的延遲與測速記錄
- 每輪存 `[Unix毫秒, CDN中位數, CDN失敗數, 台灣中位數, 台灣失敗數, 美西中位數, 美西失敗數, 美東中位數, 美東失敗數, ...自訂欄位]`
- 中位數保留 1 位小數, 失敗數為 0-3. 缺少有效中位數用 `null`, 沒有量測的自訂欄位為 `null, null`
- 不存重複物件鍵, 不存每次原始細項, 尾端未用自訂欄位不寫入
- 以 5 秒一次, 24 小時 = 17,280 輪. 每輪約 50-65 字元, 約 0.86-1.12 MB JSON. localStorage 以 UTF-16 估計約 1.7-2.3 MB
- 加滿 3 個自訂目標約 1.5-1.8 MB JSON, UTF-16 約 3-3.6 MB. 數值大小, 錯誤與瀏覽器額度會影響實際用量
- 測速另留最近 24 小時, 最多 150 筆. 設定與自訂 URL 同一份保存
- reload 會載入舊曲線. 清除需確認, 保留目標與設定. 匯出 JSON 含欄位名稱, 端點對照與每輪取樣次數

## 不支援與限制

- 不支援 traceroute, ICMP ping, 分離 WiFi 與 ISP 延遲, 或辨識 ISP
- 沒有 API key, 後端代理, 內網掃描, IP 定位或跨瀏覽器同步
- HTTP 時間包含瀏覽器排程, 代理, 公共端點處理與網路時間. 無法單憑曲線確診故障位置
- 關頁, 系統休眠與瀏覽器凍結時不會持續採樣. localStorage 被清除後無法復原
- 自訂 HTTPS URL 仍可能被瀏覽器或企業政策拒絕. CORS / 網路失敗時狀態碼不可讀
- 公共端點不保證可用性, 未自動切換其他服務. 單一目標失敗只影響自己的曲線
- 同一瀏覽器開多個分頁會各自探測並覆寫同一份儲存, 建議只開一頁

## 檔案與驗證

| 檔案 | 職責 |
|---|---|
| `index.html`, `styles.css` | 說明, 同意操作與響應版面 |
| `js/segments.js` | 固定目標, 自訂欄位與 URL 驗證 |
| `js/probe.js` | fetch 計時, 中位數, Resource Timing, trace |
| `js/store.js` | 環形緩衝, 資料驗證, localStorage 錯誤邊界 |
| `js/chart.js` | canvas 與樣本互動, 不負責量測 |
| `js/speed.js` | 下載與上傳, 不負責排程 |
| `js/main.js` | 同意狀態, 排程, 介面與匯出 |
| `js/tabs.js` | 分頁顯示, ARIA, 鍵盤切換與狀態點 |
| `tests/verify-cors.py` | curl 驗證並更新端點記錄 |
| `tests/browser.cjs` | 真實 Chrome 連線, tab 切換與記憶, 隱藏畫布, reload, 手機截圖與測速 |
| `tests/browser-edge.cjs` | 真實自訂 URL 403, 模擬重新導向, 單一端點失敗, 儲存拒絕與 10 分鐘排程 |
| `tests/modules.test.mjs` | 環形緩衝, 逾時, 資料驗證與取樣統計 |

從工具上層目錄啟動:

```sh
python3 -m http.server 8027 --bind 127.0.0.1
node netpath/tests/browser.cjs
node netpath/tests/browser-edge.cjs
node --test netpath/tests/modules.test.mjs
python3 netpath/tests/verify-cors.py
```

browser 腳本使用既有 `/var/www/rh/remote-hunter-frontend/node_modules/playwright`, channel `chrome`, headless. 不是網站執行期相依, 沒有安裝套件

截圖預設寫到任務指定 scratchpad, 檔名為 `netpath-tab-1.png` (分段), `netpath-tab-2.png` (曲線), `netpath-tab-3.png` (說明), `netpath-tab-m.png` (390px 分段). 同處保存 `netpath-browser-report.json` 與 `netpath-export.json`. 可用 `NETPATH_URL`, `NETPATH_SHOTS` 更換網址與輸出位置
