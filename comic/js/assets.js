// assets.js — 角色資產庫(畫風唯一來源)。
//
// 這個檔就是「建好的模型」:所有零件是寫死的 SVG path,存在 repo 裡永久不變,
// renderer 只做組合(= 移動關節/位置/換表情),因此畫風逐 pixel 完全相同。
//
// 座標系:每個角色以「頭部中心」為原點 (0,0)。
//   頭:寬約 110、高約 104(y ≈ -58 … +46)
//   半身(bust):軀幹到 y = 132
//   headTop:該角色最高點的本地 y(氣泡 tail 的指向目標)
//
// 畫風 token(依 4 張參考圖:細灰線輪廓、頭髮純黑、衣服柔和粉彩、腮紅粉點):
export const STYLE = {
  line:  '#3A3A3A',   // 細線(輪廓、五官)
  hair:  '#1F1F1F',   // 頭髮:唯一的純黑大色塊
  skin:  '#FFFFFF',   // 膚色 = 紙白留白
  blush: '#F5C4B8',   // 腮紅
  cream: '#F4EDDF',   // 米白(丸子頭的開襟衫)
  sage:  '#CBD5B9',   // 抹茶綠(長髮的開襟衫)
  paper: '#FDFCF8',   // 格子底色
};

import { TRACED_BUN } from './bun-traced-parts.js';

const L = STYLE;
const SW = 3; // 統一線寬

// ── 共用零件工廠 ──────────────────────────────────────
// 參考圖裡所有人物共用同一套臉部幾何(眼距/腮紅/嘴位),畫風一致的關鍵;
// 角色差異只在髮型與衣服。

const makeNeck = () => `
  <rect x="-9" y="38" width="18" height="18" fill="${L.skin}"/>
  <path d="M -9 40 L -9 54 M 9 40 L 9 54" stroke="${L.line}" stroke-width="${SW}" fill="none"/>`;

// 開襟衫 + 白T(fill 換色即是另一套衣服)
const makeBody = (fill) => `
  <path d="M -16 46 C -38 52 -56 62 -61 84 C -64 100 -66 116 -66 132 L 66 132 C 66 116 64 100 61 84 C 56 62 38 52 16 46 Z"
        fill="${fill}" stroke="${L.line}" stroke-width="${SW}"/>
  <path d="M -13 50 C -6 59 6 59 13 50 C 15 78 16 105 15 132 L -15 132 C -16 105 -15 78 -13 50 Z"
        fill="#FFFFFF" stroke="${L.line}" stroke-width="${SW}"/>`;

const makeHead = () => `
  <ellipse cx="0" cy="-6" rx="55" ry="52" fill="${L.skin}" stroke="${L.line}" stroke-width="${SW}"/>`;

const BLUSH = `
  <ellipse cx="-33" cy="10" rx="7.5" ry="5" fill="${L.blush}" opacity=".85"/>
  <ellipse cx="33" cy="10" rx="7.5" ry="5" fill="${L.blush}" opacity=".85"/>`;

