// 文字 handler:擁有「文字」這個類型的完整行為——
//   • textarea 即時 render(內部依偵測的子格式 json/markdown/csv/code/html/diff/純文字)
//   • 儲存目前輸入
//   • 開啟已存文字(填回輸入框並 render)
//   • 富文字複製(text/html + text/plain)
//   • chip 分類顏色(純文字=淡灰、特殊格式=淡紅)

import { detectType, TYPES } from '../detect.js';
import { render } from '../renderers/index.js';
import { copyRich } from '../lib/clipboard.js';

const RENDER_DELAY = 120; // 輸入後稍微 debounce 再 render

export function initTextHandler(ctx) {
  const { input, display, badge, saveBtn, setDisplay, setBadge,
    setCopyHandler, registerHandler, addItem, refreshSaved, showToast, notifyDisplayChanged } = ctx;
  let renderTimer;

  registerHandler({
    type: 'text',
    label: (item) => item.title,
    category: (item) => (detectType(item.payload) === 'text' ? 'cat-plain' : 'cat-rich'),
    open: (item) => { input.value = item.payload; renderInput(); },
  });

  input.addEventListener('input', () => {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderInput, RENDER_DELAY);
  });

  saveBtn.addEventListener('click', async () => {
    const text = input.value;
    if (!text.trim()) { showToast('沒有內容可儲存'); return; }
    try {
      await addItem({ type: 'text', title: deriveTitle(text), payload: text });
      await refreshSaved();
      showToast('已儲存');
    } catch {
      showToast('儲存失敗,可能空間已滿');
    }
  });

  // 把目前輸入框的文字偵測 + render 到顯示版
  function renderInput() {
    const text = input.value;
    if (!text.trim()) {
      setDisplay('<p class="hint">在左側貼上內容,這裡會即時顯示結果。</p>');
      setBadge('');
    } else {
      const type = detectType(text);
      setBadge(TYPES[type]);
      setDisplay(render(text, type));
    }
    setCopyHandler(copyText);
    notifyDisplayChanged('text');
  }

  async function copyText() {
    if (!display.textContent.trim()) { showToast('沒有可複製的內容'); return; }
    await copyRich(display.innerHTML, display.textContent);
    showToast('已複製(保留格式)');
  }

  renderInput(); // 初始狀態(空 → 提示)
}

function deriveTitle(content) {
  const firstLine = content.split('\n').map((s) => s.trim()).find(Boolean) || '(空白)';
  return firstLine.length > 40 ? `${firstLine.slice(0, 40)}…` : firstLine;
}
