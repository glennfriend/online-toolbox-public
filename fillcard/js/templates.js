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

// ── 版型 3:各年度 黑白(手繪風時間軸)──────────────────────────────
const MARKER = "'Permanent Marker','Noto Sans TC',cursive";
const HAND = "'Gochi Hand','Noto Sans TC',cursive";
const POP = "'Poppins','Noto Sans TC','Microsoft JhengHei',sans-serif";  // 圓潤粗體(標題/內文),OFL
const SCRIPT = "'Kaushan Script','Noto Sans TC',cursive";                // 手寫花體(小標語),OFL

// 決定性小抖動(不用亂數 → 同資料同結果),做手繪歪斜感。
const jit = (seed, k) => Math.sin(seed * 12.9898 + k * 78.233) * 2.6;
// 手繪歪斜方框 path(白底黑框感):四角微抖 + 四邊微彎。
function sketchRect(x, y, w, h, seed) {
  const A = [x + jit(seed, 1), y + jit(seed, 2)];
  const B = [x + w + jit(seed, 3), y + jit(seed, 4)];
  const C = [x + w + jit(seed, 5), y + h + jit(seed, 6)];
  const D = [x + jit(seed, 7), y + h + jit(seed, 8)];
  const mid = (p, q, ox, oy) => [(p[0] + q[0]) / 2 + ox, (p[1] + q[1]) / 2 + oy];
  const f = (n) => Number(n).toFixed(1);
  const seg = (p, m, q) => `Q ${f(m[0])} ${f(m[1])} ${f(q[0])} ${f(q[1])} `;
  return `M ${f(A[0])} ${f(A[1])} `
    + seg(A, mid(A, B, 0, jit(seed, 9) - 1.5), B)
    + seg(B, mid(B, C, jit(seed, 10) + 1.5, 0), C)
    + seg(C, mid(C, D, 0, jit(seed, 11) + 1.5), D)
    + seg(D, mid(D, A, jit(seed, 12) - 1.5, 0), A) + 'Z';
}

