// 鍵盤快速鍵提示(KeyTips)—— 殼層 UI 功能,非 markdown 模組。
//
// 按住 Alt → 在對應控制下方浮出小提示(顯示要按的鍵);仍按住 Alt 按該鍵 → 執行;放開 Alt → 收起。
// 動作一律「點對應的按鈕」,邏輯留在 main.js,這裡不重複。
// 在編輯器打字中也能用(Alt 不會打出字;Alt+鍵會 preventDefault,不會打進文章)。

const byId = (id) => document.getElementById(id);
const themeBtn = (i) => document.querySelectorAll('#theme .seg-btn')[i] || null;

// 每個目標:key(要按的鍵)+ get()(回傳該按鈕元素;支援動態產生的主題按鈕)
const TARGETS = [
  { key: 'n', get: () => byId('new-doc') },         // ＋ 新增
  { key: 'f', get: () => byId('sidebar-toggle') },  // 文件列表 開/關
  { key: '1', get: () => byId('mode-split') },       // 左右
  { key: '2', get: () => byId('mode-edit') },        // 編輯
  { key: '3', get: () => byId('mode-view') },        // 預覽
  { key: '4', get: () => themeBtn(0) },              // 主題 1(default)
  { key: '5', get: () => themeBtn(1) },              // 主題 2(github)
  { key: '6', get: () => themeBtn(2) },              // 主題 3(pandoc)
];

let layer = null;

function showHints() {
  if (layer) return;
  layer = document.createElement('div');
  layer.className = 'keyhint-layer';
  for (const t of TARGETS) {
    const el = t.get();
    const r = el?.getBoundingClientRect();
    if (!r || !r.width) continue;
    const tip = document.createElement('span');
    tip.className = 'keyhint';
    tip.textContent = t.key.toUpperCase();
    tip.style.left = `${r.left + r.width / 2}px`;
    tip.style.top = `${r.bottom + 3}px`;
    layer.appendChild(tip);
  }
  document.body.appendChild(layer);
}

function hideHints() { layer?.remove(); layer = null; }

window.addEventListener('keydown', (e) => {
  if (e.key === 'Alt' && !e.repeat) { showHints(); return; }
  if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.length === 1) {
    const t = TARGETS.find((x) => x.key === e.key.toLowerCase());
    if (t) {
      e.preventDefault();
      t.get()?.click();
      // 提示維持顯示(仍按住 Alt 可連續操作),放開 Alt 才收起
    }
  }
});
window.addEventListener('keyup', (e) => { if (e.key === 'Alt') hideHints(); });
window.addEventListener('blur', hideHints);
