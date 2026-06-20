// mermaid.js — 【外部相依】Mermaid 由 CDN 載入,不內嵌在本專案。
//
// 這是整個 pipeflow 唯一的外部相依。集中在這個檔,方便:
//   • 一眼看出這是外部的(其餘程式零相依)。
//   • CDN 掛掉 / 改版 / 要換成別的 library 時,只動這一個檔。
//
// 錯誤分兩種,各自丟出清楚訊息,方便開發者除錯:
//   1) 載入失敗(CDN 不見了 / 網路 / CORS)→「無法載入外部 Mermaid」。
//   2) 繪製失敗(使用者的語法錯)→「Mermaid 無法繪製這段語法」。

const CDN = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

let loadPromise = null;

function load() {
  if (!loadPromise) {
    loadPromise = import(/* @vite-ignore */ CDN)
      .then((m) => {
        const mermaid = m.default || m;
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
        return mermaid;
      })
      .catch((e) => {
        loadPromise = null; // 失敗就重置,下次可重試
        throw new Error('無法載入外部 Mermaid(CDN:' + CDN + ')。可能是網路問題、CDN 失效,或需改用其他 library。原始錯誤:' + (e && e.message ? e.message : e));
      });
  }
  return loadPromise;
}

let seq = 0;

// 把 mermaid 原始碼算成 SVG 字串(失敗會丟出可讀的錯誤)
export async function renderMermaid(source) {
  const mermaid = await load();
  try {
    const { svg } = await mermaid.render('pf-mermaid-' + (++seq), source);
    return svg;
  } catch (e) {
    throw new Error('Mermaid 無法繪製這段語法:' + (e && e.message ? e.message : e));
  }
}
