// charts/radar.js — 雷達圖。把選的多個「Y 欄」當成各個指標(軸),每一列資料畫成一個多邊形,
// 用「X 欄」當該列的名稱。適合比較幾個對象在多個指標上的高低。
//
// 上限(每個軸的刻度頂點)是「共用同一個值」,不是每軸各自取自己的最大值——否則只有一列時
// 每個點都會剛好頂到外緣,永遠畫成規則多邊形、看不出強弱。
//   • m.radarMax 有給(>0)→ 用它當共用上限(不同資料可自訂,例:能力值固定滿分 100)。
//   • 沒給 → 自動取「所有選取數值的最大值」往上取整到漂亮數字(95→100、23→30)。

import { baseOption } from './base.js';
import { toNumber } from '../table.js';

// 往上取整到一位有效數字的漂亮數字(95→100、23→30、7→10、450→500)
function niceCeil(v) {
  if (!(v > 0)) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / mag) * mag;
}

export const radar = {
  id: 'radar',
  name: '雷達圖',
  tips: [
    '多個指標的綜合比較(幾個對象在多面向的強弱)',
    '能力值 / 評分對照(可自訂上限,如滿分 100)',
    '指標數 3 個以上時',
  ],
  build(table, m) {
    // 共用上限:有指定就用,否則取所有選取數值的最大值、往上取整
    const vals = [];
    for (const r of table.rows) for (const yi of m.yIdxs) { const n = toNumber(r[yi]); if (Number.isFinite(n)) vals.push(n); }
    const dataMax = vals.length ? Math.max(...vals) : 1;
    const max = (m.radarMax && m.radarMax > 0) ? m.radarMax : niceCeil(dataMax);

    const indicator = m.yIdxs.map((yi) => ({ name: table.columns[yi].name, max }));

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
