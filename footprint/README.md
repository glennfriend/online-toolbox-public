# Footprint

瀏覽資訊外洩檢測, 讓使用者看到網站與它載入的第三方可取得哪些資訊

純前端靜態頁, 零第三方 script, 不需要建置步驟. 所有資源使用相對路徑, 可直接部署至 GitHub Pages 的 `/footprint/`

## 使用與隱私邊界

- 開頁只執行本機檢測, 不把結果傳給任何服務
- 網頁主機仍會收到開頁與本機資源的 HTTP 請求, 可看到 IP 與 headers
- 按下 "開始網路檢測" 才連外, 按鈕旁列出所有服務網域. 這些服務會看到 IP 與連線資訊
- 網路檢測不傳送本機指紋, 不附帶 Cookie 或 Referer. 禁止重新導向, 避免連到未告知的其他網域
- WebRTC STUN 是網路檢測的一部分, 不會在開頁時執行
- Geolocation 有自己的按鈕. 按下後才要求定位, 瀏覽器或作業系統可能使用定位服務. 取得座標只顯示在頁面
- 相機 / 麥克風 / 剪貼簿只說明風險, 不要求權限或讀取內容
- 不使用 localStorage, sessionStorage, Cookie, analytics, CDN 或第三方程式庫. 結果只存在記憶體, 重新整理即清除
- 本工具不註冊 Service Worker. 根目錄 `index.html` 只列離線工具, 因此未加入入口頁, 也未修改根目錄 `sw.js`

狀態的定義:

| 狀態 | 意義 |
|---|---|
| 會外洩 | 網站可以讀取該資訊, 本工具仍只在本機顯示本機結果 |
| 需注意 | 結果有取捨, 可能不完整, 或無法判定 |
| 安全 | 該項目前受到限制, 例如權限被拒絕. 無法推論整體匿名性 |
| 錯誤 | 檢測失敗, 顯示來源與實際錯誤 |
| 待執行 | 尚未取得使用者觸發, 或正在執行 |

## 架構

網路檢測卡片下方是五個分組 tabs, 預設顯示第一組 "網路與 IP". 每次只顯示一組卡片, 卡片內不重複組標題. 資訊卡與名詞說明放在 tabs 外的頁面底部

切換 tabs 只改變顯示, 不重新執行檢測. 本機項目開頁全部執行, 網路項目按鈕後全部執行, 按下網路按鈕會切回第一組

tabs 採 `button` 與 `tablist / tab / tabpanel` 角色. 左右鍵循環切換, Home / End 移到首尾. 手機只有 tab 列可以水平捲動, 頁面保持固定寬度

tab 上的小圓點表示該組仍有檢測執行中, badge 是該組目前 "會外洩" 的結果列數. 本機狀態不另外顯示文字

每個 tab 上方保留可檢測項目的三欄表格. 固定無法提供的項目移到下方 "靜態網頁無法檢測的項目" 區塊, 只列項目與原因. 全組都無法提供時只顯示此區塊, 沒有這類項目時不建立區塊

分區依 registry 的 `status` 定義決定, 與項目 id 無關. 可檢測項目若因當次瀏覽器不支援或網路失敗而拿不到資料, 仍在原表格顯示原因. 外洩數量 badge 的計算維持不變

```text
footprint/
├── index.html               靜態結構, info-tip, 網路同意按鈕
├── styles.css               tabs, 灰底卡片, 三欄表格, 手機排版
├── README.md                功能, 來源, 取捨, 開發
├── cors-verification.txt    實測 HTTP 狀態與 CORS headers
└── js/
    ├── main.js              載入模組, 更新分組狀態, 排程, 隔離錯誤
    ├── tabs.js              分組切換, ARIA 角色, 鍵盤操作與 badge
    ├── registry.js          registerCheck 登記表與 unavailable helper
    ├── util.js              escape, SHA-256, timeout, fetch, IP 正規化
    ├── latency.js           三個區域共用的 HTTP RTT 量測
    ├── glossary.js          頁面底部名詞說明
    └── checks/*.js          43 個檢測, 每個檔案登記一個檢測
```

