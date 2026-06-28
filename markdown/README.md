# Markdown

用 Markdown 語法即時 render 成 HTML 顯示。純前端、模組化、可插拔。**(規劃中,尚未實作)**

---

## 安全(目前的決定)

**目前策略:全部 escape。**

不讓使用者寫的「原始 HTML」passthrough —— 原始 HTML 一律當純文字顯示,從根本避免 XSS。

> 為什麼需要管:render = 把 HTML 字串塞進 DOM(`innerHTML`),瀏覽器會「啟用」其中的東西(如 `<img onerror=…>`、`javascript:` 連結),那是執行,不是單純畫面。威脅在「**算別人的 markdown、給別人看**」這個情境(本 repo 走網址分享,屬於此情境)。

- 預計用 **markdown-it**,其**預設 `html: false` 就是 escape**,且內建擋掉危險連結(`javascript:` 等)。
- 這條路最安全,代價是**不能寫原始 HTML**。對「個人用、純文字 markdown → HTML」足夠。

## 之後要擴充時(若要允許原始 HTML)

若日後要像 GitHub / HackMD 那樣允許一部分原始 HTML,**不能只 escape,要改成「允許 + 消毒(allowlist sanitizer)」**:放行安全標籤、剝掉 `<script>` / `on*` 事件屬性 / `javascript:` 連結。屆時參考它們的做法或原始碼:

- **HackMD / CodiMD**:client 端 `markdown-it` + **DOMPurify** 消毒。
- **GitHub**:`cmark-gfm` 解析 + 一層 sanitization 白名單過濾(見 `github/markup`)。

> 提醒:「允許 + 消毒」是**持續的攻防**(邊角案例會被繞過,GitHub/HackMD 都修過真實 XSS),要釘好消毒器版本、關注其安全更新。這是必須誠實列出的外部相依。
