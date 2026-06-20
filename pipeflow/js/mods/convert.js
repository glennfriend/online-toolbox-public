// convert.js — 格式轉換:轉成 JSON、轉成 Markdown 表格。

import { defineMod } from './index.js';
import { parseTable, toObjects } from '../lib/table.js';

defineMod({
  id: 'to-json',
  label: '轉成 JSON',
  appliesTo: ['csv', 'tsv', 'markdown'],
  run(input, tags) {
    const objs = toObjects(parseTable(input, tags));
    return JSON.stringify(objs, null, 2);
  },
});

defineMod({
  id: 'to-markdown',
  label: '轉成 Markdown 表格',
  appliesTo: ['csv', 'tsv', 'json'],
  run(input, tags) {
    let header, rows;
    if (tags.includes('json')) {
      const data = JSON.parse(input);
      const arr = Array.isArray(data) ? data : [data];
      header = []; arr.forEach((o) => Object.keys(o || {}).forEach((k) => { if (!header.includes(k)) header.push(k); }));
      rows = arr.map((o) => header.map((k) => (o && k in o ? o[k] : '')));
    } else {
      ({ header, rows } = parseTable(input, tags));
    }
    const line = (cells) => '| ' + cells.join(' | ') + ' |';
    return [line(header), line(header.map(() => '---')), ...rows.map((r) => line(r))].join('\n');
  },
});
