import { registerCheck } from '../registry.js';
import { deadline, row, showBoolean, unsupported } from '../util.js';
registerCheck({ id: 'battery', group: '瀏覽器與系統', title: '電池', async run() {
  if (!navigator.getBattery) return [unsupported('電池', '瀏覽器未提供 getBattery')];
  const battery = await deadline(navigator.getBattery(), 4000, 'getBattery');
  return [row('電池', `電量 ${Math.round(battery.level * 100)}%, 充電中: ${showBoolean(battery.charging)}`, '裝置或瀏覽器可能回傳固定值')];
} });
