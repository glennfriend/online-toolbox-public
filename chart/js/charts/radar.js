// charts/radar.js — 雷達圖。把選的多個「Y 欄」當成各個指標(軸),每一列資料畫成一個多邊形,
// 用「X 欄」當該列的名稱。適合比較幾個對象在多個指標上的高低。

import { baseOption } from './base.js';
import { toNumber } from '../table.js';

export const radar = {
  id: 'radar',
  name: '雷達圖',
  build(table, m) {
    // 每個指標(Y 欄)的最大值 → 決定該軸刻度
    const indicator = m.yIdxs.map((yi) => {
      let max = 0;
      for (const r of table.rows) { const n = toNumber(r[yi]); if (Number.isFinite(n) && n > max) max = n; }
      return { name: table.columns[yi].name, max: max || 1 };
    });

    const data = table.rows.map((r) => ({
      name: String(r[m.xIdx] ?? ''),
      value: m.yIdxs.map((yi) => { const n = toNumber(r[yi]); return Number.isFinite(n) ? n : 0; }),
    }));

    const opt = baseOption();
    delete opt.grid; delete opt.tooltip;
    opt.tooltip = { trigger: 'item' };
    opt.radar = { indicator, radius: '62%' };
    opt.series = [{ type: 'radar', data, label: { show: true, fontSize: 10 } }];
    return opt;
  },
};
