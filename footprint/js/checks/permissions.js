import { registerCheck } from '../registry.js';
import { deadline, row, unsupported } from '../util.js';
registerCheck({ id: 'permissions', group: '指紋', title: '權限狀態', async run() {
  if (!navigator.permissions?.query) return [unsupported('權限狀態', '瀏覽器未提供 Permissions API')];
  return Promise.all(['geolocation', 'camera', 'microphone', 'notifications', 'clipboard-read', 'persistent-storage'].map(async name => {
    try {
      const status = await deadline(navigator.permissions.query({ name }), 3000, `權限 ${name}`);
      const values = { granted: '已允許', prompt: '使用時需詢問', denied: '已拒絕' };
      return row(`權限 ${name}`, values[status.state] || status.state, '只查狀態, 不要求授權', status.state === 'granted' ? 'exposed' : status.state === 'denied' ? 'safe' : 'caution');
    } catch (error) { return unsupported(`權限 ${name}`, `此權限查詢不可用: ${error.message}`); }
  }));
} });
