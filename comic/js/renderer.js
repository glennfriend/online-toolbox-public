// renderer.js — JSON 劇本 → SVG 漫畫。
//
// Phase 1 範圍:單格(layout: "single")、speech 氣泡、plain 背景。
// 錯誤容忍原則:缺欄位用預設值、未知值 fallback,全部收進 warnings 回報(絕不無聲)。

import { STYLE, CHARACTERS } from './assets.js';
import { PROPS } from './props.js';

const PANEL_W = 800;
const PANEL_H = 600;
const CHAR_SCALE = 1.5;          // 角色本地座標 → 畫布 px
const FONT_SIZE = 26;            // 氣泡文字字級(CJK 一字寬 ≈ 字級)
const LINE_H = FONT_SIZE * 1.35;
const MAX_CHARS = 9;             // 每行上限(中文字數)

const POS_X = { left: 0.27, center: 0.5, right: 0.73 };

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// CJK 換行:全形算 1 字寬、半形算 0.55;支援 \n 強制換行。回傳 [{ text, units }]
function wrapText(text, maxChars = MAX_CHARS) {
  const lines = [];
  let line = '', units = 0;
  for (const ch of String(text)) {
    const w = /[\x00-\xff]/.test(ch) ? 0.55 : 1;
    if (ch === '\n' || units + w > maxChars) {
      lines.push({ text: line, units });
      line = ch === '\n' ? '' : ch;
      units = ch === '\n' ? 0 : w;
    } else {
      line += ch;
      units += w;
    }
  }
  if (line) lines.push({ text: line, units });
  return lines.length ? lines : [{ text: '', units: 0 }];
}

// 組出一個角色(本地座標已在 assets 統一,這裡只放位置/翻轉/縮放)
function renderCharacter(entry, warnings) {
  const def = CHARACTERS[entry.char];
  if (!def) {
    warnings.push(`未知角色「${entry.char}」,已略過(可用:${Object.keys(CHARACTERS).join(', ')})`);
    return null;
  }
  const emotion = entry.emotion || 'neutral';
  let face = def.faces[emotion];
  if (!face) {
    warnings.push(`角色「${entry.char}」沒有表情「${emotion}」,改用 neutral(可用:${Object.keys(def.faces).join(', ')})`);
    face = def.faces.neutral;
  }
  const pos = entry.pos || 'center';
  const relX = typeof pos === 'object' ? pos.x : (POS_X[pos] ?? (warnings.push(`未知位置「${pos}」,改用 center`), 0.5));
  const x = relX * PANEL_W;
  const y = PANEL_H - 20 - (def.bustBottom ?? 132) * CHAR_SCALE;   // 軀幹底貼齊格子下緣
  const flip = entry.face === 'left' ? -1 : 1;
  const p = def.parts;
  return {
    x,
    headTopY: y + def.headTop * CHAR_SCALE,
    svg: `<g transform="translate(${x} ${y}) scale(${flip * CHAR_SCALE} ${CHAR_SCALE})"
             stroke-linecap="round" stroke-linejoin="round">
            ${p.back || ''}${p.neck || ''}${p.body || ''}${p.head || ''}${face}${p.hair || ''}
          </g>`,
  };
}

const BUBBLE_INK = '#1A1A1A', BW_STROKE = 4;
const FONT = `-apple-system,'Segoe UI','Noto Sans CJK TC','Microsoft JhengHei',sans-serif`;

// 彎曲短尾(朝說話者頭頂,任意角度都行)。兩側用二次曲線收向尖端,像參考圖那種有機的尾巴。
function tailPath(bx, by, bw, bh, speaker) {
  const cxB = bx + bw / 2, cyB = by + bh;              // 從氣泡底邊中點附近長出
  let vx = speaker.x - cxB, vy = speaker.headTopY - cyB;
  const len = Math.hypot(vx, vy) || 1; vx /= len; vy /= len;
  const stub = 40;                                     // 固定短長度,不隨距離拉長
  const f = (n) => n.toFixed(1);
  const tipX = cxB + vx * stub, tipY = cyB + vy * stub;
  const px = -vy, py = vx, half = 15;                  // 底邊沿垂直方向張開
  const b1x = clamp(cxB + px * half, bx + 8, bx + bw - 8), b1y = cyB + py * half;
  const b2x = clamp(cxB - px * half, bx + 8, bx + bw - 8), b2y = cyB - py * half;
  const c1x = b1x + vx * stub * 0.45, c1y = b1y + vy * stub * 0.45;   // 兩側控制點不對稱 → 尾巴微鉤,較自然
  const c2x = b2x + vx * stub * 0.6, c2y = b2y + vy * stub * 0.6;
  return `M ${f(b1x)} ${f(b1y)} Q ${f(c1x)} ${f(c1y)} ${f(tipX)} ${f(tipY)} Q ${f(c2x)} ${f(c2y)} ${f(b2x)} ${f(b2y)} Z`;
}

