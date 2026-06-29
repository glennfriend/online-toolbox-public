// 功能 module:Chart 圖表(post 型)。
//
// 在 ```chart 區塊裡寫「設定 + CSV」,直接渲染成「設定好的」圖(不像 Chart 工具可切換,
// 這裡是宣告式:type 寫死,一進來就是該圖)。引擎用 ECharts(同 Chart 工具),CDN 延遲載入。
//
// 區塊格式:
//   開頭數行 key: value(type 必填;max / title 選填)
//   其餘為 CSV(第一列欄名:第一欄=組名,其餘=各指標/數列;之後每列一組)
//
// 渲染規則:
//   radar → 每組一張雷達圖、由左到右並排
//   bar / line → 一張圖(第一欄當類別,其餘欄各一數列)
//   pie → 一張圖(第一欄當標籤,第二欄當值)
//
// 必須先於 highlight / codeblock 註冊(main.js import 順序),圖才不會被當一般程式碼處理。

import { registerModule } from '../registry.js';

const ECHARTS_CDN = 'https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js';
let _loading = null;
function loadECharts() {
  if (window.echarts) return Promise.resolve(window.echarts);
  if (!_loading) {
    _loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = ECHARTS_CDN;
      s.onload = () => (window.echarts ? resolve(window.echarts) : reject(new Error('echarts not found')));
      s.onerror = () => reject(new Error('echarts load failed'));
      document.head.appendChild(s);
    });
  }
  return _loading;
}

// 往上取整到一位有效數字(95→100、23→30),沿用 Chart 工具的 niceCeil。
function niceCeil(v) {
  if (!(v > 0)) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / mag) * mag;
}

// 解析區塊:開頭 key:value 設定 + 其餘 CSV。
function parseBlock(text) {
  const lines = text.split('\n').map((l) => l.replace(/\s+$/, ''));
  const opts = { type: 'bar' };
  let i = 0;
  for (; i < lines.length; i++) {
    const m = lines[i].match(/^\s*([A-Za-z]\w*)\s*:\s*(.+?)\s*$/);
    if (!m) break;               // 第一個非 key:value 的行 → 開始是資料
    opts[m[1].toLowerCase()] = m[2];
  }
  const rows = lines.slice(i).filter((l) => l.trim()).map((l) => l.split(',').map((c) => c.trim()));
  const header = rows.shift() || [];
  return { opts, header, rows };
}

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

function makeChartDiv(w, h) {
  const div = document.createElement('div');
  div.className = 'ch-fig';
  div.style.width = w;
  div.style.height = h;
  return div;
}

// 把一個 echarts 容器接上 ResizeObserver(面板/視窗變動時重畫)。
function mountChart(echarts, div, option) {
  const chart = echarts.init(div, null, { renderer: 'svg' });
  chart.setOption(option);
  try { new ResizeObserver(() => chart.resize()).observe(div); } catch {}
}

function renderRadar(echarts, wrap, header, rows, opts) {
  const metrics = header.slice(1);
  const allVals = rows.flatMap((r) => r.slice(1).map(num)).filter((n) => Number.isFinite(n));
  const max = opts.max && Number(opts.max) > 0 ? Number(opts.max) : niceCeil(Math.max(1, ...allVals));
  const indicator = metrics.map((name) => ({ name, max }));
  for (const row of rows) {
    const div = makeChartDiv('300px', '280px');
    wrap.appendChild(div);
    mountChart(echarts, div, {
      title: { text: String(row[0] ?? ''), left: 'center', textStyle: { fontSize: 13 } },
      tooltip: { trigger: 'item' },
      radar: { indicator, radius: '60%' },
      series: [{ type: 'radar', data: [{ name: String(row[0] ?? ''), value: row.slice(1).map(num) }], label: { show: true, fontSize: 10 } }],
    });
  }
}

function renderXY(echarts, wrap, header, rows, opts, type) {
  const div = makeChartDiv('100%', '360px');
  wrap.appendChild(div);
  const categories = rows.map((r) => String(r[0] ?? ''));
  const series = header.slice(1).map((name, ci) => ({ name, type, data: rows.map((r) => num(r[ci + 1])) }));
  mountChart(echarts, div, {
    title: opts.title ? { text: opts.title, left: 'center', top: 6 } : undefined,
    tooltip: { trigger: 'axis' },
    legend: { top: opts.title ? 32 : 6 },          // 圖例放標題下方,避免疊住
    grid: { left: 48, right: 24, top: opts.title ? 66 : 40, bottom: 40 },
    xAxis: { type: 'category', data: categories },
    yAxis: { type: 'value' },
    series,
  });
}

function renderPie(echarts, wrap, header, rows, opts) {
  const div = makeChartDiv('100%', '360px');
  wrap.appendChild(div);
  const data = rows.map((r) => ({ name: String(r[0] ?? ''), value: num(r[1]) }));
  mountChart(echarts, div, {
    title: opts.title ? { text: opts.title, left: 'center', top: 6 } : undefined,
    tooltip: { trigger: 'item' },
    legend: { top: opts.title ? 32 : 6 },          // 圖例放標題下方,避免疊住
    series: [{ type: 'pie', radius: '58%', center: ['50%', '58%'], data, label: { show: true } }],
  });
}

registerModule({
  name: 'chart',
  type: 'post',
  css: `
.md-preview .ch-wrap { margin: 1em 0; display: flex; flex-wrap: wrap; gap: 12px; }
.md-preview .ch-fig { background: #fff; }
.md-preview .ch-err { color: var(--danger, #cf222e); font-size: .85rem; }
`,
  async apply(root) {
    const codes = [...root.querySelectorAll('pre > code.language-chart')];
    if (!codes.length) return;
    let echarts;
    try { echarts = await loadECharts(); }
    catch (err) { console.error('[markdown] echarts 載入失敗(需網路),保留原始碼:', err); return; }

    for (const code of codes) {
      const pre = code.parentElement;
      try {
        const { opts, header, rows } = parseBlock(code.textContent);
        const wrap = document.createElement('div');
        wrap.className = 'ch-wrap';
        const type = (opts.type || 'bar').toLowerCase();
        if (!rows.length) throw new Error('沒有資料列');
        if (type === 'radar') renderRadar(echarts, wrap, header, rows, opts);
        else if (type === 'pie') renderPie(echarts, wrap, header, rows, opts);
        else if (type === 'line' || type === 'bar') renderXY(echarts, wrap, header, rows, opts, type);
        else { const e = document.createElement('div'); e.className = 'ch-err'; e.textContent = `⚠ 不支援的 type:${type}(支援 radar / bar / line / pie)`; wrap.appendChild(e); }
        pre.replaceWith(wrap);
      } catch (err) {
        console.error('[markdown] chart 單一區塊失敗,保留原始碼:', err);
      }
    }
  },
});
