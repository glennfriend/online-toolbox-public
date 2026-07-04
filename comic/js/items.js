// items.js — 配件圖庫(點陣圖,去背透明)。
//
// 每個配件 = { file, w, h, tags }。file 放在 raw/items/(週圍透明、主體不透明,
// 所以疊在任何背景上都不會有白框)。tags 供講故事時挑圖(細節如姿勢/顏色放這裡)。
//
// 命名用 WordNet 分類(ImageNet 用的那套詞彙階層):id = 該物的 WordNet 詞位(小寫底線),
//   同類多張用 _2 _3 …(例:adult_female、dog、dog_2)。物種/類別穩定,新圖照階層命名即可,
//   不會撞名也不必回頭 rename。詳見 items.md 與 tools/README.md。
//
// 新增配件流程見 tools/README.md(丟 raw/items_before/ → ItemCut 去背裁切 → raw/items/ → 此檔登記)。
// renderer 以 story 的 items[] 把配件擺到背景上(pos 為格內比例、scale 為佔格高比例)。

export const ITEM_DIR = 'raw/items/';

export const ITEMS = {
  // person → adult → woman(WordNet: adult_female)
  'adult_female':   { file: 'adult_female.png',   w: 222, h: 268, tags: ['女生', '女性', '人物', '丸子頭', '開襟衫', '微笑', '卡通', '上半身'] },
  'adult_female_2': { file: 'adult_female_2.png', w: 254, h: 302, tags: ['女生', '女性', '人物', '丸子頭', '開襟衫', '微笑', '卡通', '上半身'] },
  'adult_female_3': { file: 'adult_female_3.png', w: 177, h: 276, tags: ['女生', '女性', '人物', '黑髮', '髮夾', '寫實', '黑白', '素描', '正面', '氣質'] },
  'adult_female_4': { file: 'adult_female_4.png', w: 221, h: 260, tags: ['女生', '女性', '人物', '黑髮', '髮夾', '寫實', '黑白', '素描', '側面'] },
  'adult_female_5': { file: 'adult_female_5.png', w: 271, h: 236, tags: ['女生', '女性', '人物', '黑髮', '長髮', '捲髮', '寫實', '黑白', '素描', '無奈'] },
  'adult_female_6': { file: 'adult_female_6.png', w: 113, h: 198, tags: ['女生', '女性', '人物', '黑髮', '長髮', '瀏海', '寫實', '黑白', '素描', '冷淡'] },

  // person → adult → man → old man(WordNet: old_man)
  'old_man': { file: 'old_man.png', w: 205, h: 225, tags: ['男生', '男性', '長者', '老人', '灰髮', '眼鏡', '開襟衫', '微笑', '卡通', '上半身'] },

  // animal → dog(WordNet: dog / domestic_dog)
  'dog':   { file: 'dog.png',   w: 264, h: 187, tags: ['狗', '動物', '奔跑', '側面'] },
  'dog_2': { file: 'dog_2.png', w: 292, h: 169, tags: ['狗', '動物', '小跑', '側面'] },
  'dog_3': { file: 'dog_3.png', w: 216, h: 272, tags: ['狗', '動物', '跳躍', '開心'] },
  'dog_4': { file: 'dog_4.png', w: 255, h: 262, tags: ['狗', '動物', '衝刺', '快速'] },
  'dog_5': { file: 'dog_5.png', w: 261, h: 224, tags: ['狗', '動物', '坐', '乖'] },

  // animal → bird(WordNet: bird)
  'bird':   { file: 'bird.png',   w: 43, h: 21, tags: ['鳥', '海鷗', '天空', '飛'] },
  'bird_2': { file: 'bird_2.png', w: 43, h: 25, tags: ['鳥', '海鷗', '天空', '飛'] },
  'bird_3': { file: 'bird_3.png', w: 32, h: 17, tags: ['鳥', '海鷗', '天空', '飛', '小'] },

  // atmospheric phenomenon → cloud(WordNet: cloud)
  'cloud':   { file: 'cloud.png',   w: 130, h: 80, tags: ['雲', '天空', '線稿', '白'] },
  'cloud_2': { file: 'cloud_2.png', w: 70,  h: 46, tags: ['雲', '天空', '線稿', '白', '小'] },
  'cloud_3': { file: 'cloud_3.png', w: 142, h: 96, tags: ['雲', '天空', '表情', '黃色', '可愛'] },
  'cloud_4': { file: 'cloud_4.png', w: 129, h: 65, tags: ['雲', '天空', '黃色', '傍晚'] },

  // artifact → potted plant(WordNet: potted_plant / pot_plant)
  'potted_plant': { file: 'potted_plant.png', w: 140, h: 212, tags: ['植物', '盆栽', '綠色', '室內', '表情'] },

  // artifact → clock(WordNet: clock)
  'clock': { file: 'clock.png', w: 118, h: 118, tags: ['時鐘', '鐘', '時間', '室內'] },

  // artifact → window(WordNet: window)
  'window':   { file: 'window.png',   w: 193, h: 200, tags: ['窗戶', '白天', '室內', '太陽', '植物'] },
  'window_2': { file: 'window_2.png', w: 158, h: 185, tags: ['窗戶', '夜晚', '室內', '月亮', '星星'] },

  // symbol → heart(WordNet: heart, 愛的符號)
  'heart': { file: 'heart.png', w: 48, h: 48, tags: ['愛心', '心', '粉紅', '喜歡', '情感'] },
};
