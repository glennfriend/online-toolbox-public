// 模組只負責登記與執行. 控制器不含任何檢測邏輯
const checks = [];
export function registerCheck(check) {
  if (!check.id || !check.group || !check.title || typeof check.run !== 'function') {
    throw new Error('檢測登記缺少必要欄位');
  }
  if (checks.some(item => item.id === check.id)) throw new Error(`重複檢測: ${check.id}`);
  checks.push({ status: 'available', needsNetwork: false, services: [], ...check });
}
export function getChecks() { return [...checks]; }
export function unavailable(id, group, title, note) {
  registerCheck({ id, group, title, status: 'unavailable', reason: note, run: () => [{ label: title, value: '未提供檢測', note, level: 'caution' }] });
}
