import { registerCheck } from '../registry.js';
import { row, unsupported } from '../util.js';
registerCheck({
  id: 'geolocation', group: '需要你同意才會外洩的', title: '精確位置 (Geolocation)', action: '讀取精確位置',
  async run() {
    if (!navigator.geolocation) return [unsupported('精確位置', '瀏覽器未提供 Geolocation, 可能需要 HTTPS')];
    // 只有使用者按下此列按鈕才會執行. 系統定位服務可能需要網路
    try {
      const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }));
      return [row('精確位置', `緯度 ${position.coords.latitude}\n經度 ${position.coords.longitude}\n估計精確度 ${position.coords.accuracy} m`, '你已主動要求定位. 瀏覽器或作業系統可能連線至定位服務. 座標只在此頁顯示, 本工具不會上傳')];
    } catch (error) {
      const reasons = { 1: '定位權限被拒絕或政策限制', 2: '目前無法取得位置', 3: '定位逾時 (10 秒)' };
      return [row('精確位置', reasons[error.code] || error.message, '未取得座標', error.code === 1 ? 'safe' : 'error')];
    }
  },
});