每個模組自行登記:

```js
registerCheck({
  id: 'example',
  group: '瀏覽器與系統',
  title: '項目名稱',
  needsNetwork: false,
  services: [],
  async run({ results }) {
    return [{ label: '名稱', value: '結果', note: '取捨', level: 'exposed' }];
  },
});
```

`run()` 回傳一組列. `level` 可用 `exposed`, `caution`, `safe`, `error`, `neutral`

`registerCheck()` 預設 `status: 'available'`. 固定無法提供的項目使用 `unavailable()` 登記, 由 helper 設定 `status: 'unavailable'` 與 `reason`. 這些模組的資料回傳仍維持 "未提供檢測" 與 note, 頁面依定義移到獨立區塊, 只顯示項目與原因

新增檢測時新增 `checks/<id>.js`, 並在 `main.js` 的 `modules` 清單加入檔名. 模組按清單順序呈現. 移除時反向操作, 控制器不需要了解檢測邏輯

額外排程欄位:

- `action`: 顯示獨立按鈕, 不自動執行, 用於 Geolocation
- `afterLocal`: 本機檢測全部結束後執行, 用於綜合指紋
- `afterNetwork`: 網路檢測全部結束後執行, 用於時區與 IP 國家比對
- `services`: 此模組會連線的網域, 全部合併顯示於網路按鈕旁. 依賴其他檢測的模組不重複請求

模組載入失敗與 `run()` 丟錯都有各自的錯誤邊界. 單一模組失敗只顯示在該模組的列. 綜合指紋仍可計算, 並說明缺少哪些資料. 顯示內容經 HTML escape, 外部回應不直接插入 HTML

## 每個檢測的資料來源與狀態

"已做" 表示程式已提供檢測. 實際能取得的欄位由瀏覽器, 權限與外部服務決定

