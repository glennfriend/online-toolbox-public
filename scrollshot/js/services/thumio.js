// thum.io 截圖服務(免金鑰,網址本身就是圖 → 直接當 <img src> 顯示)。
//
// 端點:https://image.thum.io/get/[選項]/<目標網址>(目標網址直接接在後面,不要 encode)
//   fullpage  → 整頁;noanimate → 不等動畫
// 注意:thum.io 的圖通常沒有 CORS 標頭,所以 fetch 成 blob 多半會被擋
//   → 當「只要顯示」的免金鑰備援;下載改用「原圖」連結另存,複製則不一定可用。

export function thumio() {
  return {
    id: 'thumio',
    name: 'thum.io(僅顯示為主)',

    async capture(url, opts) {
      const endpoint = 'https://image.thum.io/get/'
        + (opts.fullPage ? 'fullpage/' : '')
        + 'noanimate/' + url;
      return {
        imageUrl: endpoint,
        // 嘗試取得 blob;若被 CORS 擋下,main 會自動退回「顯示 + 原圖另存」。
        getBlob: async () => {
          const r = await fetch(endpoint);
          return await r.blob();
        },
      };
    },
  };
}
