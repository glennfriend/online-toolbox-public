// assets.js — 角色資產庫(畫風唯一來源)。
//
// 建模成果:角色的「空白臉底圖」來自 vtracer 描線管線(tools/,見 tools/README.md),
// 表情則由「共用表情產生器」makeFace() 依各角色的眼/嘴座標自動繪製。
// renderer 只做組合,故畫風逐 pixel 一致。
//
// 座標系:每個角色以「頭部中心(雙眼中點)」為原點 (0,0)。
//   headTop:最高點的本地 y(氣泡 tail 指向目標);bustBottom:底邊 y(貼齊格底)。

export const STYLE = {
  line:  '#3A3A3A',
  hair:  '#1F1F1F',
  skin:  '#FFFFFF',
  blush: '#F5C4B8',
  paper: '#FDFCF8',   // 格子底色
};

import { TRACED_BUN } from './bun-traced-parts.js';
import { TRACED_LONGHAIR } from './longhair-traced-parts.js';
import { TRACED_BUN_STUDY } from './bun-study-parts.js';
import { TRACED_MAN } from './man-parts.js';
import { TRACED_OLDMAN } from './oldman-parts.js';

export const EMOTIONS = ['neutral', 'happy', 'surprised', 'angry', 'sad'];

// ── 共用表情產生器 ────────────────────────────────────
// 一套表情、所有角色共用。給角色三個臉部座標(該角色描線空間的眼/嘴),
// 依眼距自動定尺寸、依兩眼高低差自動定傾斜 → 換角色不必重畫表情。
const INK = '#1C1C1C', EYEC = '#2E2E2E';
const r1 = (n) => Math.round(n * 10) / 10;

function makeFace(emotion, g) {
  const [lx, ly] = g.eyeL, [rx, ry] = g.eyeR, [mx, my] = g.mouth;
  const sp = Math.hypot(rx - lx, ry - ly);                 // 眼距 → 一切尺寸的基準
  const tilt = Math.atan2(ry - ly, rx - lx) * 180 / Math.PI;
  const er = sp * 0.085, bl = sp * 0.19, bg = sp * 0.17, mw = sp * 0.19;
  const stroke = (w) => `stroke="${INK}" stroke-width="${r1(w)}" fill="none" stroke-linecap="round"`;
  const dot = (x, y, rr) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(rr)}" fill="${EYEC}"/>`;
  const browArc = (x, y, lift) => `<path d="M ${r1(x - bl)} ${r1(y - bg + lift)} Q ${r1(x)} ${r1(y - bg - 2 + lift)} ${r1(x + bl)} ${r1(y - bg + lift)}" ${stroke(sp * 0.045)}/>`;
  const browSlant = (x, y, dInner, dir) => `<path d="M ${r1(x - dir * bl)} ${r1(y - bg - 2)} L ${r1(x + dir * bl)} ${r1(y - bg + dInner)}" ${stroke(sp * 0.05)}/>`;
  const eyeArcUp = (x, y) => `<path d="M ${r1(x - er * 1.4)} ${r1(y + er * 0.6)} Q ${r1(x)} ${r1(y - er * 1.4)} ${r1(x + er * 1.4)} ${r1(y + er * 0.6)}" ${stroke(sp * 0.055)}/>`;
  const hi = (x, y) => `<circle cx="${r1(x - er * 0.4)}" cy="${r1(y - er * 0.4)}" r="${r1(er * 0.35)}" fill="#FFF"/>`;
  const mouth = (depth) => `<g transform="rotate(${r1(tilt)} ${r1(mx)} ${r1(my)})"><path d="M ${r1(mx - mw)} ${r1(my)} Q ${r1(mx)} ${r1(my + depth)} ${r1(mx + mw)} ${r1(my)}" ${stroke(sp * 0.05)}/></g>`;

  switch (emotion) {
    case 'happy':
      return browArc(lx, ly, -2) + browArc(rx, ry, -2) + eyeArcUp(lx, ly) + eyeArcUp(rx, ry) + mouth(mw * 0.95);
    case 'surprised':
      return browArc(lx, ly, -4) + browArc(rx, ry, -4) + dot(lx, ly, er * 1.25) + dot(rx, ry, er * 1.25) + hi(lx, ly) + hi(rx, ry) +
        `<ellipse cx="${r1(mx)}" cy="${r1(my + 2)}" rx="${r1(mw * 0.32)}" ry="${r1(mw * 0.44)}" fill="#FFF" stroke="${INK}" stroke-width="${r1(sp * 0.045)}"/>`;
    case 'angry':
      return browSlant(lx, ly, 6, 1) + browSlant(rx, ry, 6, -1) + dot(lx, ly, er) + dot(rx, ry, er) + mouth(-mw * 0.35);
    case 'sad':
      return browSlant(lx, ly, -6, 1) + browSlant(rx, ry, -6, -1) + dot(lx, ly, er) + dot(rx, ry, er) + mouth(-mw * 0.5);
    default: // neutral
      return browArc(lx, ly, 0) + browArc(rx, ry, 0) + dot(lx, ly, er) + dot(rx, ry, er) + mouth(mw * 0.55);
  }
}

