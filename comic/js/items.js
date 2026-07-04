// items.js — 配件圖庫(點陣圖,去背透明),依「角色/種類」分資料夾。
//
// 不再分畫風(style)。所有配件在 raw/assets/items/<角色>/<變化>.png:
//   同一個角色(或同一種類)放同一個資料夾,不同角色/種類各自一個資料夾;
//   同種類再多一種就加 _2(例:dog → dog_2)。變化(姿勢/顏色)是資料夾內的檔名。
// 這樣一則故事若有多個人,就用「不同資料夾」的角色去演 → 不會再用同一個角色扮兩個人。
//
// 故事引用配件:"item": "<角色>/<變化>"(如 "penguin/sleepy");只寫 "penguin" 則取該角色第一個變化。
// 每個變化 = { file, w, h, tags }。tags 供挑圖。完整說明見 items.md。

export const ITEM_DIR = 'raw/assets/items/';

export const ITEMS = {
  penguin: {
    label: '企鵝(3D 黏土)',
    variants: {
      hello:    { file: 'hello.png',    w: 233, h: 279, tags: ['企鵝', '揮手', '打招呼', '開心'] },
      gugu:     { file: 'gugu.png',     w: 183, h: 281, tags: ['企鵝', '雙手合十', '害羞', '期待'] },
      gaga:     { file: 'gaga.png',     w: 193, h: 269, tags: ['企鵝', '坐', '張手', '大笑'] },
      cool:     { file: 'cool.png',     w: 244, h: 285, tags: ['企鵝', '眨眼', '得意', '酷'] },
      love:     { file: 'love.png',     w: 243, h: 249, tags: ['企鵝', '抱愛心', '喜歡', '戀愛'] },
      dance:    { file: 'dance.png',    w: 222, h: 263, tags: ['企鵝', '跳舞', '音符', '開心'] },
      sleepy:   { file: 'sleepy.png',   w: 230, h: 254, tags: ['企鵝', '睡覺', '睡帽', '想睡', '做夢'] },
      wow:      { file: 'wow.png',      w: 207, h: 253, tags: ['企鵝', '驚訝', '張嘴', '傻眼'] },
      yummy:    { file: 'yummy.png',    w: 185, h: 267, tags: ['企鵝', '吃餅乾', '好吃', '點心'] },
      grumpy:   { file: 'grumpy.png',   w: 225, h: 269, tags: ['企鵝', '生氣', '抱胸', '不爽'] },
      weee:     { file: 'weee.png',     w: 252, h: 234, tags: ['企鵝', '躺著', '打滾', '耍賴'] },
      thankyou: { file: 'thankyou.png', w: 220, h: 270, tags: ['企鵝', '比愛心', '手勢', '謝謝'] },
    },
  },
  dog: {
    label: '狗(卡通)',
    variants: {
      run:  { file: 'run.png',  w: 264, h: 187, tags: ['狗', '動物', '奔跑', '側面'] },
      trot: { file: 'trot.png', w: 292, h: 169, tags: ['狗', '動物', '小跑', '側面'] },
      jump: { file: 'jump.png', w: 216, h: 272, tags: ['狗', '動物', '跳躍', '開心'] },
      dash: { file: 'dash.png', w: 255, h: 262, tags: ['狗', '動物', '衝刺', '快速'] },
      sit:  { file: 'sit.png',  w: 261, h: 224, tags: ['狗', '動物', '坐', '乖'] },
    },
  },
  bird: {
    label: '鳥/海鷗',
    variants: {
      '1': { file: '1.png', w: 43, h: 21, tags: ['鳥', '海鷗', '天空', '飛'] },
      '2': { file: '2.png', w: 43, h: 25, tags: ['鳥', '海鷗', '天空', '飛'] },
      '3': { file: '3.png', w: 32, h: 17, tags: ['鳥', '海鷗', '天空', '飛', '小'] },
    },
  },
  cloud: {
    label: '雲',
    variants: {
      line:   { file: 'line.png',   w: 130, h: 80, tags: ['雲', '天空', '線稿', '白'] },
      small:  { file: 'small.png',  w: 70,  h: 46, tags: ['雲', '天空', '線稿', '白', '小'] },
      face:   { file: 'face.png',   w: 142, h: 96, tags: ['雲', '天空', '表情', '黃色', '可愛'] },
      yellow: { file: 'yellow.png', w: 129, h: 65, tags: ['雲', '天空', '黃色', '傍晚'] },
    },
  },
  potted_plant: {
    label: '盆栽',
    variants: { main: { file: 'main.png', w: 140, h: 212, tags: ['植物', '盆栽', '綠色', '室內', '表情'] } },
  },
  clock: {
    label: '時鐘',
    variants: { main: { file: 'main.png', w: 118, h: 118, tags: ['時鐘', '鐘', '時間', '室內'] } },
  },
  window: {
    label: '窗戶',
    variants: {
      day:   { file: 'day.png',   w: 193, h: 200, tags: ['窗戶', '白天', '室內', '太陽', '植物'] },
      night: { file: 'night.png', w: 158, h: 185, tags: ['窗戶', '夜晚', '室內', '月亮', '星星'] },
    },
  },
  heart: {
    label: '愛心',
    variants: { main: { file: 'main.png', w: 48, h: 48, tags: ['愛心', '心', '粉紅', '喜歡', '情感'] } },
  },
  girl: {
    label: '女生(卡通丸子頭)',
    variants: {
      '1': { file: '1.png', w: 222, h: 268, tags: ['女生', '女性', '人物', '丸子頭', '開襟衫', '微笑', '上半身'] },
      '2': { file: '2.png', w: 254, h: 302, tags: ['女生', '女性', '人物', '丸子頭', '開襟衫', '微笑', '上半身'] },
    },
  },
  girl_2: {
    label: '女生(卡通黑髮瀏海)',
    variants: { main: { file: 'main.png', w: 113, h: 198, tags: ['女生', '女性', '人物', '黑髮', '長髮', '瀏海', '冷淡'] } },
  },
  old_man: {
    label: '老先生(卡通)',
    variants: { main: { file: 'main.png', w: 205, h: 225, tags: ['男生', '男性', '長者', '老人', '灰髮', '眼鏡', '開襟衫', '微笑', '上半身'] } },
  },
  woman_bw: {
    label: '女生(寫實黑白素描)',
    variants: {
      '1': { file: '1.png', w: 177, h: 276, tags: ['女生', '女性', '人物', '黑髮', '髮夾', '寫實', '黑白', '素描', '正面'] },
      '2': { file: '2.png', w: 221, h: 260, tags: ['女生', '女性', '人物', '黑髮', '髮夾', '寫實', '黑白', '素描', '側面'] },
      '3': { file: '3.png', w: 271, h: 236, tags: ['女生', '女性', '人物', '黑髮', '長捲髮', '寫實', '黑白', '素描', '無奈'] },
    },
  },
  chameleon: {
    label: '變色龍(真實照片)',
    variants: { main: { file: 'main.jpg', w: 800, h: 450, tags: ['變色龍', '動物', '伸手', '差一點', '搆不到', '真實照片', '梗圖'] } },
  },
  cat: {
    label: '貓群(真實照片)',
    variants: { main: { file: 'main.jpg', w: 800, h: 508, tags: ['貓', '動物', '一群', '氣勢', '走過來', '讓開', '真實照片', '梗圖'] } },
  },
  child: {
    label: '小孩拍照(真實照片)',
    variants: { main: { file: 'main.jpg', w: 597, h: 399, tags: ['小孩', '拍照', '相機', '擺拍', '真實照片', '梗圖'] } },
  },
};

// 解析故事的 item 參照:"角色/變化" 或 "角色"(取第一個變化)。回傳 { char, name, def } 或 null。
export function resolveItem(ref) {
  const [char, variant] = String(ref).split('/');
  const ch = ITEMS[char];
  if (!ch) return null;
  const name = variant || Object.keys(ch.variants)[0];
  const def = ch.variants[name];
  return def ? { char, name, def } : null;
}
