import { registerCheck } from '../registry.js';
import { row } from '../util.js';
registerCheck({ id: 'preferences', group: '瀏覽器與系統', title: '顯示與操作偏好', run: () => [
  ['深色模式', '(prefers-color-scheme: dark)'], ['減少動畫', '(prefers-reduced-motion: reduce)'], ['提高對比', '(prefers-contrast: more)'], ['強制色彩', '(forced-colors: active)'], ['減少透明', '(prefers-reduced-transparency: reduce)'], ['精準指標', '(pointer: fine)'], ['支援懸停', '(hover: hover)'], ['HDR 動態範圍', '(dynamic-range: high)'],
].map(([label, query]) => row(label, matchMedia(query).matches ? '符合' : '未符合或瀏覽器未支援', query)) });
