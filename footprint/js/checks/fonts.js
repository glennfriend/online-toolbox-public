import { registerCheck } from '../registry.js';
import { row } from '../util.js';
export const fontCandidates = ['Arial', 'Arial Black', 'Calibri', 'Cambria', 'Comic Sans MS', 'Consolas', 'Courier New', 'Georgia', 'Helvetica', 'Impact', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'Microsoft JhengHei', 'Microsoft YaHei', 'MingLiU', 'PingFang TC', 'Heiti TC', 'Noto Sans CJK TC', 'Noto Serif CJK TC', 'Ubuntu', 'Liberation Sans', 'DejaVu Sans'];
registerCheck({ id: 'fonts', group: '指紋', title: '常見字型偵測', run() {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) throw new Error('瀏覽器未提供字型量測用的 Canvas 2D');
  const bases = ['monospace', 'sans-serif', 'serif'];
  const text = 'mmmmWWWWiiIl0123456789 瀏覽資訊';
  const measure = font => { context.font = `72px ${font}`; return context.measureText(text).width; };
  const widths = bases.map(base => measure(base));
  const detected = fontCandidates.filter(font => bases.some((base, index) => measure(`"${font}", ${base}`) !== widths[index]));
  return [row('推測可用字型', detected.length ? detected.join(', ') : '未量測出清單內的字型', `測試 ${fontCandidates.length} 種常見字型, 以三種後備字型比較寬度. 系統替代字型可能造成誤判, 無法取得完整安裝清單`, 'caution')];
} });
