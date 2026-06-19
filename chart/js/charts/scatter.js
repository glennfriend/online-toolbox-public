// charts/scatter.js — 散布圖。用「X 欄」與第一個「Y 欄」當兩個數值座標(不彙總,逐列一個點)。
// 適合看兩個數值欄之間的關係;X 欄最好是數值。

import { baseOption } from './base.js';
import { toNumber } from '../table.js';

export const scatter = {
  id: 'scatter',
  name: '散布圖',
  tips: [
    '兩個數值之間的關係 / 相關(面積 vs 人口)',
    '看資料分布、離群值',
    'X、Y 都是數值欄時',
  ],
  build(table, m) {
    const yi = m.yIdxs[0];
    const data = table.rows
      .map((r) => [toNumber(r[m.xIdx]), toNumber(r[yi])])
      .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));

    const opt = baseOption();
    opt.tooltip = { trigger: 'item' };
    opt.xAxis = { type: 'value', name: table.columns[m.xIdx].name, nameLocation: 'middle', nameGap: 26 };
    opt.yAxis = { type: 'value', name: table.columns[yi].name };
    opt.series = [{ type: 'scatter', data, symbolSize: 10 }];
    return opt;
  },
};
