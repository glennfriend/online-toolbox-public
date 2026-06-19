// charts/line.js — 折線圖與區域圖(折線 + 填色)。

import { baseOption, valueLabel, categoryAxisLabel } from './base.js';
import { aggregateByCategory } from '../table.js';

function buildLine(table, m, area) {
  const { categories, series } = aggregateByCategory(table, m.xIdx, m.yIdxs, m.agg);
  const opt = baseOption();
  opt.xAxis = { type: 'category', data: categories, boundaryGap: false, axisLabel: categoryAxisLabel(categories.length) };
  // 區域圖填到底,從 0 起才不誤導;折線看趨勢,維持自動縮放
  opt.yAxis = { type: 'value', ...(area ? { min: 0 } : {}) };
  opt.series = series.map((s) => ({
    name: s.name,
    type: 'line',
    data: s.data,
    smooth: false,
    label: valueLabel('top'),
    ...(area ? { areaStyle: { opacity: 0.18 } } : {}),
  }));
  return opt;
}

export const line = { id: 'line', name: '折線圖', build: (t, m) => buildLine(t, m, false) };
export const area = { id: 'area', name: '區域圖', build: (t, m) => buildLine(t, m, true) };