| 模組 (`js/checks/`) | 狀態 | 資料來源與限制 |
|---|---|---|
| `public-ip.js` | 已做, 使用者觸發 | `claude.ai/cdn-cgi/trace`, `1.1.1.1/cdn-cgi/trace`, `api.ipify.org?format=json`, `api64.ipify.org?format=json`. 顯示 IP, trace 的 colo / loc. IPv4 與 IPv6 分開比對, 同協定 IP 不同即提示分流或代理不一致 |
| `ip-info.js` | 已做, 使用者觸發 | `ipinfo.io/json`, 無 key. 國家, 城市, 地區, ASN / 業者, 時區. 位置為資料庫推估 |
| `timezone-ip.js` | 已做, 使用者觸發 | 使用前項國家與 `Intl.Locale.getTimeZones()` 或 `timeZones`, 比對國家的所有時區, 並正規化別名. API 不支援時明列未提供檢測 |
| `webrtc.js` | 已做, 使用者觸發 | `RTCPeerConnection` 與 `stun:stun.l.google.com:19302`, 顯示 candidate 的位址, 類型與 related address, 說明 `.local` mDNS 遮蔽 |
| `headers.js` | 已做, 使用者觸發 | `httpbin.org/headers`, 顯示該服務收到的本次 fetch headers. 與一般導覽或其他網站可能不同 |
| `tls.js` | 未提供檢測 | `tls.peet.ws/api/all` 實測 HTTP 200 但沒有 CORS, 無法讀取 TLS / HTTP2 的 JA3 / JA4 |
| `tor.js` | 未提供檢測 | `check.torproject.org/api/ip` 實測 HTTP 200 但沒有 CORS |
| `latency-taiwan.js` | 已做, 使用者觸發 | GCPing `asia-east1` 的 `/api/ping`, 一次暖機, 五次樣本取中位數 |
| `latency-west.js` | 已做, 使用者觸發 | GCPing `us-west1` 的 `/api/ping`, 同上 |
| `latency-east.js` | 已做, 使用者觸發 | GCPing `us-east1` 的 `/api/ping`, 同上 |
| `download.js` | 已做, 使用者觸發 | `speed.cloudflare.com/__down?bytes=1000000`, 實際讀完 1 MB 後以 bytes 與時間計算 Mbps, 明列到最近 Cloudflare 節點 |
| `regional-bandwidth.js` | 未提供檢測 | 缺少區域位置可驗證且有 CORS 的大檔端點, RTT 無法換算頻寬 |
| `dns.js` | 未提供檢測 | 需要自建權威 DNS 伺服器與隨機子網域查詢紀錄 |
| `ip-risk.js` | 未提供檢測 | 可靠風險分數與住宅 / 機房判定通常需付費 API key, 靜態頁無法保護 key |
| `ipv6-only.js` | 未提供檢測 | 本次環境連到 `api6.ipify.org` 失敗 (`curl` exit 7), 無法確認 CORS. `api64` 回 IPv6 才確認該次 IPv6, 回 IPv4 無法否定 IPv6 支援 |
| `user-agent.js` | 已做, 本機 | `navigator.userAgent`, `navigator.platform` |
| `client-hints.js` | 已做, 本機 | `navigator.userAgentData`, `getHighEntropyValues()`: architecture, bitness, model, platformVersion, fullVersionList, wow64 |
| `locale.js` | 已做, 本機 | `navigator.languages`, `Intl.DateTimeFormat`, `Intl.NumberFormat`, 使用固定日期範例 |
| `screen.js` | 已做, 本機 | `screen` 解析度 / 可用範圍 / 色彩深度, `innerWidth/Height`, `outerWidth/Height`, `devicePixelRatio` |
| `hardware.js` | 已做, 本機 | `hardwareConcurrency`, `deviceMemory`, `maxTouchPoints`. 核心數與記憶體可能被限制或模糊化 |
| `connection.js` | 已做, 本機 | `navigator.connection`: type, effectiveType, downlink, rtt, saveData. 只讀估計值 |
| `battery.js` | 已做, 本機 | `navigator.getBattery()`, 支援時顯示電量與充電狀態 |
| `privacy.js` | 已做, 本機 | Do Not Track, GPC, `cookieEnabled`, `pdfViewerEnabled`. Cookie 設定無法推論第三方 Cookie |
| `navigation.js` | 已做, 本機 | `document.referrer`, `history.length`. 只看目前分頁歷程數量, 無法列出造訪網址 |
| `preferences.js` | 已做, 本機 | `matchMedia`: 深色模式, 減少動畫 / 透明, 對比, 強制色彩, 精準指標, 懸停, HDR |
| `canvas.js` | 已做, 本機 | Canvas 2D 固定文字與圖形的 data URL, 用 `crypto.subtle` 計算 SHA-256 |
| `webgl.js` | 已做, 本機 | WebGL 1 vendor / renderer, `WEBGL_debug_renderer_info` 的 unmasked 資訊, 參數與擴充清單 SHA-256. 結束後釋放 context |
| `audio.js` | 已做, 本機 | `OfflineAudioContext`, oscillator 與 compressor 運算樣本 SHA-256. 不播放與錄音 |
| `fonts.js` | 已做, 本機 | Canvas `measureText` 比較 23 種常見字型與三種後備字型. 模組內可修改完整候選清單, 無法列出全部已安裝字型 |
| `media-devices.js` | 已做, 本機 | `enumerateDevices()`, 只計各類裝置數量, 不要求權限或讀取名稱 / ID |
| `voices.js` | 已做, 本機 | `speechSynthesis.getVoices()`, 最多等待 voiceschanged 1.5 秒, 只顯示數量 |
| `plugins.js` | 已做, 本機 | `navigator.plugins`, `navigator.mimeTypes`, 現代瀏覽器可能固定回報 PDF 清單 |
| `permissions.js` | 已做, 本機 | `navigator.permissions.query()`, 查 geolocation, camera, microphone, notifications, clipboard-read, persistent-storage. 不要求授權 |
| `fingerprint.js` | 已做, 本機 | 固定順序組合 14 組本機結果, 以 SHA-256 計算. 缺失項目也列入當次摘要並提示 |
| `uniqueness.js` | 未提供檢測 | 全球獨特性需要大量具代表性的樣本資料庫 |
| `geolocation.js` | 已做, 獨立按鈕 | `getCurrentPosition()`, 顯示經緯度與精確度. 10 秒定位 timeout, 拒絕或失敗顯示原因 |
| `camera-microphone.js` | 未提供檢測 | 說明授權後可能讀取名稱與影音, 本工具不主動要求權限 |
| `clipboard.js` | 未提供檢測 | 說明權限與操作限制, 本工具不讀取內容 |
| `extensions.js` | 未提供檢測 | 沒有通用擴充功能列舉 API, 間接推測容易誤判 |
| `cross-site.js` | 未提供檢測 | 第三方 Cookie 與跨站追蹤需要多個可控制的網域與伺服器 |
| `behavior.js` | 未提供檢測 | 行為識別需要樣本與模型, 本工具不收集滑鼠與鍵盤特徵 |
| `lan.js` | 未提供檢測 | 本地網路存取政策與 CORS 限制, 本工具不掃描內網 |
| `server-tracking.js` | 未提供檢測 | 無法查看其他網站的伺服器紀錄或帳號關聯 |