// 5 種標準表情:只換眼睛/眉毛/嘴巴(臉型髮型永不動)
const makeFaces = () => ({
  neutral: `
    <path d="M -26 -11 Q -20 -14 -14 -12 M 14 -12 Q 20 -14 26 -11"
          stroke="${L.line}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <circle cx="-20" cy="-1" r="4.5" fill="#2E2E2E"/>
    <circle cx="20" cy="-1" r="4.5" fill="#2E2E2E"/>
    ${BLUSH}
    <path d="M -6 19 Q 0 23 6 19" stroke="${L.line}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
  happy: `
    <path d="M -26 -13 Q -20 -16 -14 -14 M 14 -14 Q 20 -16 26 -13"
          stroke="${L.line}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M -27 -1 Q -20 -10 -13 -1 M 13 -1 Q 20 -10 27 -1"
          stroke="${L.line}" stroke-width="3.2" fill="none" stroke-linecap="round"/>
    ${BLUSH}
    <path d="M -8 16 Q 0 26 8 16" stroke="${L.line}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`,
  surprised: `
    <path d="M -26 -16 Q -20 -19 -14 -17 M 14 -17 Q 20 -19 26 -16"
          stroke="${L.line}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <circle cx="-20" cy="-1" r="5.5" fill="#2E2E2E"/>
    <circle cx="20" cy="-1" r="5.5" fill="#2E2E2E"/>
    <circle cx="-21.5" cy="-2.5" r="1.6" fill="#FFFFFF"/>
    <circle cx="18.5" cy="-2.5" r="1.6" fill="#FFFFFF"/>
    ${BLUSH}
    <ellipse cx="0" cy="20" rx="4.5" ry="6" fill="#FFFFFF" stroke="${L.line}" stroke-width="2.6"/>`,
  angry: `
    <path d="M -26 -15 L -13 -9 M 13 -9 L 26 -15"
          stroke="${L.line}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <circle cx="-19" cy="-1" r="4.5" fill="#2E2E2E"/>
    <circle cx="19" cy="-1" r="4.5" fill="#2E2E2E"/>
    ${BLUSH}
    <path d="M -6 21 Q 0 17 6 21" stroke="${L.line}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
  sad: `
    <path d="M -25 -9 Q -19 -13 -14 -14 M 14 -14 Q 19 -13 25 -9"
          stroke="${L.line}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <circle cx="-20" cy="-1" r="4.5" fill="#2E2E2E"/>
    <circle cx="20" cy="-1" r="4.5" fill="#2E2E2E"/>
    ${BLUSH}
    <path d="M -6 21 Q 0 16 6 21" stroke="${L.line}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
});

// 瀏海(下緣兩個柔和圓弧、中間微露額頭)+ 兩側垂到臉頰的短髮絲 —— 兩位角色共用
const FRINGE = `
  <path d="M -57 2 C -61 -40 -36 -62 0 -62 C 36 -62 61 -40 57 2
           C 57 15 53 27 46 32 C 43 26 43 15 45 5
           C 37 -17 25 -19 15 -15 C 8 -22 -8 -22 -15 -15
           C -25 -19 -37 -17 -45 5 C -43 15 -43 26 -46 32
           C -53 27 -57 15 -57 2 Z" fill="${L.hair}"/>`;

// ── 角色:bun(丸子頭女生;參考圖 1、2)────────────────
const bunHair = `
  ${FRINGE}
  <ellipse cx="14" cy="-70" rx="24" ry="17" transform="rotate(-14 14 -70)" fill="${L.hair}"/>
  <path d="M -4 -74 Q 12 -84 28 -72 M 0 -63 Q 13 -70 25 -60"
        stroke="rgba(255,255,255,.38)" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M -13 -56 Q -22 -64 -17 -73" stroke="${L.hair}" stroke-width="${SW}" fill="none" stroke-linecap="round"/>`;

// ── 角色:longhair(長髮女生;參考圖 3、4)──────────────
// 後髮層(畫在最底,蓋過肩膀後方)+ 前側兩束垂在肩前的長髮
const longhairBack = `
  <path d="M -60 -8 C -63 -46 -34 -66 0 -66 C 34 -66 63 -46 60 -8
           C 63 28 62 62 54 92 C 46 98 36 96 30 90
           C 12 96 -12 96 -30 90 C -36 96 -46 98 -54 92
           C -62 62 -63 28 -60 -8 Z" fill="${L.hair}"/>`;
const longhairFront = `
  ${FRINGE}
  <path d="M 46 -6 C 55 6 57 26 54 48 C 52 66 48 78 42 84
           C 38 76 37 62 38 48 C 39 28 41 8 46 -6 Z" fill="${L.hair}"/>
  <path d="M -46 -6 C -55 6 -57 26 -54 48 C -52 66 -48 78 -42 84
           C -38 76 -37 62 -38 48 C -39 28 -41 8 -46 -6 Z" fill="${L.hair}"/>`;

