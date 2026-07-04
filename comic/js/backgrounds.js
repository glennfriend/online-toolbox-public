// backgrounds.js — 背景圖資料庫(點陣圖,不建模)。
//
// 每個背景 = { file, tags }。file 放在 raw/backgrounds/;tags 供講故事時挑圖。
// 建一次、永久用:新增背景 = 丟圖進 raw/backgrounds/ + 在這裡加一筆(id → file + tags)。
// renderer 以 panel.bg = <id> 鋪成該格底圖(角色/道具透明疊在上面)。
// 來源:いらすとや(irasutoya,免費;同一作品用超過 20 張需付費授權)。

export const BG_DIR = 'raw/backgrounds/';

export const BACKGROUNDS = {
  // 室內
  'classroom':     { file: 'bg_school_room.jpg', tags: ['教室', '室內', '學校', '黑板'] },
  'gym':           { file: 'bg_school_taiikukan.jpg', tags: ['體育館', '室內', '學校', '運動'] },
  'room-wood':     { file: 'room_yuka_flooring.png', tags: ['室內', '房間', '木地板', '窗戶'] },
  'room-tatami':   { file: 'room_yuka_tatami.png', tags: ['室內', '房間', '榻榻米', '和室'] },

  // 城市 / 道路
  'city-night':    { file: 'city_night_yoruno_machi.png', tags: ['城市', '街道', '夜晚', '大樓'] },
  'highway':       { file: 'highway.png', tags: ['高速公路', '道路', '車', '交通', '城市'] },
  'road':          { file: 'road.png', tags: ['道路', '馬路', '戶外', '樹', '白天'] },
  'schoolyard':    { file: 'bg_school_koutei.jpg', tags: ['學校', '操場', '建物', '戶外', '白天'] },

  // 自然 / 戶外
  'mountain':      { file: 'mountain_yama.png', tags: ['山', '山上', '戶外', '天空', '草地', '白天'] },
  'mountain-field':{ file: 'mountain_field.jpg', tags: ['山', '田', '鄉村', '戶外', '綠色'] },
  'sea':           { file: 'sea_ocean.png', tags: ['海', '海邊', '水中', '自然', '藍色'] },
  'river':         { file: 'bg_natural_river.jpg', tags: ['河流', '水中', '自然', '藍色'] },
  'cliff':         { file: 'cliff.png', tags: ['懸崖', '岩石', '戶外', '自然'] },
  'bamboo':        { file: 'bg_takeyabu_layer2.jpg', tags: ['竹林', '自然', '戶外', '綠色'] },
  'lavender':      { file: 'lavender_field.jpg', tags: ['花田', '薰衣草', '戶外', '紫色', '天空'] },
  'winter-waterfall': { file: 'winter_waterfall.png', tags: ['冬天', '瀑布', '冰', '自然'] },

  // 天空
  'sky-blue':      { file: 'sky_blue.jpg', tags: ['天空', '藍天', '雲', '白天', '戶外'] },
  'horizon-field': { file: 'bg_chiheisen_green.jpg', tags: ['地平線', '草地', '天空', '戶外', '白天', '空曠'] },
  'night-moon':    { file: 'bg_moon_sky_mikaduki.jpg', tags: ['夜晚', '天空', '月亮', '星空', '戶外'] },

  // 特效
  'effect-lines':  { file: 'effectlines_color.jpg', tags: ['效果線', '爆炸', '速度', '動作', '強調'] },
};
