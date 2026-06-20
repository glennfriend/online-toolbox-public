// sort.js — 逐行排序:a-z(字典序)、數字大小。
// CSV/TSV 會保留第一行(表頭)不動,只排資料行。

import { defineMod } from './index.js';
import { toNumber } from '../lib/num.js';

function splitKeepHeader(input, tags) {
  const lines = input.replace(/\r\n?/g, '\n').split('\n');
  const hasHeader = tags.includes('csv') || tags.includes('tsv');
  return hasHeader && lines.length > 1
    ? { head: [lines[0]], body: lines.slice(1) }
    : { head: [], body: lines };
}

// 逐行排序的整塊結構不能拆(json/markdown/html/mermaid);這些只要出現就不提供逐行排序
const STRUCTURED = ['json', 'markdown', 'html', 'mermaid'];

defineMod({
  id: 'sort-az',
  label: 'a-z 排序',
  // 需要多行,且不是整塊結構(逐行排序會破壞 json/markdown/html)
  appliesTo: (tags) => tags.includes('multi-line') && !STRUCTURED.some((t) => tags.includes(t)),
  run(input, tags) {
    const { head, body } = splitKeepHeader(input, tags);
    body.sort((a, b) => a.localeCompare(b, 'zh-Hant'));
    return [...head, ...body].join('\n');
  },
});

defineMod({
  id: 'sort-number',
  label: '數字排序',
  // 每行開頭都是數字,且要多行(單行不需要排序)
  appliesTo: (tags) => tags.includes('multi-line') && tags.includes('num-lines'),
  run(input, tags) {
    const { head, body } = splitKeepHeader(input, tags);
    const num = (l) => { const m = l.match(/-?[\d,]+(\.\d+)?/); return m ? toNumber(m[0]) : NaN; };
    body.sort((a, b) => {
      const na = num(a), nb = num(b);
      if (!Number.isFinite(na)) return 1;      // 沒有數字的行排最後
      if (!Number.isFinite(nb)) return -1;
      return na - nb;
    });
    return [...head, ...body].join('\n');
  },
});