// ── 角色:bun2(丸子頭・描線版)────────────────────────
// 零件來自 vtracer 管線(raw/head-bun-q.svg → bun-traced-parts.js),手繪感 100%。
// 描線原始座標是 288x286 像素空間,用下面的 transform 對位到角色座標系:
//   雙眼中點 (123,197) → (0,0) 附近、縮放 0.72。
// 表情採混合式:neutral 用描線原生的眼/嘴;其餘 4 種是手寫小零件(座標跟著描線空間,
// 注意原圖頭微傾,右眼比左眼高 10px,手寫表情也要跟著傾斜才不會歪)。
const T_BUN = 'scale(0.72) translate(-123 -197)';
const tb = (inner) => `<g transform="${T_BUN}">${inner}</g>`;
const TB_INK = '#1C1C1C';

const bun2Faces = {
  neutral: tb(TRACED_BUN.eyes + TRACED_BUN.mouth),
  happy: tb(`
    <path d="M 99 205 Q 105.5 197 112 205 M 134.5 195 Q 141 187 147.5 195"
          stroke="${TB_INK}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M 119 213 Q 128 223 137 213" stroke="${TB_INK}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`),
  surprised: tb(`
    <circle cx="105.5" cy="202.5" r="6" fill="${TB_INK}"/><circle cx="141" cy="192.5" r="6" fill="${TB_INK}"/>
    <circle cx="103.8" cy="200.8" r="1.8" fill="#FFFFFF"/><circle cx="139.3" cy="190.8" r="1.8" fill="#FFFFFF"/>
    <ellipse cx="128" cy="219" rx="5" ry="6.5" fill="#FFFFFF" stroke="${TB_INK}" stroke-width="3.4"/>`),
  angry: tb(`
    <path d="M 96 191 L 111 197 M 150 181 L 135 187" stroke="${TB_INK}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <circle cx="105.5" cy="202.5" r="4.5" fill="${TB_INK}"/><circle cx="141" cy="192.5" r="4.5" fill="${TB_INK}"/>
    <path d="M 121 219 Q 128 215 135 219" stroke="${TB_INK}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`),
  sad: tb(`
    <path d="M 97 197 L 111 191 M 149 187 L 135 181" stroke="${TB_INK}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <circle cx="105.5" cy="202.5" r="4.5" fill="${TB_INK}"/><circle cx="141" cy="192.5" r="4.5" fill="${TB_INK}"/>
    <path d="M 120 221 Q 128 214 136 221" stroke="${TB_INK}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`),
};

// ── 角色總表 ──────────────────────────────────────────
// 新增角色 = 加一個 entry。parts 依序輸出:back → neck → body → head → face → hair。
export const CHARACTERS = {
  bun2: {
    name: '丸子頭(描線版)',
    desc: '參考圖 vtracer 描線而來;手繪感基準',
    headTop: -109,
    bustBottom: 64,     // 描線只裁到肩上緣,軀幹比手寫版短(renderer 據此貼齊格底)
    parts: { body: tb(TRACED_BUN.base + TRACED_BUN.blush) },
    faces: bun2Faces,
  },
  bun: {
    name: '丸子頭女生',
    desc: '黑髮丸子頭、米白開襟衫、白T',
    headTop: -88,
    parts: { neck: makeNeck(), body: makeBody(L.cream), head: makeHead(), hair: bunHair },
    faces: makeFaces(),
  },
  longhair: {
    name: '長髮女生',
    desc: '黑長直髮、抹茶綠開襟衫、白T',
    headTop: -66,
    parts: { back: longhairBack, neck: makeNeck(), body: makeBody(L.sage), head: makeHead(), hair: longhairFront },
    faces: makeFaces(),
  },
};

export const EMOTIONS = ['neutral', 'happy', 'surprised', 'angry', 'sad'];
