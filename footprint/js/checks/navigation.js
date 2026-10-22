import { registerCheck } from '../registry.js';
import { row } from '../util.js';
registerCheck({ id: 'navigation', group: '瀏覽器與系統', title: '來源頁與瀏覽紀錄數量', run: () => [row('document.referrer', document.referrer || '(空白)', '由上一頁的 Referrer-Policy 決定. 空白可能是直接開頁或政策遮蔽', document.referrer ? 'exposed' : 'safe'), row('history.length', history.length, '只提供目前分頁的歷程項目數, 無法列出造訪網址')] });
