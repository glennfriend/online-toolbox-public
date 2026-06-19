// microlink 截圖服務(免金鑰、有 CORS → 回傳的圖能被 fetch 成 blob,所以可下載/複製)。
//
// API:GET https://api.microlink.io/?url=<目標>&screenshot=true&fullPage=true&meta=false
// 回傳 JSON:{ status:'success', data:{ screenshot:{ url, width, height } } }
// data.screenshot.url 是一張可直接顯示、也可 fetch 成 blob 的 PNG。

export function microlink() {
  return {
    id: 'microlink',
    name: 'Microlink(可下載 / 複製)',

    async capture(url, opts) {
      const api = 'https://api.microlink.io/?url=' + encodeURIComponent(url)
        + '&screenshot=true&meta=false'
        + (opts.fullPage ? '&fullPage=true' : '');

      const res = await fetch(api);
      const json = await res.json().catch(() => null);
      if (!json) throw new Error('服務沒有回應有效內容');
      if (json.status !== 'success' || !(json.data && json.data.screenshot && json.data.screenshot.url)) {
        // microlink 失敗時通常帶 message(例如達免費額度、目標網址無法存取)
        throw new Error(json.message || '截圖失敗(可能該網址無法存取,或已達免費額度)');
      }

      const shot = json.data.screenshot;
      return {
        imageUrl: shot.url,
        meta: { width: shot.width, height: shot.height },
        getBlob: async () => {
          const r = await fetch(shot.url);
          return await r.blob();
        },
      };
    },
  };
}
