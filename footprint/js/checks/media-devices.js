import { registerCheck } from '../registry.js';
import { deadline, row, unsupported } from '../util.js';
registerCheck({ id: 'media-devices', group: '指紋', title: '媒體裝置數量', async run() {
  if (!navigator.mediaDevices?.enumerateDevices) return [unsupported('媒體裝置數量', '瀏覽器未提供 enumerateDevices, 可能需要 HTTPS')];
  const devices = await deadline(navigator.mediaDevices.enumerateDevices(), 4000, 'enumerateDevices');
  return [row('媒體裝置數量', ['audioinput', 'audiooutput', 'videoinput'].map(kind => `${kind}: ${devices.filter(device => device.kind === kind).length}`).join('\n'), '未要求權限, 未讀取名稱或識別碼. 未授權時可能只看到預設裝置或空清單, 數量無法代表完整硬體')];
} });
