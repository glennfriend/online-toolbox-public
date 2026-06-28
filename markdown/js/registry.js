// module 登記表 + 隔離(可插拔的關鍵)。
//
// 每個功能 module 自行 registerModule({...}) 登記。一個 module 介面:
//   { name, type:'parse'|'render'|'post', apply, css? }
//     parse  : apply(md)     掛 markdown-it plugin / 加 tokenizer 規則(隔離較粗:套用失敗則此 module 失效)
//     render : apply(md)     覆寫 markdown-it 的 renderer 規則
//     post   : apply(rootEl) 對 render 後的 DOM 再加工(隔離最佳;模組內建議對每個元素各自 try/catch)
//
// 隔離原則:任一 module 出錯只記錄並略過,絕不讓整個程式掛掉。
// 解析期(parse/render)壞掉最多讓「那次套用」失效;後處理(post)壞掉只影響它自己那一塊。

const modules = [];

export function registerModule(m) {
  modules.push(m);
}

// 套用 parse / render 型 module 到一個 markdown-it 實例(各自隔離;apply 可為 async,
// 因為 plugin 多半要從 CDN 延遲載入)。某個 plugin 載入/套用失敗 → 略過它,核心照常。
export async function applyMdModules(md) {
  for (const m of modules) {
    if (m.type !== 'parse' && m.type !== 'render') continue;
    try {
      await m.apply(md);
    } catch (err) {
      console.error(`[markdown] module「${m.name}」套用失敗,已略過(其餘正常):`, err);
    }
  }
}

// 對 render 後的 DOM 跑 post 型 module(各自隔離;可為 async)。
export async function runPostModules(root) {
  for (const m of modules) {
    if (m.type !== 'post') continue;
    try {
      await m.apply(root);
    } catch (err) {
      console.error(`[markdown] module「${m.name}」後處理失敗,已略過(其餘正常):`, err);
    }
  }
}

// 收集所有 module 自帶的 css 字串(若有)。
export function moduleCss() {
  return modules.map((m) => m.css).filter(Boolean).join('\n');
}
