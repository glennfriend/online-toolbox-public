// charts/base.js — 各圖種共用的 ECharts option 基底與小工具。
//
// 設計目標:靜態、把資訊攤在畫面上 → 關動畫、值直接標在圖上、圖例常駐。
// 每個圖種模組拿 baseOption() 起手,再補上自己的 xAxis/yAxis/series。

export const PALETTE = ['#2563eb', '#16a34a', '#ea580c', '#9333ea', '#dc2626', '#0891b2', '#ca8a04', '#db2777'];

export function baseOption() {
  return {
    backgroundColor: '#fff',
    color: PALETTE,
    animation: false,                 // 靜態:不要動畫
    legend: { top: 4 },
    grid: { left: 16, right: 24, top: 40, bottom: 16, containLabel: true },
    tooltip: { trigger: 'axis' },      // 滑過可看;但不靠它——值已標在圖上
  };
}

// 把數值直接標在資料點上(長條頂端 / 折線旁)
export function valueLabel(position) {
  return { show: true, position: position || 'top', fontSize: 11, color: '#374151' };
}

// 類別太多時把 x 軸標籤轉斜,避免重疊
export function categoryAxisLabel(count) {
  return { interval: 0, rotate: count > 8 ? 35 : 0, hideOverlap: false };
}
