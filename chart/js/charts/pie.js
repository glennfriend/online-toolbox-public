// charts/pie.js — 圓餅圖與環圈圖。用「類別欄」當扇區、第一個「數值欄」當大小。

import { baseOption } from './base.js';
import { aggregateByCategory } from '../table.js';

function buildPie(table, m, radius) {
  const yi = m.yIdxs[0];
  const { categories, series } = aggregateByCategory(table, m.xIdx, [yi], m.agg);
  const data = categories.map((name, i) => ({ name, value: series[0].data[i] }));

  const opt = baseOption();
  delete opt.grid; delete opt.tooltip; // 圓餅不需要直角座標 / 軸觸發
  opt.tooltip = { trigger: 'item' };
  opt.series = [{
    type: 'pie',
    radius,
    data,
    label: { show: true, formatter: '{b}:{c}（{d}%）' }, // 名稱:值（百分比)
    labelLine: { show: true },
  }];
  return opt;
}

export const pie = {
  id: 'pie', name: '圓餅圖',
  tips: [
    '占比 / 組成(各部分占整體的百分比)',
    '類別不多(建議 ≤6)時的比例',
    '市佔率、預算分配',
  ],
  build: (t, m) => buildPie(t, m, '62%'),
};
export const doughnut = {
  id: 'doughnut', name: '環圈圖',
  tips: [
    '同圓餅:看占比 / 組成',
    '中間留白可放總計或標題',
    '類別不多時的比例',
  ],
  build: (t, m) => buildPie(t, m, ['40%', '64%']),
};
