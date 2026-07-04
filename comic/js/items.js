// items.js — 配件圖庫(點陣圖,去背透明)。
//
// 每個配件 = { file, w, h, tags }。file 放在 raw/items/(週圍透明、主體不透明,
// 所以疊在任何背景上都不會有白框)。tags 供講故事時挑圖。
// 建一次、永久用:新增配件 = 把原圖丟進 raw/items_before/ → 跑 tools/ItemCut 去背裁切
//   → 輸出到 raw/items/ → 在這裡加一筆(id → file + w/h + tags)+ 更新 items.md。
// renderer 以 story 的 items[] 把配件擺到背景上(pos 為格內比例、scale 為佔格高比例)。
// 完整說明見 items.md。

export const ITEM_DIR = 'raw/items/';

export const ITEMS = {
  // 人物
  'girl':         { file: 'girl.png',         w: 222, h: 268, tags: ['女生', '人物', '丸子頭', '開襟衫', '微笑'] },

  // 動物 —— 狗
  'dog-run':      { file: 'dog-run.png',      w: 264, h: 187, tags: ['狗', '動物', '奔跑', '側面'] },
  'dog-trot':     { file: 'dog-trot.png',     w: 292, h: 169, tags: ['狗', '動物', '小跑', '側面'] },
  'dog-jump':     { file: 'dog-jump.png',     w: 216, h: 272, tags: ['狗', '動物', '跳躍', '開心'] },
  'dog-dash':     { file: 'dog-dash.png',     w: 255, h: 262, tags: ['狗', '動物', '衝刺', '快速'] },
  'dog-sit':      { file: 'dog-sit.png',      w: 261, h: 224, tags: ['狗', '動物', '坐', '乖'] },

  // 動物 —— 鳥
  'bird':         { file: 'bird.png',         w: 43,  h: 21,  tags: ['鳥', '海鷗', '天空', '飛'] },
  'bird-b':       { file: 'bird-b.png',       w: 43,  h: 25,  tags: ['鳥', '海鷗', '天空', '飛'] },
  'bird-c':       { file: 'bird-c.png',       w: 32,  h: 17,  tags: ['鳥', '海鷗', '天空', '飛', '小'] },

  // 天空 —— 雲
  'cloud':        { file: 'cloud.png',        w: 130, h: 80,  tags: ['雲', '天空', '線稿', '白'] },
  'cloud-small':  { file: 'cloud-small.png',  w: 70,  h: 46,  tags: ['雲', '天空', '線稿', '小'] },
  'cloud-face':   { file: 'cloud-face.png',   w: 142, h: 96,  tags: ['雲', '天空', '表情', '黃色', '可愛'] },
  'cloud-yellow': { file: 'cloud-yellow.png', w: 129, h: 65,  tags: ['雲', '天空', '黃色', '傍晚'] },

  // 室內陳設
  'plant':        { file: 'plant.png',        w: 140, h: 212, tags: ['植物', '盆栽', '綠色', '室內', '表情'] },
  'clock':        { file: 'clock.png',        w: 118, h: 118, tags: ['時鐘', '鐘', '時間', '室內'] },
  'window-day':   { file: 'window-day.png',   w: 193, h: 200, tags: ['窗戶', '白天', '室內', '太陽', '植物'] },
  'window-night': { file: 'window-night.png', w: 158, h: 185, tags: ['窗戶', '夜晚', '室內', '月亮', '星星'] },

  // 情感符號
  'heart':        { file: 'heart.png',        w: 48,  h: 48,  tags: ['愛心', '心', '粉紅', '喜歡', '情感'] },
};
