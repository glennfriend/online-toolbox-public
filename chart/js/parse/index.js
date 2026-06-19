// parse/index.js — 解析派發:依格式(或自動偵測)把原始文字轉成統一表。
//
// 新增一種輸入格式 = 寫一個 parse/xxx.js(回傳 makeTable 的結果),在這裡 import 並加進 PARSERS。

import { detectFormat } from '../detect.js';
import { parseCsv, parseTsv } from './delimited.js';
import { parseJson } from './json.js';
import { parseMarkdown } from './markdown.js';

const PARSERS = {
  json: parseJson,
  csv: parseCsv,
  tsv: parseTsv,
  markdown: parseMarkdown,
};

// format 為 'auto' 時先偵測。回傳 { table, usedFormat }。
export function parse(raw, format) {
  const fmt = (!format || format === 'auto') ? detectFormat(raw) : format;
  const parser = PARSERS[fmt];
  if (!parser) throw new Error('不支援的格式:' + fmt);
  return { table: parser(raw), usedFormat: fmt };
}
