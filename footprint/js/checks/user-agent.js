import { registerCheck } from '../registry.js';
import { row } from '../util.js';
registerCheck({ id: 'user-agent', group: '瀏覽器與系統', title: 'User-Agent / platform', run: () => [row('User-Agent', navigator.userAgent, '可能被瀏覽器簡化或偽裝'), row('platform', navigator.platform, '此欄位已棄用, 部分瀏覽器仍提供')] });
