// stats.js — 統計資訊:對每個數值欄算 筆數 / 總和 / 平均 / 最小 / 最大。
// 輸出成「格式化 JSON」(沒有 preview 時比 Markdown 表格好讀,也能再接 JSON 美化/縮成一行)。

import { defineMod } from './index.js';
import { parseTable } from '../lib/table.js';
import { toNumber, round } from '../lib/num.js';

defineMod({
  id: 'stats',
  label: '統計資訊',
  appliesTo: ['csv', 'tsv', 'markdown', 'number-list'],
  run(input, tags) {
    // 有表頭的(csv/tsv/markdown)逐欄統計;純數字清單當成單一欄「值」
    let header, rows;
    if (tags.includes('csv') || tags.includes('tsv') || tags.includes('markdown')) {
      ({ header, rows } = parseTable(input, tags));
    } else {
      header = ['值'];
      rows = input.trim().split(/\r?\n/).filter((l) => l.trim()).map((l) => [l.trim()]);
    }

    const result = {};
    header.forEach((name, i) => {
      const nums = rows.map((r) => toNumber(r[i])).filter(Number.isFinite);
      if (!nums.length) return; // 非數值欄跳過
      const sum = nums.reduce((a, b) => a + b, 0);
      result[name] = {
        count: nums.length,
        sum: round(sum, 2),
        mean: round(sum / nums.length, 2),
        min: round(Math.min(...nums), 2),
        max: round(Math.max(...nums), 2),
      };
    });

    if (!Object.keys(result).length) return '(沒有可統計的數值欄)';
    return JSON.stringify(result, null, 2);
  },
});
