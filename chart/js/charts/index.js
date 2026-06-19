// charts/index.js — 圖種登記表(可插拔)。
//
// 每個圖種模組:{ id, name, build(table, mapping) -> ECharts option }
//   mapping = { xIdx, yIdxs:[...], agg:'sum'|'avg'|'count' }
//
// 新增一種圖 = 寫一個 charts/xxx.js,在這裡 import 並加進 CHARTS;殼層(main.js)不用動。

import { bar, barHorizontal } from './bar.js';
import { line, area } from './line.js';
import { pie, doughnut } from './pie.js';
import { scatter } from './scatter.js';
import { radar } from './radar.js';

export const CHARTS = [bar, barHorizontal, line, area, pie, doughnut, scatter, radar];

export function getChart(id) {
  return CHARTS.find((c) => c.id === id) || CHARTS[0];
}
