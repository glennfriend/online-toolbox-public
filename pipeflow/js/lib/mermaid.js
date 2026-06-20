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

// 把 mermaid 原始碼算成 SVG 字串(失敗會丟出可讀的錯誤)。
// 重點:render 到一個我們自建的離畫面容器,finally 一定移除它——否則 mermaid 解析失敗時
// 會把它自己的「錯誤圖(炸彈)」留在 <body>,賴著不走。
export async function renderMermaid(source) {
  const mermaid = await load();
  const id = 'pf-mermaid-' + (++seq);
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute; left:-99999px; top:0;';
  document.body.appendChild(host);
  try {
    const { svg } = await mermaid.render(id, source, host);
    return svg;
  } catch (e) {
    throw new Error('Mermaid 無法繪製這段語法:' + (e && e.message ? e.message : e));
  } finally {
    host.remove();
    document.getElementById(id)?.remove();       // 保險:清掉 mermaid 可能另外留下的暫時節點
    document.getElementById('d' + id)?.remove();
  }
}
