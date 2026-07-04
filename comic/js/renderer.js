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

// 氣泡:圓角矩形 + 指向說話者頭頂的 tail。回傳 { svg, height }
function renderBubble(bubble, castPlaced, cursorY, warnings) {
  if (bubble.type && bubble.type !== 'speech') {
    warnings.push(`氣泡類型「${bubble.type}」Phase 1 尚未實作,先以 speech 呈現`);
  }
  const lines = wrapText(bubble.text ?? (warnings.push('氣泡缺 text,顯示空白'), ''));
  const padX = 20, padY = 14;
  const maxUnits = Math.max(...lines.map((l) => l.units));
  const bw = maxUnits * FONT_SIZE + padX * 2;
  const bh = lines.length * LINE_H + padY * 2;

  const speaker = castPlaced.find((c) => c.entry.char === bubble.speaker);
  if (bubble.speaker && !speaker) warnings.push(`氣泡的 speaker「${bubble.speaker}」不在本格 cast 中,tail 省略`);
  const sx = speaker ? speaker.x : PANEL_W / 2;

  const bx = Math.min(Math.max(sx - bw / 2, 14), PANEL_W - 14 - bw);
  const by = cursorY;

  let tail = '';
  if (speaker) {
    const baseX = Math.min(Math.max(sx, bx + 26), bx + bw - 26);
    const tipY = speaker.headTopY - 6;
    tail = `<path d="M ${baseX - 11} ${by + bh} L ${sx} ${tipY} L ${baseX + 11} ${by + bh} Z"
                  fill="#FFFFFF" stroke="${STYLE.line}" stroke-width="3" stroke-linejoin="round"/>
            <rect x="${baseX - 9}" y="${by + bh - 2.5}" width="18" height="5" fill="#FFFFFF"/>`;
  }
  const texts = lines.map((l, i) =>
    `<text x="${bx + padX}" y="${by + padY + FONT_SIZE * 0.85 + i * LINE_H}" font-size="${FONT_SIZE}"
           fill="#2B2B2B" font-family="-apple-system,'Segoe UI','Noto Sans CJK TC','Microsoft JhengHei',sans-serif">${esc(l.text)}</text>`).join('');
  return {
    height: bh,
    svg: `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="16"
                fill="#FFFFFF" stroke="${STYLE.line}" stroke-width="3"/>${tail}${texts}`,
  };
}

function renderPanel(panel, warnings) {
  const bg = panel.bg || 'plain';
  if (bg !== 'plain') warnings.push(`背景「${bg}」Phase 1 尚未實作,改用 plain`);

  // 道具:放在角色之前(當背景陳設)。pos={x,y} 為格內比例(0~1,道具中心),scale 預設 1。
  let propsSvg = '';
  for (const it of panel.props || []) {
    const def = PROPS[it.prop];
    if (!def) { warnings.push(`未知道具「${it.prop}」,已略過(可用:${Object.keys(PROPS).join(', ')})`); continue; }
    const s = it.scale || 1;
    const pos = it.pos || { x: 0.5, y: 0.5 };
    const cx = (pos.x ?? 0.5) * PANEL_W, cy = (pos.y ?? 0.5) * PANEL_H;
    propsSvg += `<g transform="translate(${(cx - def.w * s / 2).toFixed(1)} ${(cy - def.h * s / 2).toFixed(1)}) scale(${s})">${def.svg}</g>`;
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