共 43 個模組: 29 個已實作 (包含需瀏覽器支援的檢測), 14 個固定 "未提供檢測"

## 外部端點與 CORS 實測

2026-10-22 使用下列方式實測, 原始狀態與必要 headers 保存於 [cors-verification.txt](cors-verification.txt)

```sh
curl -s -D - -o /dev/null --max-time 20 \
  -H 'Origin: https://example.com' 'https://httpbin.org/headers'
```

| 端點 | HTTP / CORS | 執行期使用 |
|---|---|---|
| `https://claude.ai/cdn-cgi/trace` | 200, `access-control-allow-origin: *` | 是 |
| `https://1.1.1.1/cdn-cgi/trace` | 200, `*` | 是 |
| `https://api.ipify.org?format=json` | 200, `*` | 是 |
| `https://api64.ipify.org?format=json` | 200, `*` | 是 |
| `https://api6.ipify.org?format=json` | 無法連線, curl exit 7, 無法驗證 | 否 |
| `https://ipinfo.io/json` | 200, `*` | 是 |
| `https://httpbin.org/headers` | 200, `https://example.com` | 是, 另以本機 Chrome 實測 |
| `https://tls.peet.ws/api/all` | 200, 無 CORS | 否 |
| `https://check.torproject.org/api/ip` | 200, 無 CORS | 否 |
| `https://gcping.com/api/endpoints` | 200, 無 CORS | 否, 僅開發時讀取清單 |
| `https://asia-east1-5tkroniexa-de.a.run.app/api/ping` | 200, `*` | 是 |
| `https://us-west1-5tkroniexa-uw.a.run.app/api/ping` | 200, `*` | 是 |
| `https://us-east1-5tkroniexa-ue.a.run.app/api/ping` | 200, `*` | 是 |
| `https://speed.cloudflare.com/__down?bytes=1000000` | 200, `*` | 是 |
| 上述三個 Cloud Run 根路徑 `/` | 200, 無 CORS, 為 HTML | 否 |
| 上述三個 Cloud Run `/ping` | 200, `*` | 否, 統一使用 `/api/ping` |

STUN 使用 UDP, 無 HTTP 或 CORS 概念. 由 WebRTC API 收集候選位址與 STUN 錯誤, 8 秒後停止並關閉連線

