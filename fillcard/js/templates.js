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
  const W = 900, headerH = 200, rowH = 192, n = 12, cx = 450;
  const ringR = 23, badgeR = 42;
  const H = headerH + n * rowH + 30;
  const months = Array.isArray(data.months) ? data.months : [];

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${TC}">`;
  s += `<defs>`;
  s += `<radialGradient id="gloss" cx="38%" cy="30%" r="80%"><stop offset="0%" stop-color="#ffffff"/><stop offset="65%" stop-color="#f3f3f1"/><stop offset="100%" stop-color="#dedcd4"/></radialGradient>`;
  s += `<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#000000" flood-opacity="0.16"/></filter>`;
  s += `</defs>`;
  s += `<rect x="0" y="0" width="${W}" height="${H}" fill="${CREAM}"/>`;

  // 標題區:上緣小標(letter-spacing)+ 大標
  s += `<text x="${cx}" y="72" text-anchor="middle" font-size="22" fill="#5B5F66" letter-spacing="3">${esc(data.subtitle)}</text>`;
  s += `<text x="${cx}" y="132" text-anchor="middle" font-family="${DISPLAY}" font-size="52" font-weight="800" fill="#2C3038" letter-spacing="1">${esc(data.title)}</text>`;

  const ringYs = [];
  for (let i = 0; i < n; i++) ringYs.push(headerH + i * rowH + 44);

  // 中央彩色連接線(逐段用該月顏色)
  for (let i = 0; i < n - 1; i++) {
    s += `<line x1="${cx}" y1="${ringYs[i]}" x2="${cx}" y2="${ringYs[i + 1]}" stroke="${COLORS[i]}" stroke-width="3"/>`;
  }

  for (let i = 0; i < n; i++) {
    const y = ringYs[i];
    const c = COLORS[i];
    const m = months[i] || {};
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
    const body = wrapLines(m.body, 20).slice(0, 4);
    body.forEach((ln, k) => {
      s += `<text x="${textX}" y="${y + 98 + k * 22}" text-anchor="${anchor}" font-size="15" fill="#565B62">${esc(ln)}</text>`;
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

export const TEMPLATES = {
  'year-timeline': {
    label: '一年 12 個月時間軸(多彩)',
    desc: '米色底直式時間軸:開口圓環 + 虛線 + 光澤編號牌;英文月份固定,標題與內文可填。',
    w: 900, h: 200 + 12 * 192 + 30,
    defaultData: YEAR_TIMELINE_SAMPLE,
    render: renderYearTimeline,
  },
};
