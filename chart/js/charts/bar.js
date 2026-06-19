// charts/bar.js — 長條圖(直)與橫條圖。依類別彙總後,每個 Y 欄一個系列。

import { baseOption, valueLabel, categoryAxisLabel } from './base.js';
import { aggregateByCategory } from '../table.js';

export const bar = {
  id: 'bar',
  name: '長條圖',
  tips: [
    '比較各類別的數量高低(各產品銷量、各縣市人口)',
    '排行榜 / 名次',
    '少數幾組的對照',
    '單一指標跨類別比較',
  ],
  build(table, m) {
    const { categories, series } = aggregateByCategory(table, m.xIdx, m.yIdxs, m.agg);
    const opt = baseOption();
    opt.xAxis = { type: 'category', data: categories, axisLabel: categoryAxisLabel(categories.length) };
    opt.yAxis = { type: 'value', min: 0 };   // 長條一定從 0 起,長度比例才不會誤導
    opt.series = series.map((s) => ({ name: s.name, type: 'bar', data: s.data, label: valueLabel('top') }));
    return opt;
  },
};

export const barHorizontal = {
  id: 'bar-h',
  name: '橫條圖',
  tips: [
    '類別名稱很長時的比較(長標籤橫放較好讀)',
    '項目較多的排行榜',
    '由大到小的排名呈現',
  ],
  build(table, m) {
    const { categories, series } = aggregateByCategory(table, m.xIdx, m.yIdxs, m.agg);
    const opt = baseOption();
    opt.xAxis = { type: 'value', min: 0 };   // 橫條的數值軸也從 0 起
    opt.yAxis = { type: 'category', data: categories };
    opt.series = series.map((s) => ({ name: s.name, type: 'bar', data: s.data, label: valueLabel('right') }));
    return opt;
  },
};
