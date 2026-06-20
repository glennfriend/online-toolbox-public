// mods/index.js — pipeline 模組登記表。
//
// 每個 mod:{ id, label, appliesTo:[tag…], run(input, tags) -> output }
//   appliesTo:可以是 [tag…](命中任一就出現)、'*'(永遠出現)、或 function(tags)->bool(自訂條件)
//   run:純函式,輸入字串 → 輸出字串(同輸入同 mod 永遠同輸出 → 可重算、可快取)
//   登記順序 = 按鈕列的優先順序(由前到後 / 由上到下)
//
// 要新增一種轉換 = 寫一個 mods/xxx.js,在裡面 defineMod;再到 main.js import 該檔即可。

export const MODS = [];
export function defineMod(mod) { MODS.push(mod); }

// 目前 step 的 tags → 可用的 mod(依登記順序)。
export function modsFor(tags) {
  return MODS.filter((m) => {
    const a = m.appliesTo;
    if (a === '*') return true;
    if (typeof a === 'function') return a(tags);
    return a.some((t) => tags.includes(t));
  });
}

export function getMod(id) {
  return MODS.find((m) => m.id === id) || null;
}
