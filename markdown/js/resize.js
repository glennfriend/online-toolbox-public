// resize.js — 可拖曳分隔線(殼層 UI,非 markdown 模組)。
//   側欄(menu)寬:全域記憶(localStorage 單一值)。
//   編輯/預覽 分割線:每份文件各自記憶(localStorage 一份 { docId: 百分比 })。

const SB_KEY = 'markdown.sidebar-width';
const SPLIT_KEY = 'markdown.splits';
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function loadSplits() {
  try { return JSON.parse(localStorage.getItem(SPLIT_KEY)) || {}; } catch { return {}; }
}

export function setupResizers({ getDocId }) {
  const app = document.querySelector('.app');
  const panes = document.getElementById('panes');
  const appGutter = document.getElementById('app-gutter');
  const panesGutter = document.getElementById('panes-gutter');

  // 還原側欄寬(全域)
  const savedSb = parseFloat(localStorage.getItem(SB_KEY));
  if (savedSb > 0) app.style.setProperty('--sidebar-w', `${savedSb}px`);

  // 側欄寬:游標 x 就是側欄寬(側欄貼左緣)
  drag(appGutter, (ev) => {
    const w = clamp(ev.clientX, 150, 560);
    app.style.setProperty('--sidebar-w', `${w}px`);
    return w;
  }, (w) => localStorage.setItem(SB_KEY, String(Math.round(w))));

  // 左右分割:編輯區佔 panes 的百分比
  drag(panesGutter, (ev) => {
    const r = panes.getBoundingClientRect();
    const pct = clamp(((ev.clientX - r.left) / r.width) * 100, 15, 85);
    panes.style.setProperty('--split', `${pct.toFixed(2)}%`);
    return pct;
  }, (pct) => {
    const id = getDocId();
    if (!id) return;
    const m = loadSplits();
    m[id] = Math.round(pct * 100) / 100;
    localStorage.setItem(SPLIT_KEY, JSON.stringify(m));
  });

  // 開啟文件時套用它自己記住的分割位置(沒有就 50%)
  function applySplit(id) {
    const pct = loadSplits()[id];
    panes.style.setProperty('--split', `${pct > 0 ? pct : 50}%`);
  }
  return { applySplit };
}

// 通用拖曳:pointerdown 起,move 期間呼叫 onMove(回傳最後值),放開呼叫 onEnd(最後值)。
function drag(handle, onMove, onEnd) {
  if (!handle) return;
  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { handle.setPointerCapture(e.pointerId); } catch {}
    handle.classList.add('dragging');
    let last = null;
    const move = (ev) => { last = onMove(ev); };
    const up = () => {
      handle.classList.remove('dragging');
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      if (last != null) onEnd(last);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
  });
}
