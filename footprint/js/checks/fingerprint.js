import { registerCheck } from '../registry.js';
import { hash, row } from '../util.js';
registerCheck({ id: 'fingerprint', group: '指紋', title: '綜合指紋', afterLocal: true, async run({ results }) {
  const ids = ['user-agent', 'client-hints', 'locale', 'screen', 'hardware', 'preferences', 'canvas', 'webgl', 'audio', 'fonts', 'media-devices', 'voices', 'plugins', 'permissions'];
  const data = ids.map(id => ({ id, rows: (results.get(id) || []).map(({ label, value, level }) => ({ label, value, level })) }));
  const failed = ids.filter(id => !results.has(id) || results.get(id).some(item => item.level === 'error' || item.value === '未提供檢測'));
  return [row('綜合指紋 SHA-256', await hash(data), `依固定順序組合 ${ids.length} 組本機檢測. ${failed.length ? `部分資料缺少或失敗: ${failed.join(', ')}` : '資料已收集'}. 只代表本工具目前觀察值, 視窗大小與權限改變就可能改變. 無法推論全球獨特性`)];
} });