GCPing 端點取自 [官方清單](https://gcping.com/api/endpoints). 清單沒有 CORS, 因此固定已驗證的三個區域網址. [官方 README](https://github.com/GoogleCloudPlatform/gcping) 已公告將停用代管服務, 未來可能失效. 失效會在對應列顯示, 不改用其他地區端點或假資料

## 已知取捨

- 本機資訊通常可供同頁第三方 script 讀取. 不同網域的 iframe 仍受來源與權限政策限制
- 開頁自動執行的本機 API 不要求權限. 各瀏覽器會限制高熵資訊與防指紋資料, 失敗會在對應列顯示
- 網路失敗顯示完整服務 URL 與 HTTP 狀態, 或逾時秒數. 若 CORS / 網路拒絕使瀏覽器隱藏狀態, 明說無法取得 HTTP 狀態
- CORS 與公共服務可用性會改變. 每個網路模組獨立失敗, IP 多來源中單一服務失敗仍保留其他來源
- WebRTC 收集不到公開 IP 可能是 UDP 被擋, mDNS 遮蔽或瀏覽器限制, 無法保證沒有外洩
- 時區不一致只能指出可疑差異. 使用者設定, 旅行, 或 IP 資料庫誤差也可能造成差異. 本工具無法證明 VPN 使用
- HTTP RTT 有一次暖機與五次樣本, 至少三次有效才給中位數. 失敗次數與原因保留, 不混用不同區域樣本. 含服務處理與排程, 無法等同 ICMP ping
- 下載僅 1 MB, 用以降低流量成本. 包含 DNS / TLS / 連線建立, 可能低估快速連線. 測的是最近 Cloudflare 節點, 無法用來表示台灣或美國頻寬
- 指紋可能被防追蹤機制隨機化. 相同摘要無法代表全球唯一, 摘要也沒有匿名保證
- 字型量測可能誤判替代字型. `enumerateDevices` 的裝置數可能被隱藏. `voices` 在等待後為 0 仍可能尚未載入
- 螢幕尺寸取本次開頁值. 改變視窗大小後請重新整理, 綜合指紋也會隨著可觀察資料改變

## 本機開發與驗證

使用 HTTPS 或 localhost 才能使用完整 API. ES modules 需要 HTTP server

```sh
cd /var/www/tool/online-toolbox-public
python3 -m http.server 8019
# 開啟 http://127.0.0.1:8019/footprint/
```

驗證步驟:

1. 開啟 DevTools Network, 確認開頁只有同來源資源, 沒有對外 HTTP 請求與權限提示
2. 按下 "開始網路檢測", 確認服務清單, 多來源 IP, IPinfo, HTTP headers, RTT, 下載與 WebRTC 的結果或明確錯誤
3. 將視窗設為 390px, 確認頁面與 info-tip 都沒有水平捲動
4. 將 `canvas.js` 的 `run()` 暫時改成 throw, 停用 browser cache 後重新載入. 只有 Canvas 顯示錯誤, 綜合指紋提示缺少該項且繼續計算. 驗證後還原
5. 模擬 HTTP 503, 確認對應列顯示服務 URL 與 HTTP 503, 其他模組仍正常
6. 確認 Geolocation 只有獨立按鈕才讀取. 不呼叫 `getUserMedia` 或 clipboard 讀取 API
7. 切換五個 tabs 與左右鍵操作, 確認每次只有一個 panel 顯示, 檢測不會重跑. 按網路按鈕後回到第一組, 背景分組結果仍全部更新
8. 390px 下確認 tab 列可以水平捲動, 頁面本身與 info-tip 沒有水平捲動
9. 確認各 tab 依 registry 狀態分區, "其他檢測限制" 只有無法檢測區塊, "瀏覽器與系統" 沒有該區塊. 無法檢測的列只顯示兩欄, 不重複狀態文字

headless Chrome 驗證腳本與各輪截圖保存在工作回報指定的 `footprint-shots/` 目錄. 腳本保留, 不屬於網站執行期資源
