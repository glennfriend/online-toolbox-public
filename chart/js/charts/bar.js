// charts/bar.js — 長條圖(直)與橫條圖。依類別彙總後,每個 Y 欄一個系列。

import { baseOption, valueLabel, categoryAxisLabel } from './base.js';
import { aggregateByCategory } from '../table.js';

export const bar = {
  id: 'bar',
  name: '長條圖',
  build(table, m) {
    const { categories, series } = aggregateByCategory(table, m.xIdx, m.yIdxs, m.agg);
    const opt = baseOption();
    opt.xAxis = { type: 'category', data: categories, axisLabel: categoryAxisLabel(categories.length) };
    opt.yAxis = { type: 'value' };
    opt.series = series.map((s) => ({ name: s.name, type: 'bar', data: s.data, label: valueLabel('top') }));
    return opt;
  },
};

export const barHorizontal = {
  id: 'bar-h',
  name: '橫條圖',
  build(table, m) {
    const { categories, series } = aggregateByCategory(table, m.xIdx, m.yIdxs, m.agg);
    const opt = baseOption();
    opt.xAxis = { type: 'value' };
    opt.yAxis = { type: 'category', data: categories };
    opt.series = series.map((s) => ({ name: s.name, type: 'bar', data: s.data, label: valueLabel('right') }));
    return opt;
  },
};