function renderYearsBW(data) {
  const W = 800, cx = 400, circR = 26, headerH = 236, boxW = 138, boxH = 62, gap = 18, lineH = 20;
  const items = Array.isArray(data.items) ? data.items : [];
  const n = items.length || 1;

  // 逐列動態高度:圓點/年份/標題對齊在「列頂」,內文往下流(內文多不會往上壓到標題/表頭)
  const rows = [];
  let cursor = headerH;
  for (let i = 0; i < n; i++) {
    const it = items[i] || {};
    const bodyLines = wrapLines(it.body, 19).slice(0, 14);   // 19:讓右/左欄的字不會越過中軸
    const ringY = cursor + 26;
    const bottom = Math.max(ringY + 32 + bodyLines.length * lineH, ringY + boxH / 2) + 14;
    rows.push({ ringY, bodyLines, it });
    cursor = bottom + gap;
  }
  const lastY = rows[n - 1].ringY;
  const arrowY = lastY + 54;
  const H = arrowY + 70;

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${HAND}">`;
  s += `<rect x="0" y="0" width="${W}" height="${H}" fill="#FFFFFF"/>`;

  // 標題
  s += `<text x="${cx}" y="130" text-anchor="middle" font-family="${MARKER}" font-size="62" fill="#222222">${esc(data.title)}</text>`;
  s += `<text x="${cx}" y="182" text-anchor="middle" font-size="27" fill="#3A3A3A">${esc(data.subtitle)}</text>`;

  // 手繪塗鴉裝飾(黑白)
  s += `<path d="M96 150 q -26 -20 -4 -34 q 22 -14 30 10 q 7 26 -22 24 q -30 -3 -20 -30" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linecap="round"/>`;
  const sp = (x, y, r) => `<path d="M${x} ${y - r} L${x + r * 0.28} ${y - r * 0.28} L${x + r} ${y} L${x + r * 0.28} ${y + r * 0.28} L${x} ${y + r} L${x - r * 0.28} ${y + r * 0.28} L${x - r} ${y} L${x - r * 0.28} ${y - r * 0.28} Z" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linejoin="round"/>`;
  s += sp(W - 96, 138, 15) + sp(W - 126, 180, 9);
  s += `<path d="M${W - 150} ${H - 70} q 18 -22 36 0 q 18 22 36 0 q 18 -22 36 0" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linecap="round"/>`;

  // 起點圓點 + 虛線主軸 + 底部箭頭
  const startY = rows[0].ringY - 48;
  s += `<circle cx="${cx}" cy="${startY}" r="5" fill="#1c1c1c"/>`;
  s += `<line x1="${cx}" y1="${startY}" x2="${cx}" y2="${arrowY}" stroke="#1c1c1c" stroke-width="2.5" stroke-dasharray="2 9" stroke-linecap="round"/>`;
  s += `<path d="M${cx - 9} ${arrowY - 12} L${cx} ${arrowY} L${cx + 9} ${arrowY - 12}" fill="none" stroke="#1c1c1c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;

  for (let i = 0; i < n; i++) {
    const { ringY: y, bodyLines, it } = rows[i];
    const boxLeft = i % 2 === 0;                    // 第一項(2023)方框在左,交替
    const shade = Math.round(232 - (192) * (n <= 1 ? 0 : i / (n - 1)));  // 由淺到深
    const fillC = `rgb(${shade},${shade},${shade})`;

    // 年份方框(手繪)+ 連接線
    const boxX = boxLeft ? cx - circR - 42 - boxW : cx + circR + 42;
    const boxY = y - boxH / 2;
    const connFrom = boxLeft ? cx - circR : cx + circR;
    const connTo = boxLeft ? boxX + boxW : boxX;
    s += `<line x1="${connFrom}" y1="${y}" x2="${connTo}" y2="${y}" stroke="#1c1c1c" stroke-width="2"/>`;
    s += `<path d="${sketchRect(boxX, boxY, boxW, boxH, i + 1)}" fill="#FFFFFF" stroke="#1c1c1c" stroke-width="2.4" stroke-linejoin="round"/>`;
    s += `<text x="${boxX + boxW / 2}" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="${HAND}" font-size="30" fill="#1c1c1c">${esc(it.year)}</text>`;

    // 文字(對側):標題(粗)+ 內文
    const textLeft = !boxLeft;                       // 方框左 → 文字右
    const tx = textLeft ? 40 : W - 40;
    const anchor = textLeft ? 'start' : 'end';
    const titleLine = wrapLines(it.title, 13)[0] || '';
    s += `<text x="${tx}" y="${y + 7}" text-anchor="${anchor}" font-size="24" font-weight="700" fill="#1c1c1c">${esc(titleLine)}</text>`;
    bodyLines.forEach((ln, k) => {
      s += `<text x="${tx}" y="${y + 34 + k * lineH}" text-anchor="${anchor}" font-size="14.5" fill="#555555">${esc(ln)}</text>`;
    });

    // 圓點(灰階由淺到深)
    s += `<circle cx="${cx}" cy="${y}" r="${circR}" fill="${fillC}" stroke="#1c1c1c" stroke-width="2.5"/>`;
  }

  if (data.footer) s += `<text x="${cx}" y="${H - 26}" text-anchor="middle" font-size="20" fill="#2b2b2b" letter-spacing="1">${esc(data.footer)}</text>`;
  s += `</svg>`;
  return s;
}

const YEARS_BW_SAMPLE = {
  title: 'CHRONOLOGY',
  subtitle: '公司大事記',
  footer: 'yourcompany.com',
  items: [
    { year: '2023', title: '公司成立', body: '三個朋友在車庫寫下第一行程式,踏出第一步。' },
    { year: '2024', title: '團隊擴編', body: '夥伴從 3 人成長到 20 人,建立核心團隊。' },
    { year: '2025', title: '產品上線', body: '第一個正式版本推出,獲得市場好評。' },
    { year: '2026', title: '獲得投資', body: '完成 A 輪募資,加速產品與市場拓展。' },
    { year: '2027', title: '拓展海外', body: '進軍東南亞,服務跨出台灣。' },
    { year: '2028', title: '用戶破百萬', body: '全球活躍用戶正式突破一百萬。' },
    { year: '2029', title: '獲頒大獎', body: '榮獲年度最佳新創,受到業界肯定。' },
    { year: '2030', title: '邁向全球', body: '服務覆蓋全球五十國,持續前進。' },
  ],
};

// ── 版型 4:Step by Step(手繪橫向步驟時間軸,3–7 步)──────────────────
const STEP_FILL = ['#C7D6F5', '#B6E5E0', '#CDE9A6', '#FBE08A', '#F8C6A6', '#F9C2E0', '#DAC6F2'];
const STEP_STRONG = ['#6E8FE0', '#46B8AE', '#7CC24A', '#F4C020', '#EE8A56', '#EE79B8', '#A97BE0'];

function renderSteps(data) {
  const steps = Array.isArray(data.steps) ? data.steps : [];
  const n = Math.max(1, steps.length);
  const cardW = 220, gap = 26, marginX = 46, headerH = 224, lineH = 18;
  const W = marginX * 2 + n * cardW + (n - 1) * gap;

  // 統一卡片高度(取內文最多的那張)→ 整排對齊、箭頭與軸線也齊
  let maxBody = 1;
  const perBody = steps.map((st) => { const b = wrapLines(st.body, 13).slice(0, 8); if (b.length > maxBody) maxBody = b.length; return b; });
  const cardTop = headerH;
  const cardBottom = cardTop + 90 + maxBody * lineH + 16;
  const arrowTop = cardBottom + 16, arrowBot = arrowTop + 44;
  const axisY = arrowBot + 26, yearY = axisY + 36, H = axisY + 62;

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${HAND}">`;
  s += `<defs><pattern id="grid" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M26 0 H0 V26" fill="none" stroke="#e6e8ec" stroke-width="1"/></pattern></defs>`;
  s += `<rect width="${W}" height="${H}" fill="#FBFBF9"/><rect width="${W}" height="${H}" fill="url(#grid)"/>`;

  // 標題 + 黃底副標
  s += `<text x="${W / 2}" y="112" text-anchor="middle" font-size="60" fill="#2b2b2b">${esc(data.title)}</text>`;
  const subW = Math.max(160, (String(data.subtitle || '').length) * 17 + 44);
  s += `<rect x="${W / 2 - subW / 2}" y="140" width="${subW}" height="34" rx="17" fill="#FBE08A"/>`;
  s += `<text x="${W / 2}" y="163" text-anchor="middle" font-size="19" fill="#3A3A3A">${esc(data.subtitle)}</text>`;

  // 底部軸線 + 右箭頭
  s += `<line x1="${marginX - 12}" y1="${axisY}" x2="${W - marginX + 20}" y2="${axisY}" stroke="#1c1c1c" stroke-width="3" stroke-linecap="round"/>`;
  s += `<path d="M${W - marginX + 12} ${axisY - 8} L${W - marginX + 28} ${axisY} L${W - marginX + 12} ${axisY + 8}" fill="none" stroke="#1c1c1c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;

  for (let i = 0; i < n; i++) {
    const st = steps[i] || {};
    const fill = STEP_FILL[i % 7], strong = STEP_STRONG[i % 7];
    const x = marginX + i * (cardW + gap);
    const cxi = x + cardW / 2;
    const cardH = cardBottom - cardTop;

    // 卡片陰影(同色深)+ 手繪卡片
    s += `<path d="${sketchRect(x + 7, cardTop + 10, cardW, cardH, i + 20)}" fill="${strong}" opacity="0.9"/>`;
    s += `<path d="${sketchRect(x, cardTop, cardW, cardH, i + 1)}" fill="${fill}" stroke="#2b2b2b" stroke-width="2.4" stroke-linejoin="round"/>`;

    // 頂端編號圓(壓在卡片上緣)
    s += `<circle cx="${cxi}" cy="${cardTop + 2}" r="33" fill="${strong}" stroke="#2b2b2b" stroke-width="2.5"/>`;
    s += `<text x="${cxi}" y="${cardTop + 2}" text-anchor="middle" dominant-baseline="central" font-size="34" fill="#1c1c1c">${i + 1}</text>`;

    // 標題 + 內文(置中)
    const titleLine = wrapLines(st.title, 12)[0] || '';
    s += `<text x="${cxi}" y="${cardTop + 64}" text-anchor="middle" font-size="21" font-weight="700" fill="#2b2b2b">${esc(titleLine)}</text>`;
    (perBody[i] || []).forEach((ln, k) => {
      s += `<text x="${cxi}" y="${cardTop + 90 + k * lineH}" text-anchor="middle" font-size="13.5" fill="#4a4a4a">${esc(ln)}</text>`;
    });

    // 向下箭頭
    const hh = 20, hw = 17, sw = 7;
    s += `<path d="M${cxi - sw} ${arrowTop} L${cxi + sw} ${arrowTop} L${cxi + sw} ${arrowBot - hh} L${cxi + hw} ${arrowBot - hh} L${cxi} ${arrowBot} L${cxi - hw} ${arrowBot - hh} L${cxi - sw} ${arrowBot - hh} Z" fill="${strong}" stroke="#2b2b2b" stroke-width="2" stroke-linejoin="round"/>`;

    // 軸上節點 + 年份
    s += `<circle cx="${cxi}" cy="${axisY}" r="9" fill="${strong}" stroke="#1c1c1c" stroke-width="2.5"/>`;
    s += `<text x="${cxi}" y="${yearY + 8}" text-anchor="middle" font-size="26" fill="#2b2b2b">${esc(st.year)}</text>`;
  }

  s += `</svg>`;
  return s;
}

const STEPS_SAMPLE = {
  title: 'TIMELINE',
  subtitle: '公司大事記',
  steps: [
    { year: '2024', title: '起步', body: '三個工程師從一個點子開始創業。' },
    { year: '2025', title: '調查', body: '研究市場、分析需求與競爭對手。' },
    { year: '2026', title: '規劃', body: '團隊組建、訂定目標與路線圖。' },
    { year: '2027', title: '創新', body: '推出第一個技術產品,獲得好評。' },
    { year: '2028', title: '創意', body: '開發提升兒童創造力的數位方案。' },
    { year: '2029', title: '獲獎', body: '榮獲年度最佳軟體大獎。' },
    { year: '2030', title: '健康', body: '為醫療院所打造 AI 解決方案。' },
  ],
};

// ── 版型 5:Step 3-10(手繪箭頭色帶,上下交替卡片)──────────────────
const CHEV_STRONG = ['#6E8FE0', '#46B8AE', '#7CC24A', '#A6BE48', '#F4C020', '#D2A05A', '#EE8A56', '#E0625C', '#EE79B8', '#A97BE0'];
const CHEV_FILL = ['#C7D6F5', '#B6E5E0', '#CDE9A6', '#DEE7A6', '#FBE08A', '#ECD6B4', '#F8C6A6', '#F3B4B0', '#F9C2E0', '#DAC6F2'];

// 手繪捲曲箭頭:bar↔卡片。yFrom 靠近色帶,yTo 靠近卡片(可上可下)。
function curlyArrow(cx, yFrom, yTo) {
  const up = yTo < yFrom;
  const midY = (yFrom + yTo) / 2;
  const p = `M ${cx + 9} ${yFrom} C ${cx + 20} ${midY} ${cx - 17} ${midY} ${cx - 2} ${yTo}`;
  const head = up
    ? `M ${cx - 10} ${yTo + 13} L ${cx - 2} ${yTo} L ${cx + 7} ${yTo + 12}`
    : `M ${cx - 10} ${yTo - 13} L ${cx - 2} ${yTo} L ${cx + 7} ${yTo - 12}`;
  return `<path d="${p}" fill="none" stroke="#2b2b2b" stroke-width="2.3" stroke-linecap="round"/>`
    + `<path d="${head}" fill="none" stroke="#2b2b2b" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function renderChevron(data) {
  const items = Array.isArray(data.items) ? data.items : [];
  const n = Math.max(1, items.length);
  const segW = 172, notch = 24, marginX = 42, barHalf = 38, titleBoxH = 42, lineH = 20, arrowGap = 62;
  const stride = segW - notch;
  const W = marginX * 2 + (n - 1) * stride + segW;

  let maxBody = 1;
  const perBody = items.map((it) => { const b = wrapLines(it.body, 14).slice(0, 6); if (b.length > maxBody) maxBody = b.length; return b; });
  const cardH = titleBoxH + 24 + maxBody * lineH;
  const headerH = 172;
  const barTop = headerH + cardH + arrowGap;
  const barY = barTop + barHalf, barBottom = barY + barHalf * 2;
  const belowTop = barBottom + arrowGap;
  const H = belowTop + cardH + 28;

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${HAND}">`;
  s += `<defs><pattern id="gridc" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M26 0 H0 V26" fill="none" stroke="#e6e8ec" stroke-width="1"/></pattern></defs>`;
  s += `<rect width="${W}" height="${H}" fill="#FBFBF9"/><rect width="${W}" height="${H}" fill="url(#gridc)"/>`;

  // 標題 + 黃底副標
  const subW = Math.max(150, String(data.subtitle || '').length * 17 + 40);
  s += `<rect x="${W / 2 - subW / 2}" y="28" width="${subW}" height="32" rx="16" fill="#FBE08A"/>`;
  s += `<text x="${W / 2}" y="50" text-anchor="middle" font-size="18" fill="#3A3A3A">${esc(data.subtitle)}</text>`;
  const titleLen = Math.max(1, String(data.title || '').length);
  const titleFont = Math.max(24, Math.min(54, (W - marginX * 2 - 24) / titleLen / 0.55));
  s += `<text x="${W / 2}" y="118" text-anchor="middle" font-size="${titleFont.toFixed(1)}" fill="#2b2b2b">${esc(data.title)}</text>`;

  const T = barY - barHalf, B = barY + barHalf, M = barY;
  for (let i = 0; i < n; i++) {
    const it = items[i] || {};
    const strong = CHEV_STRONG[i % 10], fill = CHEV_FILL[i % 10];
    const segX = marginX + i * stride;
    const cx = segX + stride / 2;
    const above = i % 2 === 0;

    // 箭頭色帶段(左凹槽、右尖;第一段左邊平)
    let d = `M ${segX} ${T} L ${segX + segW - notch} ${T} L ${segX + segW} ${M} L ${segX + segW - notch} ${B} L ${segX} ${B} `;
    d += i === 0 ? 'Z' : `L ${segX + notch} ${M} Z`;
    s += `<path d="${d}" fill="${strong}" stroke="#2b2b2b" stroke-width="2"/>`;
    s += `<text x="${cx}" y="${M}" text-anchor="middle" dominant-baseline="central" font-size="27" fill="#2b2b2b">${esc(it.year)}</text>`;

    // 卡片(上或下):標題方框 + 內文 + 捲曲箭頭
    const boxTop = above ? headerH : belowTop;
    const boxW = segW - 4;
    s += `<path d="${sketchRect(cx - boxW / 2, boxTop, boxW, titleBoxH, i + 30)}" fill="${fill}" stroke="#2b2b2b" stroke-width="2.2" stroke-linejoin="round"/>`;
    const titleLine = wrapLines(it.title, 11)[0] || '';
    s += `<text x="${cx}" y="${boxTop + titleBoxH / 2 + 6}" text-anchor="middle" font-size="20" font-weight="700" fill="#2b2b2b">${esc(titleLine)}</text>`;
    (perBody[i] || []).forEach((ln, k) => {
      s += `<text x="${cx}" y="${boxTop + titleBoxH + 24 + k * lineH}" text-anchor="middle" font-size="13.5" fill="#4a4a4a">${esc(ln)}</text>`;
    });
    if (above) s += curlyArrow(cx, barTop - 3, headerH + cardH + 3);
    else s += curlyArrow(cx, barBottom + 3, belowTop - 3);
  }

  s += `</svg>`;
  return s;
}

const CHEVRON_SAMPLE = {
  title: 'HISTORICAL INFOGRAPHIC',
  subtitle: '公司大事記',
  items: [
    { year: '2021', title: '起步', body: '三位工程師從一個創意點子開始創業。' },
    { year: '2022', title: '調查', body: '專注研究、分析市場與目標客群。' },
    { year: '2023', title: '規劃', body: '團隊組建與訓練、訂定目標與路線圖。' },
    { year: '2024', title: '創新', body: '推出第一個面向大學的技術專案。' },
    { year: '2025', title: '創意', body: '開發提升兒童創造力的數位方案。' },
    { year: '2026', title: '獲獎', body: '以最佳健康 App 榮獲軟體開發大獎。' },
    { year: '2027', title: '教育', body: '團隊擴編,投入教育領域的應用。' },
    { year: '2028', title: '發展', body: '推出學校與托育中心的解決方案。' },
    { year: '2029', title: '新聞', body: '導入資料分析與 AI 演算法。' },
    { year: '2030', title: '健康', body: '為醫療院所打造 AI 解決方案。' },
  ],
};

// ── 版型 6:圓圈嵌圖(Simply Circle Image)──────────────────────────
//   深綠橫條 + 左右交替的圓形圖章;圓圈可嵌圖(item.img),圖自動裁成圓形。
//   img 建議用 data: URI(可正常匯出 PNG);一般網址只能預覽(跨網域會使 PNG 匯出失敗)。
const CI_CREAM = '#F4EFC7', CI_ORANGE = '#FBCF74', CI_DEEP = '#1C5E45', CI_BAR = '#2E7D5F';

// 空圖時的「相片」佔位圖示(讓圓圈即使沒放圖也像刻意的設計)。
function ciPhotoIcon(cx, cy) {
  const g = '#8FBFA6';
  return `<rect x="${cx - 24}" y="${cy - 18}" width="48" height="36" rx="6" fill="none" stroke="${g}" stroke-width="3.4"/>`
    + `<circle cx="${cx - 9}" cy="${cy - 6}" r="4.6" fill="${g}"/>`
    + `<path d="M ${cx - 22} ${cy + 15} L ${cx - 6} ${cy - 2} L ${cx + 3} ${cy + 7} L ${cx + 11} ${cy - 3} L ${cx + 22} ${cy + 13} Z" fill="${g}"/>`;
}

// 圓形圖章:底 + (裁成圓的圖 或 佔位圖示) + 外環。
function ciCircle(cx, cy, r, img, seed) {
  const id = 'ci' + seed;
  const src = String(img ?? '').replace(/"/g, '');
  let o = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${CI_CREAM}"/>`;
  if (src) {
    o += `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r - 5}"/></clipPath>`;
    o += `<image href="${esc(src)}" x="${cx - (r - 5)}" y="${cy - (r - 5)}" width="${2 * (r - 5)}" height="${2 * (r - 5)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`;
  } else {
    o += ciPhotoIcon(cx, cy);
  }
  o += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${CI_DEEP}" stroke-width="5"/>`;
  return o;
}

function renderCircleImage(data) {
  const items = Array.isArray(data.items) ? data.items : [];
  const W = 800, marginX = 40, R = 62;
  const barX = marginX, barW = W - marginX * 2;

  // ── 版面計算 ──
  const rows = items.map((it, i) => {
    const titleLines = wrapLines(it.title, 20).slice(0, 2);
    const bodyLines = wrapLines(it.body, 33).slice(0, 3);
    const blockH = titleLines.length * 31 + (bodyLines.length ? 8 + bodyLines.length * 22 : 0);
    const rowH = Math.max(104, blockH + 44);
    return { it, i, titleLines, bodyLines, blockH, rowH };
  });

  const headerH = 250, ruleH = 12, bodyTop = headerH + ruleH + 26, rowGap = 18;
  let cursor = bodyTop;
  rows.forEach((r) => { r.y = cursor; cursor += r.rowH + rowGap; });
  const footerH = 58;
  const H = cursor - rowGap + footerH;

  // ── 底色:整張橘 + 上方奶油色頁首 ──
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${POP}">`;
  s += `<rect width="${W}" height="${H}" fill="${CI_ORANGE}"/>`;
  s += `<rect width="${W}" height="${headerH}" fill="${CI_CREAM}"/>`;
  s += `<rect y="${headerH}" width="${W}" height="${ruleH}" fill="${CI_DEEP}"/>`;

  // ── 頁首:花體小標語 + 大標題(字級隨長度縮放,不溢出)──
  const script = String(data.script ?? '');
  const title = String(data.title ?? '');
  const scriptFont = Math.min(46, (W - 160) / Math.max(1, script.length) / 0.42);
  s += `<text x="${W / 2}" y="96" text-anchor="middle" font-family="${SCRIPT}" font-size="${scriptFont.toFixed(1)}" fill="${CI_DEEP}">${esc(script)}</text>`;
  const titleFont = Math.min(98, (W - marginX * 2 - 16) / Math.max(1, title.length) / 0.63);
  s += `<text x="${W / 2}" y="196" text-anchor="middle" font-size="${titleFont.toFixed(1)}" font-weight="800" letter-spacing="1" fill="${CI_DEEP}">${esc(title)}</text>`;

  // ── 各列:深綠橫條 + 左右交替圓圈 + 文字 ──
  rows.forEach((r) => {
    const left = r.i % 2 === 0;
    const cy = r.y + r.rowH / 2;
    const cx = left ? marginX + 34 : W - marginX - 34;
    const tx = left ? cx + R + 22 : marginX + 22;
    // 文字可用寬度(避開圓圈那側)
    const blockTop = cy - r.blockH / 2;

    s += `<rect x="${barX}" y="${r.y}" width="${barW}" height="${r.rowH}" rx="11" fill="${CI_BAR}"/>`;
    s += ciCircle(cx, cy, R, r.it.img, r.i);

    r.titleLines.forEach((ln, k) => {
      s += `<text x="${tx}" y="${(blockTop + 25 + k * 31).toFixed(1)}" font-size="26" font-weight="700" fill="#FFFFFF">${esc(ln)}</text>`;
    });
    const bodyY = blockTop + r.titleLines.length * 31 + 20;
    r.bodyLines.forEach((ln, k) => {
      s += `<text x="${tx}" y="${(bodyY + k * 22).toFixed(1)}" font-size="17" fill="#EAF3EE">${esc(ln)}</text>`;
    });
  });

  // ── 頁尾 ──
  if (data.source) {
    s += `<text x="${W / 2}" y="${H - 22}" text-anchor="middle" font-size="13" fill="${CI_DEEP}">${esc(data.source)}</text>`;
  }

  s += `</svg>`;
  return s;
}

const CIRCLE_IMAGE_SAMPLE = {
  script: 'Healthy living starts now',
  title: 'Healthy',
  source: '2026',
  items: [
    { title: '蔬菜', body: '青花菜、高麗菜、菠菜、青江菜、地瓜', img: 'https://www.google.com/s2/favicons?domain=google.com&sz=128' },
    { title: '魚罐頭', body: '鮪魚、沙丁魚、蝦、鮭魚', img: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAMAAAD04JH5AAAAt1BMVEVHcEz9/v7w8PHz8/T29/f29vf19fb8+/vr7O38/f329/f19fX29vf6+vr+/v755uX////x8vI5iBT///85qldGiPX7wBQ8rFpJivTrUELrTUDsUUTrSz7rT0I+hPTu8vIvqFBMjPWUtvj8vgbN3fz5y8fuZFXT69lVtGrrQzTzmpG84MVzwYaUzqPxfXD2rqn83IN+qff+7L38zkZpnfb2nCY9npTMuyqWtD4zgPRCkc5/tdRHcEwgFdBcAAAAPXRSTlMA8C0eiU6g/g3jdcBiO9H9qdH///////////////////////////////////////////////////////8AWkw1vQAAB9FJREFUeJztW+l2okgYHVkscOeoEAWExKiIolk6nXTP+7/XVAFGKL5aQJIfc3LTSTrniPf67VUU//zzg2YwVGU4HOop8H8U1fhG7qE+6HX7I7PTQVMM1OmYo363N9CH36BCGWiTUWcKojOaaAPlK9nVHpO8IKKnfhG9PjEF7LkGc6J/Ab1mIhn2DMjstctu9Gqw5xp67UWk0pMyPY1OS8GgDkZN6AlGgxYk6JOm9AQ3h6OqmbfwT6emdpMRhv3b6An6w+b8gxs/fgZz0JDe6NbOPQa0RhmptmD+C/oNAkFpnHwQRrV71LAV919h1lSgt8yPFdSqCO3zYy/UUDCU8H+w2ZzPcYrzebMJJBRIFwRh/KFNfNput+7C87y95/ku/uN03oiyti8ZB6L828SEekng+376Gwvxlu423vCvnEhlo8HtPkHs7j1MvCDwLwJyEfu9e+aaoStTkXrs69E49vYZ94X/KiDX4J/HHA0Sg9KQffn4vPUW7oItIJOwPY+Zb9ERBqLBTEB0PmE/u0IBGCd2PJoiJzADYBy7hL7Azxawd2OmEbp8/gFL+uaErQ8IWEIClt7+xEwIbj0yWBUAe991KQGAAXIBaSSwFIx4TtAYF8WuX+HnC8AKGF5AGpuf0QJQnJtf0gNZGDB9YDIzgVGCgvhifnkDcPg55Qg2ACrwywpgR0BqAkYcGl3w5eelNP9Sip9pAngI2rgLiJ8ISPn2ad7V4mdEgQGmwHjLMADOdW97OuFx4LTFXcgrlCERP2NMVqEVKDrBAYBZ4s14HKQYjzcn0iOXsvzTDtSXB9Arzy7A7xMSVKyZCM8o231mAF78fwJYq4BFcLz1K/z+cnECawyu1rL8UDlUgJeheAnwM8s8Om+5+V9EdTqDcnDzGYGf5l/67EZHjCDJDzRFIASvJejK7/FnLunVZEfGAy/2iTShYvJ5Z1kGEWgfQJPg03r95vpF/n1r/JXpEBjFg1fbtt9c7ypgH7e1YMeLBGEIoJc1FmCvt97FCB6cfs1ABYFe/WjoNRVAjJApWEqUOHmgcksE+kBgX/C2JQsR3+cnQF2UByNgFHlZFxQs/HYdgDEpCajWYfR0FWDjbFgu4lb5p6MivwqMAnYRWEGrETCllijALILWJQX2G8MAzw9iPEO7B6WpZFDNwhdKgP0EC/gzn6+yLxh/yPcjcGGn2JKB3fgnWsALLGB1n+OugPndPEP2GxZQrIWaWMArzP8p4O6urCD/kQpYPQAJXFqgAGXgtZ4Amn6ea8gEgEFQFAAMA5SANSMEcgF3FQOkCuY8AV2+ACoCagmYfzohF/BLJAAohLUE3FUsUDTAfA4KmPAFUCGwZiRBKqDKXzIAwwICATUsQPNTISgjAApCaQFV/osMvgsEQSidBRL84jQEChEt4JUh4E9TAUggoFKKGdMIU8C8IACshMVSXL01iirNiJEGLAFzkYBSM9Jv6IZQC5yXBcDNqDgUKsJ5YP1xhH3wCOF5XsIKElC6iQMsjVEpCtcfTnSATQAgeF6VBNxDAsoLZKv6gmsUru115DhhIi3g8b5sAbAMWEV+qBAUguDdmTlODRM8lA0AxiC1PgaWhsjOVka2/eGkmB0lbgwR0B4AYxCVF4cKsDLKffD+MXNySJrgofz54RBA1PIYmMtTH6zfo09+J9rJ8Ae/KA/AQ3GZHwqC4DU1/5XfcWScgKgIwCEAvYzeIoH2yJ7W7x9OCSGjGBT5yymAx/VfkAcqtw0M4J1f3iOHwkyogE5B7AHoElTZJoN26ZIZLQDHAd8Lj1QA4ioEesCi+UEf7I6QAl4u0P4n0xBos+pOpQFtkx2q/LPZLNnBfkC7f2l6lgE6wGYxtFEYQCZwwugASAh2iRP+Lo0B+B/DANC9M2CXZjoFTECMEEZJWUOwOyRRiK3z+2/ZAGAVpPdnMqhAQ8JxGEISnFnoHJPkcNhhHA6H5BiFhL6oYJWlAPSmUwu8iw3fMzzCCogZZk6UYXZhzyRc3bC6B3MGwQd7FNAEQQSFQaaBRGQalmUQBausCIEOmFqMgwTwmb1dCCuo8Bbw91KEwXdErHvosAlwIAIKePSZghWLn2kAlgmmh4oXBPQ4PogbwC7IMQD78AalQEifKvjL4OceqwLG84oCGXosIEwY/B3u7XP43iXpCiEU7w34BQcIgAVChiAJxbRX/tmB1bZNwUka5gkG3JikJYQRo10xa5CEE0hnCqUkcMwvPMFBABeDFLujMAxC3CQ4o2t1DqmCe5DvcMSFn0cf8eglD/UBG8dFCcnRgV1BPnzCHdw7cqdLDcFB6iDrvkUV5K/omBz482Ige9rbADZMSkBk/jgeIydlxmPiEZPvRGsGJH+2VZU5TxsEu08EgfgCJHWS7WID6RO18vex+vXO9rZ4pjcTSt+oFKK1U80Zv0QBoqE1eqgARsA5PcVGr7WjtU0f+NCtVtyArMYPGShtBALq3vDokdGT3BZi00uXP5YR+jdJCGTPEnOMMOCdkhV8/PGgjWd9DE2i0EL0QbMHGwAo3TqPWeX05i3BV5WgjVANDQiNtBuebQEx1PqyZkBmv3V6AlXXLHE0oMDS9K964M9QdK3P6f0oCPqarnzpc5eGquhda1xRgbkDq6t/07OnhqHqvW7fstITjWPL6nd7ump863OvP/jBD/5P+A/yWoK0uPJ8MwAAAABJRU5ErkJggg==' },
    { title: '堅果', body: '巴西堅果、杏仁、榛果、腰果', img: '' },
    { title: '新鮮水果', body: '柳橙、奇異果、杏桃、鳳梨、莓果', img: '' },
    { title: '維生素 D', body: '維生素 D 有助於腸道吸收鈣質', img: '' },
    { title: '強化飲品', body: '杏仁奶、米漿、柳橙汁', img: '' },
    { title: '果乾', body: '杏桃乾、鳳梨乾、椰棗、無花果、葡萄乾', img: '' },
    { title: '種子', body: '罌粟籽、芝麻、芝麻醬、奇亞籽、葵花籽', img: '' },
  ],
};

export const TEMPLATES = {
  'year-timeline': {
    label: '12 Month 米白色',
    desc: '米色底直式時間軸:開口圓環 + 虛線 + 光澤編號牌;英文月份固定,標題與內文可填。',
    w: 900, h: 200 + 12 * 192 + 30,
    defaultData: YEAR_TIMELINE_SAMPLE,
    render: renderYearTimeline,
  },
  'year-cards': {
    label: '12 Month 彩色',
    desc: '白底、實心月份圓、淡染色塊,左右交替;Noto Sans TC 字型。標題與內文可填。',
    w: 900, h: 0,
    defaultData: YEAR_CARDS_SAMPLE,
    render: renderYearCards,
  },
  'years-bw': {
    label: 'Year 黑白',
    desc: '手繪黑白時間軸:歪斜年份方框 + 灰階圓點(淺到深)+ 虛線箭頭,左右交替。年份/標題/內文可填,項目數不限。',
    w: 800, h: 0,
    defaultData: YEARS_BW_SAMPLE,
    render: renderYearsBW,
  },
  'steps': {
    label: 'Step 3-7',
    desc: '手繪橫向步驟時間軸:格線底、彩色編號卡 + 向下箭頭 + 年份軸。年份/標題/內文可填,3–7 步。',
    w: 0, h: 0,
    defaultData: STEPS_SAMPLE,
    render: renderSteps,
  },
  'chevron': {
    label: 'Step 3-10',
    desc: '手繪箭頭色帶時間軸:彩色箭頭段(年份)+ 上下交替卡片 + 手繪捲曲箭頭。年份/標題/內文可填,3–10 步。',
    w: 0, h: 0,
    defaultData: CHEVRON_SAMPLE,
    render: renderChevron,
  },
  'circle-image': {
    label: 'Simply circle image',
    desc: '深綠橫條清單:左右交替的圓形圖章(可嵌圖,圖自動裁成圓形)+ 花體小標語 + 粗體大標題。標題/內文/img 可填,項目數不限。img 建議用 data: URI。',
    w: 800, h: 0,
    defaultData: CIRCLE_IMAGE_SAMPLE,
    render: renderCircleImage,
  },
};
