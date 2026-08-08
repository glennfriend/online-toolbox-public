// parse.js — 把 data/qa.md 解析成條目陣列(純函式,不碰 DOM)。
//
// 格式(一條 = 一個問答):
//   # 問題(一行)
//   T tag1, tag2        ← 逗號或頓號分隔;可省略
//   A 答案第一行         ← 從這裡開始,直到下一個「# 」之前都是答案(可多行、可空行)
//
// 寬容原則:T/A 順序顛倒、忘了寫 A 直接寫內容,都盡量收進答案,不要讓一條壞資料消失。

export function parseQA(text) {
  const entries = [];
  let cur = null;
  let inAnswer = false;

  for (const line of String(text || '').split(/\r?\n/)) {
    if (line.startsWith('# ')) {
      if (cur) entries.push(finish(cur));
      cur = { q: line.slice(2).trim(), tags: [], a: '' };
      inAnswer = false;
      continue;
    }
    if (!cur) continue;                                   // 檔頭雜訊(第一個 # 之前)忽略

    if (!inAnswer && /^T\s/.test(line)) {
      cur.tags = line.slice(1).split(/[,、]/).map((s) => s.trim()).filter(Boolean);
    } else if (!inAnswer && /^A(\s|$)/.test(line)) {
      inAnswer = true;
      cur.a = line.replace(/^A\s?/, '');
    } else if (inAnswer) {
      cur.a += '\n' + line;                               // 答案的後續行(含空行)
    } else if (line.trim()) {
      inAnswer = true;                                    // 忘了寫 A → 當作答案開始
      cur.a = line;
    }
  }
  if (cur) entries.push(finish(cur));
  return entries;

  function finish(e) { return { ...e, a: e.a.trim() }; }
}

// 搜尋:空白分隔 = 每個詞都要出現(比對問題 + 答案 + tags,不分大小寫)。
export function matches(entry, query) {
  const hay = (entry.q + '\n' + entry.a + '\n' + entry.tags.join(' ')).toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((t) => hay.includes(t));
}
