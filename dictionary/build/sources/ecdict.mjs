// ecdict.mjs — 解析 ECDICT 的 ecdict.csv(欄位:word,phonetic,definition,translation,pos,collins,oxford,tag,bnc,frq,exchange,detail,audio)。
// 串流式 CSV 解析(正確處理引號內的逗號/換行/跳脫 ""),只留我們要的:小寫word → { cn(簡體中文釋義), tag(難度標籤) }。
// 不在這裡做簡繁轉換(轉換在 build.mjs 用 OpenCC 做,職責分開、好替換)。

import fs from 'node:fs';

const COL_WORD = 0, COL_TRANSLATION = 3, COL_TAG = 7;

export function loadEcdict(path) {
  const text = fs.readFileSync(path, 'utf8');
  const map = new Map();
  let field = '', row = [], inQuotes = false, header = false;
  const N = text.length;

  const endRow = () => {
    row.push(field); field = '';
    if (!(row.length === 1 && row[0] === '')) {        // 跳過空行
      if (!header) { header = true; }                  // 第一列是表頭
      else {
        const w = row[COL_WORD];
        const cn = (row[COL_TRANSLATION] || '').trim();
        if (w && cn) {
          const lc = w.toLowerCase();
          if (!map.has(lc)) map.set(lc, { cn, tag: (row[COL_TAG] || '').trim() });
        }
      }
    }
    row = [];
  };

  for (let i = 0; i < N; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') endRow();
      else if (c !== '\r') field += c;
    }
  }
  if (field.length || row.length) endRow();
  return map;
}
