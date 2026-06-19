// 截圖服務登記表(可插拔)。
//
// 每個服務一個模組,回傳 { id, name, capture(url, opts) -> { imageUrl, meta?, getBlob? } }:
//   imageUrl : 直接給 <img> 顯示的網址
//   meta     : 可選,{ width, height }
//   getBlob(): 可選,取得可下載/複製的影像 Blob;沒有或失敗 → main 退回「顯示 + 原圖另存」
//
// 新增一個服務 = 寫一個 services/xxx.js,在這裡 import 並加進 SERVICES;核心(main.js)不用動。

import { microlink } from './microlink.js';
import { thumio } from './thumio.js';

export const SERVICES = [microlink(), thumio()];

export function getService(id) {
  return SERVICES.find((s) => s.id === id) || SERVICES[0];
}
