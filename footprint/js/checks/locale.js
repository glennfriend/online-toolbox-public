import { registerCheck } from '../registry.js';
import { row } from '../util.js';
registerCheck({ id: 'locale', group: '瀏覽器與系統', title: '語言 / 時區 / 地區格式', run() {
  const options = Intl.DateTimeFormat().resolvedOptions();
  return [row('語言', JSON.stringify(navigator.languages)), row('時區', options.timeZone), row('地區格式', `${options.locale}\n數字: ${new Intl.NumberFormat().format(1234567.89)}\n日期: ${new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeZone: 'UTC' }).format(new Date('2026-01-02T12:00:00Z'))}`, '日期以固定測試日期呈現, 可透露格式偏好')];
} });
