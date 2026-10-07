// labels.js — 代碼 → 中文標籤。
//   • JMdict 的詞性/標記用 DTD 實體代碼(v5k、uk…);這裡給常見的中文名,
//     沒列到的退回 DTD 的英文說明(由 DB meta.entities 提供),保證不會只顯示看不懂的代碼。
//   • 中文維基詞典的 tags 是英文(archaic…),一樣對成中文。

export const POS = {
  n: '名詞', 'n-adv': '副詞性名詞', 'n-pr': '專有名詞', 'n-pref': '名詞(接頭)', 'n-suf': '名詞(接尾)', 'n-t': '時間名詞',
  pn: '代名詞', num: '數詞', ctr: '量詞', exp: '慣用語', int: '感嘆詞', conj: '接續詞', prt: '助詞', cop: '繫詞(だ)',
  pref: '接頭詞', suf: '接尾詞', aux: '助動詞', 'aux-v': '助動詞(動詞型)', 'aux-adj': '助動詞(形容詞型)', unc: '未分類',
  adv: '副詞', 'adv-to': '副詞(と)',
  'adj-i': 'い形容詞', 'adj-ix': 'い形容詞(いい/よい)', 'adj-na': 'な形容詞', 'adj-no': 'の形容詞', 'adj-pn': '連體詞',
  'adj-t': 'たる形容詞', 'adj-f': '連體修飾', 'adj-ku': 'く形容詞(古)', 'adj-shiku': 'しく形容詞(古)', 'adj-nari': 'なり形容詞(古)',
  'adj-kari': 'かり形容詞(古)',
  v1: '一段動詞', 'v1-s': '一段動詞(くれる類)', vk: 'カ變動詞(来る)', vs: 'する動詞(名詞+する)', 'vs-i': 'サ變動詞',
  'vs-s': 'サ變動詞(〜する)', 'vs-c': 'す動詞(古)', vz: 'ザ變動詞(〜ずる)', vn: 'ナ變動詞(古)', vr: 'ラ變動詞(古)',
  v5aru: '五段動詞(〜ある)', v5b: '五段動詞(ぶ)', v5g: '五段動詞(ぐ)', v5k: '五段動詞(く)', 'v5k-s': '五段動詞(行く)',
  v5m: '五段動詞(む)', v5n: '五段動詞(ぬ)', v5r: '五段動詞(る)', 'v5r-i': '五段動詞(る,不規則)', v5s: '五段動詞(す)',
  v5t: '五段動詞(つ)', v5u: '五段動詞(う)', 'v5u-s': '五段動詞(う,特殊)', v5uru: '五段動詞(うる)',
  vi: '自動詞', vt: '他動詞', 'v-unspec': '動詞(未定)',
};

export const MISC = {
  uk: '通常寫假名', uK: '通常寫漢字', abbr: '縮寫', arch: '古語', col: '口語', dated: '舊式', derog: '貶義', fam: '親暱',
  fem: '女性用語', male: '男性用語', form: '正式', hon: '尊敬語', hum: '謙讓語', pol: '丁寧語', id: '慣用語', joc: '戲謔',
  obs: '廢用', 'on-mim': '擬聲擬態', poet: '詩語', proverb: '諺語', quote: '引用', rare: '罕用', sens: '敏感', sl: '俚語',
  'm-sl': '漫畫俚語', 'net-sl': '網路用語', vulg: '粗俗', yoji: '四字熟語', chn: '兒語', child: '兒語', hist: '歷史用語',
  litf: '書面語', euph: '委婉', '4char': '四字熟語', 'rare-kanji': '罕用漢字',
  // 寫法/讀音標記(ke_inf / re_inf)
  ateji: '當字', ik: '不規則假名', iK: '不規則漢字', io: '不規則送假名', oK: '舊字形', ok: '舊假名', rK: '罕用漢字',
  rk: '罕用讀音', gikun: '義訓', sK: '僅供搜尋', sk: '僅供搜尋',
};

