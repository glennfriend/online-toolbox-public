import { registerCheck } from '../registry.js';
import { row } from '../util.js';
registerCheck({ id: 'screen', group: '瀏覽器與系統', title: '螢幕與視窗', run: () => [
  row('螢幕解析度', `${screen.width} × ${screen.height} CSS px`),
  row('螢幕可用區域', `${screen.availWidth} × ${screen.availHeight} CSS px`),
  row('視窗大小', `內部 ${innerWidth} × ${innerHeight}, 外部 ${outerWidth} × ${outerHeight} CSS px`, '本次開頁時的值, 重新整理可更新'),
  row('devicePixelRatio', devicePixelRatio), row('色彩深度', `${screen.colorDepth} bit, pixelDepth ${screen.pixelDepth}`),
] });
