// backgrounds.js — 背景圖資料庫(點陣圖,不建模),依「畫風(style)」分層。
//
// 每個背景 = { file, tags }。檔案路徑 = STYLE_DIR + <style> + '/backgrounds/' + file(不透明、鋪滿整格)。
// 跟配件一樣分畫風:一則故事挑一個 style,背景與配件都在該 style 底下解析 → 畫風不混
//   (卡通故事用卡通背景、寫實故事用寫實背景)。tags 供講故事時挑圖。
// 新增背景 = 丟圖進 raw/style/<style>/backgrounds/ + 在對應 style 加一筆(id → file + tags)。
// 來源:いらすとや(irasutoya,免費;同一作品用超過 20 張需付費授權)。

import { STYLE_DIR, DEFAULT_STYLE } from './items.js';

export const BG_SUBDIR = 'backgrounds/';
export const bgPath = (style, file) => `${STYLE_DIR}${style}/${BG_SUBDIR}${file}`;

export const BACKGROUNDS_BY_STYLE = {
  default: {
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
  },

  sketch: {
    'bedroom':       { file: 'bedroom.webp', tags: ['臥室', '房間', '室內', '床', '窗戶', '暖色', '插畫', '白天'] },
    'bedroom-night': { file: 'bedroom-night.webp', tags: ['臥室', '房間', '室內', '床', '窗戶', '夜晚', '傍晚', 'lofi', '粉紫'] },
  },

  // 3D 黏土企鵝:尚無背景(先用 plain 或之後備黏土風底圖)。
  '3d': {},

  // 真實照片(梗圖):照片本身當整格配件貼,通常不另用背景。
  real: {},
};

// 取某 style 的背景表(未知 style → 預設)。
export function bgOf(style) {
  return BACKGROUNDS_BY_STYLE[style] || BACKGROUNDS_BY_STYLE[DEFAULT_STYLE];
}
