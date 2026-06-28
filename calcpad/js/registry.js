// evaluator 登記表(可插拔的關鍵)。
//
// main.js 不寫死任何計算功能;每個 evaluators/*.js 自行 registerEvaluator(...) 把自己登記進來。
// 一個 evaluator 介面:
//   { name, match(line) → boolean, evaluate(line) → string }
//   match    : 這個模組宣稱能處理這一行嗎?(line 已去除前後空白)
//   evaluate : 算出答案文字;不能算就 throw,錯誤訊息會顯示在右側。

const evaluators = [];

export function registerEvaluator(evaluator) {
  evaluators.push(evaluator);
}

// 對單一行做派發,回傳一個描述「該怎麼顯示」的結果物件。
// kind:
//   'empty'    空行 → 不顯示答案
//   'comment'  # 開頭 → 註解 / 標題行,不計算、不報錯(text 為去掉 # 後的文字)
//   'none'     沒有模組認領 → 不顯示答案
//   'conflict' 多個模組同時認領 → 顯示「不能混用」
//   'ok'       剛好一個模組 → value 為答案文字
//   'error'    evaluate 丟錯 → message 為錯誤訊息
export function evaluateLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return { kind: 'empty' };
  // 註解 / 標題行:# 開頭一律不計算(可放標題、分隔線、或刻意讓某行不算)。
  if (trimmed.startsWith('#')) return { kind: 'comment', text: trimmed.replace(/^#+\s*/, '') };

  const matched = evaluators.filter((e) => e.match(trimmed));
  if (matched.length === 0) return { kind: 'none' };
  if (matched.length > 1) {
    return { kind: 'conflict', names: matched.map((e) => e.name) };
  }

  try {
    return { kind: 'ok', value: matched[0].evaluate(trimmed) };
  } catch (err) {
    return { kind: 'error', message: err.message || '無法計算' };
  }
}
