// schema.js — SQL Schema(CREATE TABLE)→ Mermaid erDiagram 文字。
// 純文字轉換、離線、不需要任何 DB 引擎。輸出是 mermaid 原始碼,再接「convert to Mermaid」就成 ER 圖。

import { defineMod } from './index.js';

defineMod({
  id: 'sql-to-er',
  label: 'Schema → ER 圖',
  appliesTo: ['sql'],
  run(input) { return sqlToMermaidEr(input); },
});

// 把逗號切開,但不切括號內的(欄位型別的 (10,2) 不能被切)
function splitTopLevel(s) {
  const out = []; let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

function sqlToMermaidEr(sql) {
  const tables = [];
  const rels = [];
  const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?["`]?(\w+)["`]?\s*\(([\s\S]*?)\)\s*;/ig;
  let m;
  while ((m = re.exec(sql))) {
    const name = m[1];
    const cols = [];
    splitTopLevel(m[2]).forEach((part) => {
      const p = part.trim();
      if (!p) return;

      // 表級 FOREIGN KEY (col) REFERENCES other(...)
      const fk = p.match(/foreign\s+key\s*\(\s*["`]?(\w+)["`]?\s*\)\s*references\s+["`]?(\w+)["`]?/i);
      if (fk) { rels.push({ from: name, to: fk[2], col: fk[1] }); return; }

      // 其他表級約束(PRIMARY KEY(...)、CONSTRAINT…、UNIQUE…)略過
      if (/^(primary|unique|constraint|key|check|foreign)\b/i.test(p)) return;

      // 欄位:name type …
      const cm = p.match(/^["`]?(\w+)["`]?\s+(\w+)/);
      if (!cm) return;
      const col = cm[1]; const type = cm[2];
      let key = '';
      if (/\bprimary\s+key\b/i.test(p)) key = 'PK';
      const ref = p.match(/references\s+["`]?(\w+)["`]?/i);
      if (ref) { key = key || 'FK'; rels.push({ from: name, to: ref[1], col }); }
      cols.push({ type, col, key });
    });
    tables.push({ name, cols });
  }

  if (!tables.length) return '(找不到 CREATE TABLE,無法畫 ER 圖)';

  const lines = ['erDiagram'];
  tables.forEach((t) => {
    lines.push('  ' + t.name + ' {');
    t.cols.forEach((c) => lines.push('    ' + c.type + ' ' + c.col + (c.key ? ' ' + c.key : '')));
    lines.push('  }');
  });
  rels.forEach((r) => lines.push('  ' + r.to + ' ||--o{ ' + r.from + ' : "' + r.col + '"'));
  return lines.join('\n');
}
