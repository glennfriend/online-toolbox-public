import { registerCheck } from '../registry.js';
import { deadline, row, unsupported } from '../util.js';
registerCheck({
  id: 'client-hints', group: '瀏覽器與系統', title: 'User-Agent Client Hints',
  async run() {
    const data = navigator.userAgentData;
    if (!data) return [unsupported('User-Agent Client Hints', '瀏覽器未提供 navigator.userAgentData')];
    const rows = [row('Client Hints 基本資料', JSON.stringify(data.toJSON(), null, 2))];
    if (!data.getHighEntropyValues) return [...rows, unsupported('Client Hints 詳細資料', '瀏覽器未提供 getHighEntropyValues')];
    try {
      rows.push(row('Client Hints 詳細資料', JSON.stringify(await deadline(data.getHighEntropyValues(['architecture', 'bitness', 'model', 'platformVersion', 'fullVersionList', 'wow64']), 4000, 'Client Hints'), null, 2), '由瀏覽器決定可提供哪些欄位, 呼叫不會向第三方傳送資料'));
    } catch (error) { rows.push(row('Client Hints 詳細資料', error.message, '', 'error')); }
    return rows;
  },
});
