// stats.js — 統計資訊:對每個數值欄算 筆數 / 總和 / 平均 / 最小 / 最大,輸出成 Markdown 表格。

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

    const out = [['欄位', '筆數', '總和', '平均', '最小', '最大'], ['---', '---', '---', '---', '---', '---']];
    header.forEach((name, i) => {
      const nums = rows.map((r) => toNumber(r[i])).filter(Number.isFinite);
      if (!nums.length) return; // 非數值欄跳過
      const sum = nums.reduce((a, b) => a + b, 0);
      out.push([name, String(nums.length), String(round(sum)), String(round(sum / nums.length)),
        String(round(Math.min(...nums))), String(round(Math.max(...nums)))]);
    });

    if (out.length === 2) return '(沒有可統計的數值欄)';
    return out.map((r) => '| ' + r.join(' | ') + ' |').join('\n');
  },
});
