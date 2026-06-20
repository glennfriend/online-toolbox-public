// pipeline.js — 把「原始輸入 + 選定的 mod 鏈」算成一串 step。不碰 DOM。
//
// step0 = 使用者輸入(會先過上限/取樣);stepN = 對 step(N-1) 套用 chain[N-1] 這個 mod 的輸出。
// 每個 step 自帶 tags(由內容偵測)。改 step0 → 整串重算(純函式,結果穩定)。

import { detectTags } from './tags/index.js';
import { getMod } from './mods/index.js';
import { capForProcessing } from './lib/sample.js';

// source:原始字串;chain:modId 陣列。回傳 stages 陣列:
//   { input, tags, sampling, modId, error }
//   sampling:若有取樣 → { usedLines, totalLines };否則 null(整串沿用 step0 的取樣狀態)
//   modId:此 step「往下要套用」的 mod(最後一個 step 為 null)
//   error:此 step 由上一個 mod 產生時若出錯,放錯誤訊息
export function computeStages(source, chain) {
  const cap = capForProcessing(source);
  const sampling = cap.sampled ? { usedLines: cap.usedLines, totalLines: cap.totalLines } : null;

  const stages = [];
  let current = cap.text;
  let error = null;

  stages.push({ input: current, tags: detectTags(current), sampling, modId: chain[0] || null, error: null });

  for (let k = 0; k < chain.length; k++) {
    const mod = getMod(chain[k]);
    if (!mod) break;
    let out;
    try { out = mod.run(current, stages[k].tags); error = null; }
    catch (e) { out = ''; error = `「${mod.label}」處理失敗:${e.message}`; }
    current = out;
    stages.push({ input: current, tags: error ? [] : detectTags(current), sampling, modId: chain[k + 1] || null, error });
    if (error) break; // 出錯就停在這裡,不再往下
  }

  return stages;
}