// 爆炸鋸齒外框(shout):rx/ry = 貼著文字的內圈(凹槽落在這),尖刺往外爆出、長短不一 → 強烈的「碰!」框。
function spikyPath(cx, cy, rx, ry) {
  const OUT = [1.34, 1.52, 1.28, 1.46, 1.36, 1.54, 1.26, 1.48, 1.32, 1.5, 1.3, 1.44]; // 每根尖刺外伸倍率
  const n = OUT.length, pts = [];
  for (let i = 0; i < n; i++) {
    const ao = 2 * Math.PI * i / n, ai = 2 * Math.PI * (i + 0.5) / n;
    pts.push(`${(cx + Math.cos(ao) * rx * OUT[i]).toFixed(1)} ${(cy + Math.sin(ao) * ry * OUT[i]).toFixed(1)}`);   // 尖端(外伸)
    pts.push(`${(cx + Math.cos(ai) * rx).toFixed(1)} ${(cy + Math.sin(ai) * ry).toFixed(1)}`);                     // 凹槽(貼文字)
  }
  return `M ${pts.join(' L ')} Z`;
}

// 氣泡:依 type 畫不同外框 + 朝說話者的短尾。回傳 { svg, height }
function renderBubble(bubble, castPlaced, cursorY, warnings) {
  const type = ['speech', 'thought', 'shout', 'narration'].includes(bubble.type) ? bubble.type
    : (bubble.type ? (warnings.push(`未知氣泡類型「${bubble.type}」,改用 speech`), 'speech') : 'speech');
  const lines = wrapText(bubble.text ?? (warnings.push('氣泡缺 text,顯示空白'), ''));
  const padX = 22, padY = 15;
  const maxUnits = Math.max(...lines.map((l) => l.units));
  const bw = Math.max(maxUnits * FONT_SIZE + padX * 2, 72);
  const bh = lines.length * LINE_H + padY * 2;

  const speaker = castPlaced.find((c) => c.entry.char === bubble.speaker);
  if (bubble.speaker && !speaker && type !== 'narration') warnings.push(`氣泡的 speaker「${bubble.speaker}」不在本格 cast 中,尾巴省略`);
  const sx = speaker ? speaker.x : PANEL_W / 2;
  const bx = clamp(sx - bw / 2, 14, PANEL_W - 14 - bw);
  const by = cursorY;

  const texts = lines.map((l, i) =>
    `<text x="${(bx + bw / 2).toFixed(1)}" y="${(by + padY + FONT_SIZE * 0.85 + i * LINE_H).toFixed(1)}" font-size="${FONT_SIZE}"
       text-anchor="middle" fill="#1F1F1F" font-family="${FONT}">${esc(l.text)}</text>`).join('');

  // 旁白:頂端字幕框,方角、無尾巴、淡黃底
  if (type === 'narration') {
    return { height: bh,
      svg: `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="5" fill="#FFFCEC" stroke="${BUBBLE_INK}" stroke-width="2.5"/>${texts}` };
  }

  let tail = '';
  if (speaker) {
    if (type === 'thought') {                          // 想法:兩顆小圓當尾巴
      const cxB = bx + bw / 2, cyB = by + bh;
      let vx = speaker.x - cxB, vy = speaker.headTopY - cyB; const len = Math.hypot(vx, vy) || 1; vx /= len; vy /= len;
      tail = `<circle cx="${(cxB + vx * 20).toFixed(1)}" cy="${(cyB + vy * 20).toFixed(1)}" r="7" fill="#FFF" stroke="${BUBBLE_INK}" stroke-width="3"/>
              <circle cx="${(cxB + vx * 38).toFixed(1)}" cy="${(cyB + vy * 38).toFixed(1)}" r="4.5" fill="#FFF" stroke="${BUBBLE_INK}" stroke-width="2.5"/>`;
    } else {                                           // speech / shout:尖尾
      tail = `<path d="${tailPath(bx, by, bw, bh, speaker)}" fill="#FFF" stroke="${BUBBLE_INK}" stroke-width="${BW_STROKE}" stroke-linejoin="round"/>`;
    }
  }

  let box;
  if (type === 'shout') {
    box = `<path d="${spikyPath(bx + bw / 2, by + bh / 2, bw / 2 + 16, bh / 2 + 12)}" fill="#FFF" stroke="${BUBBLE_INK}" stroke-width="4.5" stroke-linejoin="miter"/>`;
  } else {
    const rx = type === 'thought' ? 26 : Math.min(bh / 2, 32);   // speech 較圓,接近上傳的參考氣泡
    box = `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${rx}" fill="#FFF" stroke="${BUBBLE_INK}" stroke-width="${BW_STROKE}"/>`;
  }
  // 尾巴先畫,外框蓋在上面(遮住接縫),文字最後
  return { height: bh, svg: tail + box + texts };
}

