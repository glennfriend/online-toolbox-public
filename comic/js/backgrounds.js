// backgrounds.js — 背景圖資料庫(點陣圖,不建模),放在一起(不分畫風)。
//
// 每個背景 = { file, tags }。檔案在 raw/assets/backgrounds/(不透明、鋪滿整格)。
// 故事用 panel.bg = <id> 指定;配件去背後疊在背景上。
// 新增背景 = 丟圖進 raw/assets/backgrounds/ + 在這裡加一筆 + 更新 backgrounds.md。
// 來源:いらすとや(免費;同一作品用超過 20 張需付費授權)。

export const BG_DIR = 'raw/assets/backgrounds/';

export const BACKGROUNDS = {
  // 室內
  'classroom':     { file: 'bg_school_room.jpg', tags: ['教室', '室內', '學校', '黑板'] },
  'gym':           { file: 'bg_school_taiikukan.jpg', tags: ['體育館', '室內', '學校', '運動'] },
  'room-wood':     { file: 'room_yuka_flooring.png', tags: ['室內', '房間', '木地板', '窗戶'] },
  'room-tatami':   { file: 'room_yuka_tatami.png', tags: ['室內', '房間', '榻榻米', '和室'] },
  'bedroom':       { file: 'bedroom.webp', tags: ['臥室', '房間', '室內', '床', '窗戶', '暖色', '插畫', '白天'] },
  'bedroom-night': { file: 'bedroom-night.webp', tags: ['臥室', '房間', '室內', '床', '窗戶', '夜晚', 'lofi', '粉紫'] },

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
};
