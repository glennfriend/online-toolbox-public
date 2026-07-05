// templates.js — Fillcard 版型庫。
//
// 每個版型 = 設計固定的 SVG,只留「插槽(slots)」給文字。插槽的字型/字級/字色/底色/間距/對齊/
// 換行都由版型寫死 → 使用者只給文字,出圖永遠對齊好看。renderer 只呼叫 tpl.render(data)。
//
// 新增版型 = 在 TEMPLATES 加一筆(label / size / defaultData / render(data)→svg 字串)。

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// CJK 換行:全形算 1、半形算 0.55;回傳整行陣列。
function wrapLines(text, maxUnits) {
  const lines = [];
  let line = '', u = 0;
  for (const ch of String(text ?? '')) {
    const w = /[\x00-\xff]/.test(ch) ? 0.55 : 1;
    if (ch === '\n' || (u + w > maxUnits && line)) { lines.push(line); line = ch === '\n' ? '' : ch; u = ch === '\n' ? 0 : w; }
    else { line += ch; u += w; }
  }
  if (line) lines.push(line);
  return lines;
}

const FONT = "'Noto Sans TC','Microsoft JhengHei','PingFang TC',sans-serif";

// ── 版型 1:一年 12 個月時間軸(多彩)───────────────────────────
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const COLORS = ['#7C6BD6', '#2FAEC6', '#F2A03D', '#EC6FA6', '#E8564B', '#54B265',
                '#4E86E0', '#B36AC9', '#E0B23C', '#E0783C', '#3FC0A3', '#6C7DDA'];

function renderYearTimeline(data) {
  const W = 760, headerH = 172, rowH = 120, n = 12, cx = 380, R = 30;
  const H = headerH + n * rowH + 24;
  const months = Array.isArray(data.months) ? data.months : [];

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}">`;
  s += `<rect x="0" y="0" width="${W}" height="${H}" rx="26" fill="#FFFFFF"/>`;
  s += `<rect x="0" y="0" width="${W}" height="${H}" rx="26" fill="none" stroke="#EEF1F5" stroke-width="2"/>`;

  // 標題區
  s += `<text x="${W / 2}" y="76" text-anchor="middle" font-size="36" font-weight="800" fill="#242830">${esc(data.title)}</text>`;
  s += `<text x="${W / 2}" y="114" text-anchor="middle" font-size="17" fill="#8A9099">${esc(data.subtitle)}</text>`;
  s += `<rect x="${W / 2 - 42}" y="132" width="84" height="4" rx="2" fill="#D3DAE2"/>`;

  // 中央脊線
  const firstY = headerH + rowH / 2, lastY = headerH + (n - 1) * rowH + rowH / 2;
  s += `<line x1="${cx}" y1="${firstY}" x2="${cx}" y2="${lastY}" stroke="#E7EAEF" stroke-width="3"/>`;

  const boxW = 300, pad = 16;
  for (let i = 0; i < n; i++) {
    const y = headerH + i * rowH + rowH / 2;
    const c = COLORS[i];
    const m = months[i] || {};
    const right = i % 2 === 0;
    const boxX = right ? cx + R + 24 : W - 30 - boxW;   // 26/30 邊距
    const near = right ? boxX : boxX + boxW;             // 靠近圓的那一邊
    const circEdge = right ? cx + R : cx - R;

    // 連接線 + 小圓點
    s += `<line x1="${circEdge}" y1="${y}" x2="${near}" y2="${y}" stroke="${c}" stroke-width="2.5"/>`;

    // 文字底色卡(該月色淡染)+ 靠圓側的色條
    const boxH = 86, by = y - boxH / 2;
    s += `<rect x="${boxX}" y="${by}" width="${boxW}" height="${boxH}" rx="12" fill="${c}" fill-opacity="0.10"/>`;
    const barX = right ? boxX : boxX + boxW - 4;
    s += `<rect x="${barX}" y="${by}" width="4" height="${boxH}" rx="2" fill="${c}"/>`;

    // 標題 + 內文(右側靠左對齊、左側靠右對齊)
    const anchor = right ? 'start' : 'end';
    const tx = right ? boxX + pad + 6 : boxX + boxW - pad - 6;
    const titleLine = wrapLines(m.title, 15)[0] || '';
    s += `<text x="${tx}" y="${by + 30}" text-anchor="${anchor}" font-size="19" font-weight="700" fill="${c}">${esc(titleLine)}</text>`;
    const body = wrapLines(m.body, 20).slice(0, 2);
    body.forEach((ln, k) => {
      s += `<text x="${tx}" y="${by + 54 + k * 20}" text-anchor="${anchor}" font-size="14" fill="#4B5158">${esc(ln)}</text>`;
    });

    // 月份圓(蓋在線與連接線上)
    s += `<circle cx="${cx}" cy="${y}" r="${R}" fill="${c}"/>`;
    s += `<circle cx="${cx}" cy="${y}" r="${R}" fill="none" stroke="#FFFFFF" stroke-width="3"/>`;
    s += `<text x="${cx}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="800" fill="#FFFFFF" letter-spacing="0.5">${MONTHS[i]}</text>`;
  }

  s += `</svg>`;
  return s;
}

const YEAR_TIMELINE_SAMPLE = {
  title: '2026 年度計畫',
  subtitle: '十二個月,一步一步完成目標',
  months: [
    { title: '啟動', body: '訂下今年三大重點,寫下想達成的樣子。' },
    { title: '打底', body: '建立每日習慣,先求穩定、不求快。' },
    { title: '學習', body: '投資一項新技能,每週固定時間練習。' },
    { title: '整理', body: '檢視進度,清掉沒必要的事與物。' },
    { title: '拓展', body: '認識新朋友、嘗試新的領域。' },
    { title: '年中檢核', body: '回顧上半年,調整下半年方向。' },
    { title: '充電', body: '安排休息與旅行,恢復精力。' },
    { title: '深化', body: '把上半年的學習做出實際成果。' },
    { title: '衝刺', body: '聚焦最重要的目標,全力推進。' },
    { title: '修正', body: '根據結果快速調整做法。' },
    { title: '收成', body: '完成年度目標,好好記錄成果。' },
    { title: '回顧', body: '慶祝、感恩,為明年鋪路。' },
  ],
};

export const TEMPLATES = {
  'year-timeline': {
    label: '一年 12 個月時間軸(多彩)',
    desc: '直式時間軸:12 個月各一個色塊,英文月份固定,標題與內文可填。',
    w: 760, h: 172 + 12 * 120 + 24,
    defaultData: YEAR_TIMELINE_SAMPLE,
    render: renderYearTimeline,
  },
};
