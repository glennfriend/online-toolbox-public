// renderer.js — JSON 劇本 → SVG 漫畫(點陣素材版)。
//
// 畫法:每格 = 一張不透明「背景」+ 若干去背「配件(items)」疊上去 + 若干「對話框(texts)」。
//   對話不用氣泡,直接白底黑字方框放在空白處(參考 raw/故事製作/對話直接用四方型白底黑字表示.jpg)。
// 素材都是點陣圖(raw/backgrounds/、raw/items/),不再向量建模。
// 錯誤容忍原則:缺欄位用預設值、未知值 fallback,全部收進 warnings 回報(絕不無聲)。

import { STYLES, STYLE_DIR, DEFAULT_STYLE, itemsOf } from './items.js';
import { BACKGROUNDS, BG_DIR } from './backgrounds.js';

const PANEL_W = 800;
const PANEL_H = 560;
const PAPER = '#FDFCF8';
const FRAME = '#2E2E2E';

const INK = '#1A1A1A';
const FONT = `-apple-system,'Segoe UI','Noto Sans CJK TC','Microsoft JhengHei',sans-serif`;
const FONT_SIZE = 25;
const LINE_H = FONT_SIZE * 1.4;
const PAD = 13;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const f1 = (n) => Number(n).toFixed(1);

// CJK 換行:依方框可容字數斷行(全形算 1、半形算 0.55),支援 \n 強制換行。
function wrapText(text, maxUnits) {
  const lines = [];
  let line = '', units = 0;
  for (const ch of String(text)) {
    const w = /[\x00-\xff]/.test(ch) ? 0.55 : 1;
    if (ch === '\n' || (units + w > maxUnits && line)) {
      lines.push(line);
      line = ch === '\n' ? '' : ch;
      units = ch === '\n' ? 0 : w;
    } else {
      line += ch; units += w;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

// 對話框:白底、細黑框、黑字,左上角定位。回傳 { svg, height }
function renderTextBox(t, cursorY, warnings) {
  const text = t.text ?? (warnings.push('對話框缺 text,顯示空白'), '');
  const align = ['left', 'center'].includes(t.align) ? t.align : 'left';
  const wFrac = clamp(t.w ?? 0.42, 0.12, 0.96);
  const boxW = wFrac * PANEL_W;
  const maxUnits = Math.max(2, Math.floor((boxW - PAD * 2) / FONT_SIZE));
  const lines = wrapText(text, maxUnits);
  const boxH = lines.length * LINE_H + PAD * 2;

  const pos = t.pos || null;
  const bx = pos ? clamp((pos.x ?? 0.03) * PANEL_W, 6, PANEL_W - 6 - boxW) : 16;
  const by = pos ? clamp((pos.y ?? 0.03) * PANEL_H, 6, PANEL_H - 6 - boxH) : cursorY;

  const tx = align === 'center' ? bx + boxW / 2 : bx + PAD;
  const anchor = align === 'center' ? 'middle' : 'start';
  const texts = lines.map((ln, i) =>
    `<text x="${f1(tx)}" y="${f1(by + PAD + FONT_SIZE * 0.82 + i * LINE_H)}" font-size="${FONT_SIZE}"
       text-anchor="${anchor}" fill="${INK}" font-family="${FONT}">${esc(ln)}</text>`).join('');

  const svg = `<rect x="${f1(bx)}" y="${f1(by)}" width="${f1(boxW)}" height="${f1(boxH)}" rx="3"
      fill="#FFFFFF" fill-opacity="0.96" stroke="${INK}" stroke-width="2"/>${texts}`;
  return { svg, height: boxH };
}

// 配件:去背點陣圖,pos={x,y}=格內比例(配件中心),scale=佔格高比例(預設 0.6),flip=水平翻轉。
function renderItem(it, style, warnings) {
  const items = itemsOf(style);
  const def = items[it.item];
  if (!def) {
    warnings.push(`畫風「${style}」沒有配件「${it.item}」,已略過(可用:${Object.keys(items).join(', ')})`);
    return '';
  }
  const scale = it.scale ?? 0.6;
  const dh = scale * PANEL_H;
  const dw = dh * (def.w / def.h);
  const pos = it.pos || { x: 0.5, y: 0.62 };
  const cx = (pos.x ?? 0.5) * PANEL_W, cy = (pos.y ?? 0.62) * PANEL_H;
  const x = cx - dw / 2, y = cy - dh / 2;
  const href = `${STYLE_DIR}${style}/items/${def.file}`;
  const img = `<image href="${href}" x="${f1(x)}" y="${f1(y)}" width="${f1(dw)}" height="${f1(dh)}" preserveAspectRatio="xMidYMid meet"/>`;
  return it.flip ? `<g transform="translate(${f1(2 * cx)} 0) scale(-1 1)">${img}</g>` : img;
}

function renderPanel(panel, style, warnings, idx = 0) {
  // 背景(完全不透明,鋪滿一格)
  const bg = panel.bg || 'plain';
  let bgLayer = `<rect x="0" y="0" width="${PANEL_W}" height="${PANEL_H}" fill="${PAPER}"/>`;
  if (bg !== 'plain') {
    const def = BACKGROUNDS[bg];
    if (def) {
      bgLayer = `<image href="${BG_DIR}${def.file}" x="0" y="0" width="${PANEL_W}" height="${PANEL_H}" preserveAspectRatio="xMidYMid slice"/>`;
    } else {
      warnings.push(`未知背景「${bg}」,改用 plain(可用:${Object.keys(BACKGROUNDS).join(', ')})`);
    }
  }

  // 配件(依陣列順序疊,後者在上)
  const items = (panel.items || []).map((it) => renderItem(it, style, warnings)).join('');

  // 對話框(未給 pos 者由上而下自動堆疊)
  let texts = '', cursorY = 16;
  for (const t of panel.texts || []) {
    const r = renderTextBox(t, cursorY, warnings);
    texts += r.svg;
    if (!t.pos) cursorY += r.height + 10;
  }

  const clip = `panelclip${idx}`;
  return `
    <clipPath id="${clip}"><rect x="4" y="4" width="${PANEL_W - 8}" height="${PANEL_H - 8}" rx="12"/></clipPath>
    <g clip-path="url(#${clip})">
      ${bgLayer}
      ${items}
      ${texts}
    </g>
    <rect x="4" y="4" width="${PANEL_W - 8}" height="${PANEL_H - 8}" rx="12"
          fill="none" stroke="${FRAME}" stroke-width="3"/>`;
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
  let style = script.style || DEFAULT_STYLE;
  if (!STYLES[style]) { warnings.push(`未知畫風「${style}」,改用 ${DEFAULT_STYLE}(可用:${Object.keys(STYLES).join(', ')})`); style = DEFAULT_STYLE; }
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
    return `<g transform="translate(${col * PANEL_W} ${row * PANEL_H})">${renderPanel(p, style, warnings, i)}</g>`;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${cells}</svg>`;
  return { svg, warnings };
}