function renderPanel(panel, warnings) {
  const bg = panel.bg || 'plain';
  if (bg !== 'plain') warnings.push(`背景「${bg}」Phase 1 尚未實作,改用 plain`);

  // 道具:放在角色之前(當背景陳設)。pos={x,y} 為格內比例(0~1,道具中心),scale 預設 1。
  //   有向量資產 → 用資產;否則用 emoji 當低成本替身(zero-asset fallback):
  //   { "emoji":"🏹", pos, scale } 明確指定,或 { "prop":"🍎" } 傳入 emoji 也行。
  let propsSvg = '';
  for (const it of panel.props || []) {
    const s = it.scale || 1;
    const pos = it.pos || { x: 0.5, y: 0.5 };
    const cx = (pos.x ?? 0.5) * PANEL_W, cy = (pos.y ?? 0.5) * PANEL_H;
    const def = it.prop && PROPS[it.prop];
    if (def) {
      propsSvg += `<g transform="translate(${(cx - def.w * s / 2).toFixed(1)} ${(cy - def.h * s / 2).toFixed(1)}) scale(${s})">${def.svg}</g>`;
      continue;
    }
    const ch = it.emoji || it.prop;                    // emoji 替身
    if (ch && (it.emoji || [...String(ch)].length <= 3)) {
      const size = (it.size || 88) * s;
      propsSvg += `<text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" font-size="${size.toFixed(0)}" text-anchor="middle" dominant-baseline="central">${esc(ch)}</text>`;
    } else {
      warnings.push(`未知道具「${it.prop}」,已略過(可用向量:${Object.keys(PROPS).join(', ')};或用 emoji 欄位)`);
    }
  }

  const castPlaced = (panel.cast || []).map((entry) => {
    const r = renderCharacter(entry, warnings);
    return r ? { entry, ...r } : null;
  }).filter(Boolean);

  let bubbles = '';
  let cursorY = 22;
  for (const b of panel.bubbles || []) {
    const r = renderBubble(b, castPlaced, cursorY, warnings);
    bubbles += r.svg;
    cursorY += r.height + 12;
  }
  if (panel.effects?.length) warnings.push('effects Phase 1 尚未實作,已略過');

  return `
    <rect x="6" y="6" width="${PANEL_W - 12}" height="${PANEL_H - 12}" rx="16"
          fill="${STYLE.paper}" stroke="${STYLE.line}" stroke-width="3"/>
    ${propsSvg}
    ${castPlaced.map((c) => c.svg).join('')}
    ${bubbles}`;
}

// 版型:格子欄列數
const LAYOUTS = {
  'single': { cols: 1, rows: 1 },
  'grid-2x2': { cols: 2, rows: 2 },
  'strip-1x4': { cols: 1, rows: 4 },
  'grid-2x3': { cols: 2, rows: 3 },
};

// 主入口:劇本 → { svg, warnings }
export function renderComic(script) {
  const warnings = [];
  let layout = script.layout || 'single';
  if (!LAYOUTS[layout]) { warnings.push(`未知版型「${layout}」,改用 grid-2x2`); layout = 'grid-2x2'; }
  const { cols, rows } = LAYOUTS[layout];
  const cap = cols * rows;
  const panels = Array.isArray(script.panels) && script.panels.length
    ? script.panels : (warnings.push('劇本沒有 panels,輸出空格子'), [{}]);
  if (panels.length > cap) warnings.push(`版型 ${layout} 只有 ${cap} 格,多出的 ${panels.length - cap} 格未顯示`);

  const W = cols * PANEL_W, H = rows * PANEL_H;
  const cells = panels.slice(0, cap).map((p, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    return `<g transform="translate(${col * PANEL_W} ${row * PANEL_H})">${renderPanel(p, warnings)}</g>`;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${cells}</svg>`;
  return { svg, warnings };
}
