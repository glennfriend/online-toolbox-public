// backgrounds.js — 背景圖資料庫(點陣圖,不建模)。
//
// 每個背景 = { file, tags }。file 放在 raw/backgrounds/;tags 供講故事時挑圖。
// 建一次、永久用:新增背景 = 丟圖進 raw/backgrounds/ + 在這裡加一筆(id → file + tags)。
// renderer 以 panel.bg = <id> 鋪成該格底圖(角色/道具透明疊在上面)。

export const BG_DIR = 'raw/backgrounds/';

export const BACKGROUNDS = {
  'sky-field': { file: 'sky-field.jpg', tags: ['天空', '戶外', '白天', '草地', '太陽'] },
};
