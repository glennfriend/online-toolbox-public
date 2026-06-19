// mShots(WordPress.com / Automattic)截圖服務。
// 免金鑰、有 CORS(可下載 / 複製)。限制:只截「可見區縮圖」、非整頁;且首次對新網址
// 可能先回「產生中」的暫時圖,稍後再開才是真圖。當作最後備援。

export function mshots() {
  return {
    id: 'mshots',
    name: 'mShots(縮圖,可下載)',
    shortName: 'mShots',

    async capture(url) {
      // mShots 不支援整頁,w 只設寬度,回的是可見區縮圖
      const endpoint = 'https://s0.wp.com/mshots/v1/' + encodeURIComponent(url) + '?w=1280';
      return {
        imageUrl: endpoint,
        getBlob: async () => {
          const r = await fetch(endpoint);
          return await r.blob();
        },
      };
    },
  };
}
