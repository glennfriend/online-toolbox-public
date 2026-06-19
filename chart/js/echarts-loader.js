// echarts-loader.js — 載入 ECharts:CDN 優先,失敗就用本網站自帶的那份。
//
// 為什麼這樣設計:
//   • 自帶一份(vendor/echarts.min.js)→ 就算 CDN 掛了,工具永遠能用。
//   • CDN 優先 → 有 CDN 時載入快、且可能跨站快取。
// ECharts 是 UMD,載入後掛在 window.echarts;本模組回傳那個全域物件。

const CDN = 'https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js';
const LOCAL = 'vendor/echarts.min.js';

let loadingPromise = null;

export function loadECharts() {
  if (window.echarts) return Promise.resolve(window.echarts);
  if (loadingPromise) return loadingPromise;

  loadingPromise = loadScript(CDN)
    .then(() => window.echarts)
    .catch(() => {
      // CDN 失敗(離線 / 被擋 / 掛掉)→ 退回本地自帶版
      return loadScript(LOCAL).then(() => window.echarts);
    });
  return loadingPromise;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => (window.echarts ? resolve() : reject(new Error('載入後找不到 echarts')));
    s.onerror = () => reject(new Error('載入失敗:' + src));
    document.head.appendChild(s);
  });
}
