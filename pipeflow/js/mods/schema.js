// schema.js — SQL Schema(CREATE TABLE)→ Mermaid erDiagram 文字。
// 純文字轉換、離線、不需要任何 DB 引擎。輸出是 mermaid 原始碼,再接「convert to Mermaid」就成 ER 圖。
//
// 設計成「容忍真實世界的 dump」:phpMyAdmin / mysqldump 匯出的內容常夾雜
//   • 註解:-- 行尾、# 行尾、/* ... */(含 /*!40101 ... */ 條件式註解)
//   • 資料與其他語句:INSERT / SET / LOCK / DROP …(只看 CREATE TABLE,其餘自然略過)
//   • 表選項收尾:) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=10;(') 之後不是馬上 ;)
// 作法是「先去註解 → 用括號配對切出欄位區塊」,而不是脆弱的 )\s*; 收尾,易擴充、不寫死。

import { defineMod } from './index.js';

defineMod({
  id: 'sql-to-er',
  label: 'Schema → ER 圖',
  appliesTo: ['sql'],
  run(input) { return sqlToMermaidEr(input); },
});

// 去掉 SQL 註解(讓後面的解析不被雜訊干擾)
function stripComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ') // /* ... */(含 phpMyAdmin 的 /*! ... */)
    .replace(/--[^\n]*/g, ' ')         // -- 到行尾
    .replace(/#[^\n]*/g, ' ');         // #  到行尾(MySQL)
}

// 從 SQL 找出每個 CREATE TABLE 的「表名 + 欄位區塊原文」。
// 用括號配對找區塊,所以 ) 之後的 ENGINE=…、AUTO_INCREMENT=…、; 都會被正確跳過。
function findTables(sql) {
  const tables = [];
  const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?["`]?(\w+)["`]?\s*\(/ig;
  let m;
  while ((m = re.exec(sql))) {
    const name = m[1];
    const open = re.lastIndex - 1; // 指向欄位區塊的第一個 '('
    let depth = 0, i = open, body = null;
    for (; i < sql.length; i++) {
      const ch = sql[i];
      if (ch === '(') depth++;
      else if (ch === ')') { depth--; if (depth === 0) { body = sql.slice(open + 1, i); break; } }
    }
    if (body == null) continue;   // 括號不完整 → 跳過這個表
    tables.push({ name, body });
    re.lastIndex = i + 1;          // 從這個表的 ) 之後繼續找(略過表選項與 ;)
  }
  return tables;
}

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

const unquote = (s) => s.trim().replace(/^["`]|["`]$/g, '');

function sqlToMermaidEr(rawSql) {
  const sql = stripComments(rawSql);
  const allTables = [];
  const rels = [];

  findTables(sql).forEach(({ name, body }) => {
    const cols = [];
    const pkCols = new Set();

    splitTopLevel(body).forEach((part) => {
      const p = part.trim();
      if (!p) return;

      // 表級 PRIMARY KEY (col, …) → 記下來,最後幫對應欄位標 PK
      const pk = p.match(/^primary\s+key\s*\(([^)]*)\)/i);
      if (pk) { splitTopLevel(pk[1]).forEach((c) => pkCols.add(unquote(c))); return; }

      // 表級 / CONSTRAINT … FOREIGN KEY (col) REFERENCES other(…)
      const fk = p.match(/foreign\s+key\s*\(\s*["`]?(\w+)["`]?\s*\)\s*references\s+["`]?(\w+)["`]?/i);
      if (fk) { rels.push({ from: name, to: fk[2], col: fk[1] }); return; }

      // 其他表級約束 / 索引(UNIQUE、KEY、INDEX、CONSTRAINT、CHECK…)→ 略過
      if (/^(primary|unique|constraint|key|check|foreign|index|fulltext|spatial)\b/i.test(p)) return;

      // 一般欄位:`name` type …(型別只取單字,丟掉 (size),mermaid erDiagram 不能有括號)
      const cm = p.match(/^["`]?(\w+)["`]?\s+([A-Za-z]\w*)/);
      if (!cm) return;
      const col = cm[1]; const type = cm[2];
      let key = '';
      if (/\bprimary\s+key\b/i.test(p)) key = 'PK';
      const ref = p.match(/references\s+["`]?(\w+)["`]?/i); // 欄位級 col … REFERENCES other(id)
      if (ref) { key = key || 'FK'; rels.push({ from: name, to: ref[1], col }); }
      cols.push({ type, col, key });
    });

    // 套用表級 PRIMARY KEY(欄位本身沒標到時)
    cols.forEach((c) => { if (!c.key && pkCols.has(c.col)) c.key = 'PK'; });

    allTables.push({ name, cols });
  });

  if (!allTables.length) return '(找不到 CREATE TABLE,無法畫 ER 圖)';

  const lines = ['erDiagram'];
  allTables.forEach((t) => {
    lines.push('  ' + t.name + ' {');
    t.cols.forEach((c) => lines.push('    ' + c.type + ' ' + c.col + (c.key ? ' ' + c.key : '')));
    lines.push('  }');
  });
  rels.forEach((r) => lines.push('  ' + r.to + ' ||--o{ ' + r.from + ' : "' + r.col + '"'));
  return lines.join('\n');
}
