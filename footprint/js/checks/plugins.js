import { registerCheck } from '../registry.js';
import { row } from '../util.js';
registerCheck({ id: 'plugins', group: '指紋', title: 'plugins / mimeTypes', run: () => [row('plugins', Array.from(navigator.plugins || [], plugin => plugin.name).join('\n') || '(空白)', '現代瀏覽器可能固定回報 PDF 相關項目, 無法據此列出擴充功能'), row('mimeTypes', Array.from(navigator.mimeTypes || [], item => item.type).join('\n') || '(空白)')] });
