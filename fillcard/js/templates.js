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

const TC = "'Noto Sans TC','Microsoft JhengHei','PingFang TC',sans-serif";
const DISPLAY = "'Anton','Noto Sans TC',sans-serif";   // 英文展示字(月份/大標),OFL 開源

// ── 版型 1:一年 12 個月專案時間軸(米色底、開口圓環、光澤編號牌)──────────
const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
                'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const COLORS = ['#3E8E9C', '#E0662E', '#2C3038', '#4E86E0', '#C0492E', '#4B8B5A',
                '#9B5BA5', '#D9982F', '#3E8E9C', '#E0662E', '#2C3038', '#4B8B5A'];
const CREAM = '#F4F1DE';

function renderYearTimeline(data) {
  const W = 900, headerH = 200, n = 12, cx = 450;
  const ringR = 23, badgeR = 42, lineH = 22;
  const months = Array.isArray(data.months) ? data.months : [];

  // 逐列動態高度:內文多的列自動變高(不截斷、也不浪費空白)。先算每列的環心 y 與內文行。
  const rows = [];
  let cursor = headerH;
  for (let i = 0; i < n; i++) {
    const m = months[i] || {};
    const bodyLines = wrapLines(m.body, 20).slice(0, 14);
    const ringY = cursor + 34;
    rows.push({ ringY, bodyLines, m });
    cursor = ringY + 96 + bodyLines.length * lineH + 24;   // 此列底 = 下一列起點
  }
  const H = cursor + 12;

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${TC}">`;
  s += `<defs>`;
  s += `<radialGradient id="gloss" cx="38%" cy="30%" r="80%"><stop offset="0%" stop-color="#ffffff"/><stop offset="65%" stop-color="#f3f3f1"/><stop offset="100%" stop-color="#dedcd4"/></radialGradient>`;
  s += `<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#000000" flood-opacity="0.16"/></filter>`;
  s += `</defs>`;
  s += `<rect x="0" y="0" width="${W}" height="${H}" fill="${CREAM}"/>`;

  // 標題區:上緣小標(letter-spacing)+ 大標
  s += `<text x="${cx}" y="72" text-anchor="middle" font-size="22" fill="#5B5F66" letter-spacing="3">${esc(data.subtitle)}</text>`;
  s += `<text x="${cx}" y="132" text-anchor="middle" font-family="${DISPLAY}" font-size="52" font-weight="800" fill="#2C3038" letter-spacing="1">${esc(data.title)}</text>`;

  // 中央彩色連接線(逐段用該月顏色)
  for (let i = 0; i < n - 1; i++) {
    s += `<line x1="${cx}" y1="${rows[i].ringY}" x2="${cx}" y2="${rows[i + 1].ringY}" stroke="${COLORS[i]}" stroke-width="3"/>`;
  }

  for (let i = 0; i < n; i++) {
    const y = rows[i].ringY;
    const c = COLORS[i];
    const m = rows[i].m;
    const right = i % 2 === 0;                 // 一月在右,二月在左,交替
    const badgeX = right ? W - 66 : 66;
    const textX = right ? cx + ringR + 34 : cx - ringR - 34;
    const anchor = right ? 'start' : 'end';

    // 虛線(圓環 → 編號牌)
    const dx1 = right ? cx + ringR : cx - ringR;
    const dx2 = right ? badgeX - badgeR : badgeX + badgeR;
    s += `<line x1="${dx1}" y1="${y}" x2="${dx2}" y2="${y}" stroke="${c}" stroke-width="2.5" stroke-dasharray="2 7" stroke-linecap="round"/>`;

    // 光澤編號牌
    s += `<circle cx="${badgeX}" cy="${y}" r="${badgeR}" fill="url(#gloss)" filter="url(#soft)"/>`;
    s += `<circle cx="${badgeX}" cy="${y}" r="${badgeR - 7}" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.7"/>`;
    s += `<text x="${badgeX}" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="${DISPLAY}" font-size="30" font-weight="800" fill="${c}">${i + 1}</text>`;

    // 開口圓環(蓋在線上)
    s += `<circle cx="${cx}" cy="${y}" r="${ringR}" fill="${CREAM}" stroke="${c}" stroke-width="5"/>`;

    // 月份大標(彩色展示字)+ 標題(深色粗)+ 內文(灰)
    s += `<text x="${textX}" y="${y + 40}" text-anchor="${anchor}" font-family="${DISPLAY}" font-size="30" font-weight="800" fill="${c}" letter-spacing="1">${MONTHS[i]}</text>`;
    const titleLine = wrapLines(m.title, 16)[0] || '';
    s += `<text x="${textX}" y="${y + 72}" text-anchor="${anchor}" font-size="21" font-weight="700" fill="#2C3038">${esc(titleLine)}</text>`;
    rows[i].bodyLines.forEach((ln, k) => {
      s += `<text x="${textX}" y="${y + 98 + k * lineH}" text-anchor="${anchor}" font-size="15" fill="#565B62">${esc(ln)}</text>`;
    });
  }

  s += `</svg>`;
  return s;
}

