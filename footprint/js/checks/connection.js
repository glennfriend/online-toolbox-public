import { registerCheck } from '../registry.js';
import { row, unsupported } from '../util.js';
registerCheck({ id: 'connection', group: '瀏覽器與系統', title: '網路類型', run() {
  const connection = navigator.connection;
  return connection ? [row('網路類型', JSON.stringify({ type: connection.type, effectiveType: connection.effectiveType, downlink: connection.downlink, rtt: connection.rtt, saveData: connection.saveData }, null, 2), '瀏覽器的網路估計值, 沒有發出測速請求')] : [unsupported('網路類型', '瀏覽器未提供 navigator.connection')];
} });