// 產生角色的 5 表情(共用產生器 + 該角色的座標與對位 transform)
function facesFor(geom) {
  const out = {};
  for (const e of EMOTIONS) out[e] = `<g transform="${geom.xform}">${makeFace(e, geom)}</g>`;
  return out;
}

// ── 角色總表 ──────────────────────────────────────────
// 全部角色 = vtracer 描線的空白臉底圖 + 共用表情。新增角色 = 跑管線產 *-traced-parts.js,
// 在這裡加一個 entry(base 底圖 + geom 三座標 + 對位 xform)。
const BUN_XF = 'scale(0.6) translate(-127.5 -195.5)';   // 上半身描線(306x398),眼中點→原點
const LONG_XF = 'scale(0.6) translate(-233 -147)';   // 上半身描線(320x378),眼中點→原點
const BUNSTUDY_XF = 'scale(0.6) translate(-100 -185.5)';   // 讀書姿勢(330x358)
const MAN_XF = 'scale(0.5) translate(-233 -267.5)';   // 男生上半身(470x372),眼中點→原點
const OLDMAN_XF = 'scale(0.41) translate(-270 -295)';   // 老先生(彩色保留,固定表情;base 540x604,臉中~270,295)
const NO_FACE = { neutral: '', happy: '', surprised: '', angry: '', sad: '' };   // 固定表情角色(臉已烘進 base)

export const CHARACTERS = {
  bun: {
    name: '丸子頭',
    desc: '黑髮丸子頭、米白開襟衫(上半身)',
    headTop: -117,
    bustBottom: 122,
    parts: { body: `<g transform="${BUN_XF}">${TRACED_BUN.base}${TRACED_BUN.blush}</g>` },
    faces: facesFor({ eyeL: [110, 200], eyeR: [145, 191], mouth: [128, 218], xform: BUN_XF }),
  },
  longhair: {
    name: '長髮',
    desc: '黑長直髮、米色開襟衫(上半身)',
    headTop: -88,
    bustBottom: 139,
    parts: { body: `<g transform="${LONG_XF}">${TRACED_LONGHAIR.base}${TRACED_LONGHAIR.blush}</g>` },
    faces: facesFor({ eyeL: [199, 154], eyeR: [267, 140], mouth: [241, 182], xform: LONG_XF }),
  },
  'bun-study': {
    name: '丸子頭·讀書',
    desc: '讀書姿勢(米色開襟衫)',
    person: 'bun',
    headTop: -111,
    bustBottom: 104,
    parts: { body: `<g transform="${BUNSTUDY_XF}">${TRACED_BUN_STUDY.base}${TRACED_BUN_STUDY.blush}</g>` },
    faces: facesFor({ eyeL: [79, 188], eyeR: [121, 183], mouth: [100, 212], xform: BUNSTUDY_XF }),
  },
  man: {
    name: '男生',
    desc: '黑短髮男生、白毛衣(上半身)',
    headTop: -134,
    bustBottom: 52,
    parts: { body: `<g transform="${MAN_XF}">${TRACED_MAN.base}</g>` },
    faces: facesFor({ eyeL: [187, 272], eyeR: [279, 263], mouth: [247, 315], xform: MAN_XF }),
  },
  oldman: {
    name: '老先生',
    desc: '灰髮眼鏡、米色開襟衫(彩色保留,固定表情)',
    fixedFace: true,
    headTop: -104,
    bustBottom: 136,
    parts: { body: `<g transform="${OLDMAN_XF}">${TRACED_OLDMAN.base}</g>` },
    faces: NO_FACE,
  },
};
