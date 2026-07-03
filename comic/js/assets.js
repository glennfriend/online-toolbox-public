// assets.js — 角色資產庫(畫風唯一來源)。
//
// 「訓練」的成果就是這個檔:所有零件是寫死的 SVG path,renderer 只做組合,
// 因此畫風不是「類似」,是逐 pixel 完全相同。調畫風 = 改這裡,別處不動。
//
// 座標系:每個角色以「頭部中心」為原點 (0,0)。
//   頭:寬約 110、高約 104(y ≈ -58 … +46)
//   半身(bust):軀幹到 y = 132
//   丸子頭頂:y ≈ -88(氣泡 tail 的指向目標,見 headTop)
//
// 畫風 token(依 4 張參考圖:細灰線輪廓、頭髮純黑、衣服柔和粉彩、腮紅粉點):
export const STYLE = {
  line:  '#3A3A3A',   // 細線(輪廓、五官)
  hair:  '#1F1F1F',   // 頭髮:唯一的純黑大色塊
  skin:  '#FFFFFF',   // 膚色 = 紙白留白
  blush: '#F5C4B8',   // 腮紅
  cream: '#F4EDDF',   // 米白(開襟衫)
  sage:  '#CBD5B9',   // 抹茶綠(第二套衣服預留)
  paper: '#FDFCF8',   // 格子底色
};

const L = STYLE;
const SW = 3; // 統一線寬

// ── 角色:bun(丸子頭女生)──────────────────────────────
// 依參考圖 1、2:黑髮丸子頭 + 瀏海 + 兩側短髮絲、米白開襟衫 + 白T。
// 繪製順序(renderer 依序輸出):neck → body → head → face(表情層)→ hair(最上層)

const bunNeck = `
  <rect x="-9" y="38" width="18" height="18" fill="${L.skin}"/>
  <path d="M -9 40 L -9 54 M 9 40 L 9 54" stroke="${L.line}" stroke-width="${SW}" fill="none"/>`;

const bunBody = `
  <path d="M -16 46 C -38 52 -56 62 -61 84 C -64 100 -66 116 -66 132 L 66 132 C 66 116 64 100 61 84 C 56 62 38 52 16 46 Z"
        fill="${L.cream}" stroke="${L.line}" stroke-width="${SW}"/>
  <path d="M -13 50 C -6 59 6 59 13 50 C 15 78 16 105 15 132 L -15 132 C -16 105 -15 78 -13 50 Z"
        fill="#FFFFFF" stroke="${L.line}" stroke-width="${SW}"/>`;

const bunHead = `
  <ellipse cx="0" cy="-6" rx="55" ry="52" fill="${L.skin}" stroke="${L.line}" stroke-width="${SW}"/>`;

// 瀏海(下緣兩個柔和圓弧、中間微露額頭)+ 兩側垂到臉頰的短髮絲 + 丸子
const bunHair = `
  <path d="M -57 2 C -61 -40 -36 -62 0 -62 C 36 -62 61 -40 57 2
           C 57 15 53 27 46 32 C 43 26 43 15 45 5
           C 37 -17 25 -19 15 -15 C 8 -22 -8 -22 -15 -15
           C -25 -19 -37 -17 -45 5 C -43 15 -43 26 -46 32
           C -53 27 -57 15 -57 2 Z" fill="${L.hair}"/>
  <ellipse cx="14" cy="-70" rx="24" ry="17" transform="rotate(-14 14 -70)" fill="${L.hair}"/>
  <path d="M -4 -74 Q 12 -84 28 -72 M 0 -63 Q 13 -70 25 -60"
        stroke="rgba(255,255,255,.38)" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M -13 -56 Q -22 -64 -17 -73" stroke="${L.hair}" stroke-width="${SW}" fill="none" stroke-linecap="round"/>`;

// 表情層:只換眼睛/眉毛/嘴巴,臉型與髮型不變(畫風一致的關鍵)
const bunFaces = {
  neutral: `
    <path d="M -26 -11 Q -20 -14 -14 -12 M 14 -12 Q 20 -14 26 -11"
          stroke="${L.line}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <circle cx="-20" cy="-1" r="4.5" fill="#2E2E2E"/>
    <circle cx="20" cy="-1" r="4.5" fill="#2E2E2E"/>
    <ellipse cx="-33" cy="10" rx="7.5" ry="5" fill="${L.blush}" opacity=".85"/>
    <ellipse cx="33" cy="10" rx="7.5" ry="5" fill="${L.blush}" opacity=".85"/>
    <path d="M -6 19 Q 0 23 6 19" stroke="${L.line}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
  happy: `
    <path d="M -26 -13 Q -20 -16 -14 -14 M 14 -14 Q 20 -16 26 -13"
          stroke="${L.line}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M -27 -1 Q -20 -10 -13 -1 M 13 -1 Q 20 -10 27 -1"
          stroke="${L.line}" stroke-width="3.2" fill="none" stroke-linecap="round"/>
    <ellipse cx="-33" cy="10" rx="7.5" ry="5" fill="${L.blush}" opacity=".85"/>
    <ellipse cx="33" cy="10" rx="7.5" ry="5" fill="${L.blush}" opacity=".85"/>
    <path d="M -8 16 Q 0 26 8 16" stroke="${L.line}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`,
};

// ── 角色總表 ──────────────────────────────────────────
// 新增角色 = 加一個 entry(neck/body/head/hair 可缺省,faces 至少要有 neutral)。
export const CHARACTERS = {
  bun: {
    name: '丸子頭女生',
    desc: '黑髮丸子頭、米白開襟衫、白T',
    headTop: -88,                     // 頭頂(含丸子)的本地 y:氣泡 tail 指這裡
    parts: { neck: bunNeck, body: bunBody, head: bunHead, hair: bunHair },
    faces: bunFaces,
  },
};

export const EMOTIONS = ['neutral', 'happy'];   // Phase 1:先兩種,畫風定稿後再擴
