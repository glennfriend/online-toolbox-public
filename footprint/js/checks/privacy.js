import { registerCheck } from '../registry.js';
import { row, showBoolean, unsupported } from '../util.js';
registerCheck({ id: 'privacy', group: '瀏覽器與系統', title: '隱私訊號 / Cookie / PDF', run() {
  const dnt = navigator.doNotTrack;
  const gpc = navigator.globalPrivacyControl;
  return [row('Do Not Track', dnt ?? '瀏覽器未提供', '這是偏好訊號, 網站可能忽略', 'caution'), row('Global Privacy Control', showBoolean(gpc), '這是隱私偏好訊號, 本頁無法驗證網站是否遵守', 'caution'), row('Cookie 是否開啟', showBoolean(navigator.cookieEnabled), '一般 Cookie 設定, 無法推論第三方 Cookie 是否允許', 'caution'), navigator.pdfViewerEnabled === undefined ? unsupported('PDF viewer', '瀏覽器未提供 pdfViewerEnabled') : row('PDF viewer', showBoolean(navigator.pdfViewerEnabled))];
} });