const YEAR_TIMELINE_SAMPLE = {
  title: '12-MONTH PROJECT JOURNEY',
  subtitle: '一年份的專案旅程',
  months: [
    { title: '啟動', body: '訂下今年三大重點,寫下想達成的樣子與衡量方式。' },
    { title: '打底', body: '建立每日習慣與流程,先求穩定、不求快。' },
    { title: '學習', body: '投資一項新技能,每週固定時間刻意練習。' },
    { title: '整理', body: '檢視進度,清掉沒必要的事與物,聚焦重點。' },
    { title: '拓展', body: '認識新朋友、嘗試新的領域與合作機會。' },
    { title: '年中檢核', body: '回顧上半年成果,調整下半年的方向。' },
    { title: '充電', body: '安排休息與旅行,恢復精力再出發。' },
    { title: '深化', body: '把上半年的學習做出實際、可展示的成果。' },
    { title: '衝刺', body: '聚焦最重要的目標,集中資源全力推進。' },
    { title: '修正', body: '根據結果快速調整做法,不戀棧無效的路。' },
    { title: '收成', body: '完成年度目標,好好記錄與整理成果。' },
    { title: '回顧', body: '慶祝、感恩,總結經驗為明年鋪路。' },
  ],
};

// ── 版型 2:一年 12 個月色塊卡(白底、實心月份圓、淡染色塊,左右交替)──────────
const CARD_COLORS = ['#7C6BD6', '#2FAEC6', '#F2A03D', '#EC6FA6', '#E8564B', '#54B265',
                     '#4E86E0', '#B36AC9', '#E0B23C', '#E0783C', '#3FC0A3', '#6C7DDA'];
const ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function renderYearCards(data) {
  const W = 900, headerH = 150, n = 12, cx = 450;
  const circR = 30, boxW = 360, lineH = 20;
  const months = Array.isArray(data.months) ? data.months : [];

  // 逐列動態高度:色塊高度依內文行數自動撐開(不截斷、不浪費空白)。
  const rows = [];
  let cursor = headerH;
  for (let i = 0; i < n; i++) {
    const m = months[i] || {};
    const bodyLines = wrapLines(m.body, 22).slice(0, 10);
    const boxH = 18 + 26 + bodyLines.length * lineH + 16;
    const ringY = cursor + boxH / 2;
    rows.push({ ringY, boxH, bodyLines, m });
    cursor = cursor + boxH + 26;   // + 列距
  }
  const H = cursor + 8;

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${TC}">`;
  s += `<rect x="0" y="0" width="${W}" height="${H}" rx="26" fill="#FFFFFF"/>`;
  s += `<rect x="0" y="0" width="${W}" height="${H}" rx="26" fill="none" stroke="#EEF1F5" stroke-width="2"/>`;

  // 標題區
  s += `<text x="${cx}" y="70" text-anchor="middle" font-size="38" font-weight="800" fill="#242830">${esc(data.title)}</text>`;
  s += `<text x="${cx}" y="106" text-anchor="middle" font-size="17" fill="#8A9099">${esc(data.subtitle)}</text>`;
  s += `<rect x="${cx - 42}" y="122" width="84" height="4" rx="2" fill="#D3DAE2"/>`;

  // 中央脊線(淡灰)
  s += `<line x1="${cx}" y1="${rows[0].ringY}" x2="${cx}" y2="${rows[n - 1].ringY}" stroke="#E7EAEF" stroke-width="3"/>`;

  for (let i = 0; i < n; i++) {
    const { ringY: y, boxH, bodyLines, m } = rows[i];
    const c = CARD_COLORS[i];
    const right = i % 2 === 0;                       // 一月右,二月左,交替
    const boxX = right ? cx + circR + 24 : 36;
    const boxTop = y - boxH / 2;
    const near = right ? boxX : boxX + boxW;         // 靠圓那側
    const circEdge = right ? cx + circR : cx - circR;

    // 連接線 + 色塊 + 靠圓側色條
    s += `<line x1="${circEdge}" y1="${y}" x2="${near}" y2="${y}" stroke="${c}" stroke-width="2.5"/>`;
    s += `<rect x="${boxX}" y="${boxTop}" width="${boxW}" height="${boxH}" rx="12" fill="${c}" fill-opacity="0.10"/>`;
    const barX = right ? boxX : boxX + boxW - 4;
    s += `<rect x="${barX}" y="${boxTop}" width="4" height="${boxH}" rx="2" fill="${c}"/>`;

    // 標題 + 內文(右側靠左、左側靠右)
    const anchor = right ? 'start' : 'end';
    const tx = right ? boxX + 20 : boxX + boxW - 20;
    const titleLine = wrapLines(m.title, 16)[0] || '';
    s += `<text x="${tx}" y="${boxTop + 32}" text-anchor="${anchor}" font-size="20" font-weight="700" fill="${c}">${esc(titleLine)}</text>`;
    bodyLines.forEach((ln, k) => {
      s += `<text x="${tx}" y="${boxTop + 56 + k * lineH}" text-anchor="${anchor}" font-size="14.5" fill="#4B5158">${esc(ln)}</text>`;
    });

    // 月份實心圓(白字縮寫)
    s += `<circle cx="${cx}" cy="${y}" r="${circR}" fill="${c}"/>`;
    s += `<circle cx="${cx}" cy="${y}" r="${circR}" fill="none" stroke="#FFFFFF" stroke-width="3"/>`;
    s += `<text x="${cx}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="800" fill="#FFFFFF" letter-spacing="0.5">${ABBR[i]}</text>`;
  }

  s += `</svg>`;
  return s;
}

const YEAR_CARDS_SAMPLE = {
  title: '2026 年度計畫',
  subtitle: '十二個月,一步一步完成目標',
  months: YEAR_TIMELINE_SAMPLE.months,
};

export const TEMPLATES = {
  'year-timeline': {
    label: '十二個月 米白色',
    desc: '米色底直式時間軸:開口圓環 + 虛線 + 光澤編號牌;英文月份固定,標題與內文可填。',
    w: 900, h: 200 + 12 * 192 + 30,
    defaultData: YEAR_TIMELINE_SAMPLE,
    render: renderYearTimeline,
  },
  'year-cards': {
    label: '十二個月 彩色',
    desc: '白底、實心月份圓、淡染色塊,左右交替;Noto Sans TC 字型。標題與內文可填。',
    w: 900, h: 0,
    defaultData: YEAR_CARDS_SAMPLE,
    render: renderYearCards,
  },
};
