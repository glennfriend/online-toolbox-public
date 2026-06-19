// 截圖服務登記表(可插拔)。陣列順序 = 預設的失效切換順序(由上到下嘗試)。
//
// 每個服務:{ id, name, shortName, capture(url, opts) -> { imageUrl, meta?, getBlob? } }
//   imageUrl : 直接給 <img> 顯示的網址
//   getBlob(): 可選,取得可下載/複製的影像 Blob(有 CORS 才行);沒有或失敗 → 退回「顯示 + 原圖另存」
//
// 新增一個服務 = 寫一個 services/xxx.js,在這裡 import 並加進 SERVICES;核心(main.js)不用改。
// 只收信譽明確的服務(microlink、thum.io、Automattic 的 mShots),避免來歷不明的風險。

import { microlink } from './microlink.js';
import { thumio } from './thumio.js';
import { mshots } from './mshots.js';

export const SERVICES = [microlink(), thumio(), mshots()];

export function getServiceById(id) {
  return SERVICES.find((s) => s.id === id) || null;
}
