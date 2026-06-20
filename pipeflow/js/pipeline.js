// pipeline.js — 把「原始輸入 + 選定的 mod 鏈」算成一串 step。不碰 DOM。
//
// step0 = 使用者輸入(會先過上限/取樣);stepN = 對 step(N-1) 套用 chain[N-1] 這個 mod 的輸出。
// 每個 step 自帶 tags(由內容偵測)。改 step0 → 整串重算(純函式,結果穩定)。

import { detectTags } from './tags/index.js';
import { getMod } from './mods/index.js';
import { capForProcessing } from './lib/sample.js';

// source:原始字串;chain:陣列,每項是 { id, param }(param 給參數化 mod,如 SQL 查詢)。
// 非同步:因為有些 mod(SQL 查詢)要等外部 DuckDB。回傳 stages 陣列,每個 step:
//   { input, tags, sampling, error, renderId?, srcMod?, param?, chainIndex? }
//   srcMod / param / chainIndex:此 step 是由 chain[chainIndex] 這個 mod(帶 param)產生的,
//     供 UI 顯示參數編輯器 / 外部徽章,並能把改過的 param 寫回 chain。
export async function computeStages(source, chain) {
  const cap = capForProcessing(source);
  const sampling = cap.sampled ? { usedLines: cap.usedLines, totalLines: cap.totalLines } : null;

  const stages = [];
  let current = cap.text;

  stages.push({ input: current, tags: detectTags(current), sampling, error: null });

  for (let k = 0; k < chain.length; k++) {
    const entry = chain[k];
    const mod = getMod(entry.id);
    if (!mod) break;

    // 渲染類(如 Mermaid):不改資料,只標記「這一步用圖顯示」;資料仍是原本文字。
    if (mod.kind === 'render') {
      stages.push({ input: current, tags: detectTags(current), sampling, error: null, renderId: mod.id, srcMod: mod.id, param: entry.param, chainIndex: k });
      continue;
    }

    let out, error = null;
    try {
      out = mod.async ? await mod.run(current, stages[k].tags, entry.param) : mod.run(current, stages[k].tags, entry.param);
    } catch (e) { out = ''; error = `「${mod.label}」處理失敗:${e.message}`; }
    current = out;
    stages.push({ input: current, tags: error ? [] : detectTags(current), sampling, error, srcMod: mod.id, param: entry.param, chainIndex: k });
    if (error) break; // 出錯就停在這裡,不再往下
  }

  return stages;
}