export const FIELD = {
  comp: '電腦', med: '醫學', math: '數學', law: '法律', biol: '生物', chem: '化學', physics: '物理', ling: '語言學',
  bot: '植物', zool: '動物', food: '料理', sports: '運動', music: '音樂', econ: '經濟', finc: '金融', bus: '商業',
  Buddh: '佛教', Shinto: '神道', Christn: '基督教', mil: '軍事', engr: '工程', archit: '建築', astron: '天文',
  baseb: '棒球', geol: '地質', anat: '解剖', mahj: '麻將', shogi: '將棋', go: '圍棋', sumo: '相撲', elec: '電學',
  gramm: '文法', psych: '心理', philos: '哲學', pharm: '藥學', internet: '網路', agric: '農業', art: '藝術',
  cards: '撲克', film: '電影', golf: '高爾夫', MA: '武術', print: '印刷', stat: '統計', tradem: '商標', vidg: '電玩',
  sports2: '運動', fish: '漁業', geom: '幾何', gardn: '園藝', jpmyth: '日本神話', kabuki: '歌舞伎', noh: '能劇',
  rail: '鐵路', ski: '滑雪', tv: '電視', telec: '通訊', aviat: '航空', boxing: '拳擊', chmyth: '中國神話', mech: '機械',
};

export const DIAL = {
  hob: '北海道方言', ksb: '關西方言', ktb: '關東方言', kyb: '京都方言', kyu: '九州方言', nab: '長野方言',
  osb: '大阪方言', rkb: '琉球方言', thb: '東北方言', tsb: '土佐方言', tsug: '津輕方言',
};

export const LANG = {
  eng: '英語', fre: '法語', ger: '德語', por: '葡萄牙語', dut: '荷蘭語', ita: '義大利語', spa: '西班牙語', rus: '俄語',
  chi: '漢語', kor: '韓語', lat: '拉丁語', gre: '希臘語', ain: '愛努語', san: '梵語', ara: '阿拉伯語', mon: '蒙古語',
  tha: '泰語', vie: '越南語', may: '馬來語', ind: '印尼語', hin: '印地語', tib: '藏語', pol: '波蘭語', swe: '瑞典語',
};

export const GLOSS_TYPE = { lit: '字面', fig: '比喻', expl: '說明', tm: '商標' };

// 中文維基詞典
export const WK_POS = {
  noun: '名詞', verb: '動詞', adj: '形容詞', adj_noun: '形容動詞', adv: '副詞', intj: '感嘆詞', phrase: '片語',
  proverb: '諺語', suffix: '接尾詞', prefix: '接頭詞', affix: '詞綴', particle: '助詞', pron: '代名詞', conj: '接續詞',
  num: '數詞', classifier: '量詞', counter: '量詞', adnominal: '連體詞', abbrev: '縮寫', contraction: '縮約', postp: '後置詞',
};
export const WK_TAG = {
  archaic: '古語', colloquial: '口語', slang: '俚語', humble: '謙讓', honorific: '尊敬', polite: '丁寧', informal: '非正式',
  formal: '正式', rare: '罕用', obsolete: '廢用', dated: '舊式', figuratively: '比喻', literary: '書面語', vulgar: '粗俗',
  derogatory: '貶義', intransitive: '自動詞', transitive: '他動詞', Internet: '網路用語', abbreviation: '縮寫',
  euphemistic: '委婉', 'Kansai': '關西', dialectal: '方言', childish: '兒語', humorous: '戲謔', idiomatic: '慣用',
  'Buddhism': '佛教', mathematics: '數學', medicine: '醫學', law: '法律', computing: '電腦', biology: '生物',
};

// entities:DB 的 meta.entities(代碼 → DTD 英文說明),當中文沒列到時的退路
export function label(map, code, entities) {
  return map[code] || (entities && entities[code]) || code;
}
