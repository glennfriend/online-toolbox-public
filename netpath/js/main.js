import { SEGMENTS, SAMPLES, targets, validateURL } from './segments.js';
import { probe, readColo, median } from './probe.js';
import { createStore } from './store.js';
import { createTabs } from './tabs.js';

const $ = id => document.getElementById(id);
const warn = message => { $('storage-warning').hidden = false; $('storage-warning').textContent = message; };
const store = createStore(warn), state = store.state;
const cards = new Map(), latest = new Map();
let chart = null, measureSpeed = null, timer = null, active = null, epoch = 0, pendingSpeed = false;
let coloLoaded = false, lastStatus = '尚未連線至檢測服務';
const definitions = [
  { id: 'segments', title: '分段', indicator: 'error' },
  { id: 'chart', title: '曲線' },
  { id: 'speed', title: '速度', indicator: 'busy' },
  { id: 'custom', title: '自訂目標' },
  { id: 'about', title: '說明', aside: true },
];
const tabs = createTabs($('netpath-tabs'), $('tab-panels'), definitions.map(tab => ({ ...tab, content: $(`${tab.id}-content`).content })), {
  initial: state.tab,
  onSelect(id) { state.tab = id; store.save(); if (id === 'chart') drawChart(); },
});
// 圖表或測速模組失效, 仍可繼續量延遲與儲存
await Promise.all([
  import('./chart.js').then(module => { chart = module.createChart($('chart'), $('chart-hover')); }).catch(error => { $('chart-hover').textContent = `圖表無法使用: ${error.message}`; }),
  import('./speed.js').then(module => { measureSpeed = module.measureSpeed; }).catch(error => { $('speed-status').textContent = `測速模組無法使用: ${error.message}`; }),
]);

function textElement(tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}
function buildCards() {
  for (const card of cards.values()) card.root.remove();
  cards.clear(); $('legend').replaceChildren();
  for (const target of targets(state.custom)) {
    const root = textElement('article', '', 'node'); root.dataset.segment = target.id; root.style.setProperty('--line', target.color);
    root.append(textElement('h3', target.title));
    const reading = textElement('div', '待量測', 'reading unavailable');
    const stats = textElement('small', '', 'stats');
    const error = textElement('small', '', 'failure');
    const details = document.createElement('details');
    const detailText = textElement('p', '', 'details-text');
    details.append(textElement('summary', '量測細項'), detailText);
    root.append(reading, textElement('p', target.note), stats, error, details);
    if (target.custom) {
      root.append(textElement('small', target.url));
      const remove = textElement('button', '移除目標'); remove.type = 'button';
      remove.addEventListener('click', () => removeTarget(target.slot)); root.append(remove);
      $('custom-cards').append(root);
    } else $('path').append(root);
    cards.set(target.id, { root, reading, stats, error, detailText });
    const legend = textElement('span', target.title); legend.style.setProperty('--line', target.color); $('legend').append(legend);
  }
  const failure = textElement('span', '紅點 / 該輪有失敗'); failure.style.setProperty('--line', '#cf222e'); $('legend').append(failure);
  const services = [
    ['speed.cloudflare.com', 'CDN 延遲, 節點代碼, 下載與上傳測速'],
    ['1.1.1.1', '開始後查一次 trace 節點代碼, 僅保留 colo, 不保存 IP'],
    ...SEGMENTS.slice(1).map(target => [new URL(target.url).hostname, `${target.title}延遲 (GCPing)`]),
    ...state.custom.map(item => [new URL(item.url).host, `自訂目標: ${item.url}`]),
  ];
  $('services').replaceChildren(...services.map(([host, reason]) => textElement('li', `${host} / ${reason}`)));
}
function statsFor(rows, slot) {
  const column = 1 + slot * 2;
  const recent = rows.filter(row => row[0] >= Date.now() - 300000 && row[column + 1] != null);
  const values = recent.map(row => row[column]).filter(Number.isFinite).sort((a, b) => a - b);
  if (!recent.length) return '最近 5 分鐘尚無樣本';
  const ms = value => Number.isFinite(value) ? `${value.toFixed(1)} ms` : '無有效樣本';
  const failed = recent.reduce((sum, row) => sum + row[column + 1], 0);
  return `5 分鐘中位數 ${ms(median(values))} / p95 ${ms(values[Math.ceil(values.length * .95) - 1])} / 失敗率 ${(failed / (recent.length * SAMPLES) * 100).toFixed(1)}% (${failed}/${recent.length * SAMPLES})`;
}
const showMS = value => Number.isFinite(value) ? `${value.toFixed(1)} ms` : '無有效樣本';
function renderSpeed() {
  const record = state.speeds.at(-1);
  if (!record) { $('download').textContent = '待測速'; $('upload').textContent = '待測速'; return; }
  for (const key of ['download', 'upload']) $(key).textContent = Number.isFinite(record[key]?.mbps) ? `${record[key].mbps.toFixed(1)} Mbps` : '測速失敗';
  const times = ['download', 'upload'].filter(key => Number.isFinite(record[key]?.ms)).map(key => `${key === 'download' ? '下載' : '上傳'} ${record[key].ms} ms`);
  $('speed-status').textContent = `${new Date(record.t).toLocaleString('zh-TW', { hour12: false })} / ${times.join(', ')}${record.errors?.length ? ` / ${record.errors.join('; ')}` : ''}`;
}
function drawChart(rows = store.snapshot().rows) {
  if (!chart || tabs.active() !== 'chart') return;
  try { chart.update(rows, targets(state.custom), state.window); }
  catch (error) { chart = null; $('chart-hover').textContent = `圖表無法繪製: ${error.message}. 卡片與記錄仍可使用`; }
}
function render() {
  const rows = store.snapshot().rows;
  for (const target of targets(state.custom)) {
    const card = cards.get(target.id), value = latest.get(target.id);
    const last = rows.findLast(row => row[2 + target.slot * 2] != null);
    const ms = last?.[1 + target.slot * 2];
    card.reading.textContent = last ? showMS(ms) : '待量測';
    card.reading.classList.toggle('unavailable', !Number.isFinite(ms));
    card.stats.textContent = statsFor(rows, target.slot);
    card.error.textContent = value?.error ? `${target.url}: ${value.error}` : last?.[2 + target.slot * 2] > 0 ? `本輪失敗 ${last[2 + target.slot * 2]}/${SAMPLES}` : '';
    const detail = value?.detail;
    const timing = detail?.timing;
    card.detailText.textContent = [
      last ? `樣本時間: ${new Date(last[0]).toLocaleTimeString('zh-TW', { hour12: false })}` : '尚無樣本',
      target.custom ? 'no-cors 只能量到含重新導向的總時間, 無法讀取 HTTP 狀態與 Resource Timing 細項. 401 / 403 也算有回應' : timing ? `DNS ${timing.dns} ms\nTCP ${timing.tcp} ms\nTLS ${timing.tls} ms\nTTFB ${timing.ttfb} ms\n0 可能表示重用連線, TCP 與 TLS 分開計算` : 'DNS / TCP / TLS / TTFB: 尚無可讀資料, 或服務未允許 Timing-Allow-Origin',
      detail?.adjusted != null ? `最近一次成功請求扣除 cfRequestDuration ${detail.server} ms 後: ${detail.adjusted} ms (僅供參考)` : target.id === 'cdn' ? '未提供 cfRequestDuration, 保留完整 HTTP 時間' : '',
      '卡片數值是本輪 3 次的中位數. 細項是最近一次成功請求, 重新載入後不保留細項',
    ].filter(Boolean).join('\n');
  }
  const last = rows.findLast(row => row[8] != null);
  $('total-ms').textContent = last ? showMS(last[7]) : '待量測';
  $('total-stats').textContent = statsFor(rows, 3);
  drawChart(rows);
  tabs.update('segments', targets(state.custom).some(target => rows.at(-1)?.[2 + target.slot * 2] > 0));
  $('history-status').textContent = rows.length ? `${rows.length.toLocaleString()} 輪 / ${new Date(rows[0][0]).toLocaleTimeString('zh-TW', { hour12: false })} 起 / ${state.running ? '持續記錄' : '已暫停'}` : '尚無記錄';
  controls();
}
function controls() {
  tabs.update('speed', active?.kind === 'speed');
  $('start').disabled = state.running || Boolean(active);
  $('pause').disabled = !state.running;
  $('speed-now').disabled = !state.running || !measureSpeed || pendingSpeed || active?.kind === 'speed';
  $('status').textContent = state.running ? lastStatus : '已暫停, 不會自動續跑';
  $('speed-next').textContent = !state.autoSpeed ? '自動測速已關閉' : !state.running ? '開始後才會計時' : `下次約 ${new Date(state.lastSpeed + 600000).toLocaleTimeString('zh-TW', { hour12: false })}`;
}

async function cycle() {
  if (!state.running || active) return;
  const controller = new AbortController(), started = Date.now(), capturedEpoch = epoch;
  const doSpeed = Boolean(measureSpeed && (pendingSpeed || (state.autoSpeed && started - state.lastSpeed >= 600000)));
  const job = { controller, kind: doSpeed ? 'speed' : 'latency' }; active = job;
  pendingSpeed = false;
  try {
    if (doSpeed) {
      state.lastSpeed = started; store.save();
      lastStatus = '測速中, 延遲量測暫停'; controls();
      const record = await measureSpeed(controller.signal, message => { $('speed-status').textContent = `${message}, 正在消耗測速流量`; });
      if (capturedEpoch === epoch && !controller.signal.aborted) { state.speeds.push(record); store.save(); renderSpeed(); }
    } else {
      lastStatus = '延遲量測中'; controls();
      if (!coloLoaded) {
        coloLoaded = true;
        // 只讀一次, 不等待 trace 才能量其他端點. 拒絕會顯示原因
        void readColo(controller.signal).then(colo => { $('colo').textContent = `1.1.1.1 的 Cloudflare 節點: ${colo}. speed.cloudflare.com 可能導向另一節點`; }).catch(error => {
          if (!controller.signal.aborted) $('colo').textContent = `無法查詢 trace 節點: ${error.message}`;
        });
      }
      const list = targets(state.custom);
      const results = await Promise.all(list.map(async target => {
        try { return await probe(target, controller.signal); }
        catch (error) { if (controller.signal.aborted) throw error; return { ms: null, failed: SAMPLES, error: error.message }; }
      }));
      if (capturedEpoch !== epoch || controller.signal.aborted) return;
      const maxSlot = Math.max(...list.map(target => target.slot));
      const row = new Array(3 + maxSlot * 2).fill(null); row[0] = started;
      list.forEach((target, index) => {
        const result = results[index];
        row[1 + target.slot * 2] = result.ms; row[2 + target.slot * 2] = result.failed;
        latest.set(target.id, result);
        if (target.id === 'cdn' && result.detail?.colo) $('colo').textContent = `speed.cloudflare.com 的 Cloudflare 節點: ${result.detail.colo}. 網路導向的節點不保證地理最近`;
      });
      store.ring.push(row); store.save();
      lastStatus = `最近完成: ${new Date().toLocaleTimeString('zh-TW', { hour12: false })}`;
    }
  } catch (error) {
    if (!controller.signal.aborted) {
      lastStatus = `本輪失敗: ${error.message}`;
      if (doSpeed) $('speed-status').textContent = `測速失敗: ${error.message}`;
    }
  } finally {
    active = null;
    // 避免 Resource Timing 在長時間記錄時填滿預設緩衝
    performance.clearResourceTimings();
    render();
    if (state.running) timer = setTimeout(cycle, doSpeed || pendingSpeed ? 0 : Math.max(0, state.interval * 1000 - (Date.now() - started)));
  }
}
function start(resume = false) {
  if (active) return;
  state.running = true;
  if (!state.lastSpeed) state.lastSpeed = Date.now();
  lastStatus = resume ? '已恢復記錄' : '開始量測';
  store.save(); controls(); void cycle();
}
$('start').addEventListener('click', () => start());
$('pause').addEventListener('click', () => {
  state.running = false; pendingSpeed = false; clearTimeout(timer); active?.controller.abort();
  store.save(); render();
});
$('interval').value = String(state.interval); $('window').value = state.window; $('auto-speed').checked = state.autoSpeed;
$('interval').addEventListener('change', () => {
  state.interval = Number($('interval').value); store.save();
  if (state.running && !active) { clearTimeout(timer); timer = setTimeout(cycle, state.interval * 1000); }
});
$('window').addEventListener('change', () => { state.window = $('window').value; store.save(); render(); });
$('auto-speed').addEventListener('change', () => { state.autoSpeed = $('auto-speed').checked; if (state.autoSpeed) state.lastSpeed = Date.now(); store.save(); controls(); });
$('speed-now').addEventListener('click', () => { pendingSpeed = true; controls(); if (!active) { clearTimeout(timer); void cycle(); } });
$('export').addEventListener('click', () => {
  const data = { ...store.snapshot(), format: 'netpath.v1', columns: ['time (Unix ms)', ...Array.from({ length: 7 }, (_, slot) => [`slot${slot} median ms`, `slot${slot} failed / ${SAMPLES}`]).flat()], builtins: SEGMENTS.map(({ slot, title, url }) => ({ slot, title, url })), samplesPerRound: SAMPLES };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `netpath-${new Date().toISOString().replace(/[:.]/g, '-')}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('clear').addEventListener('click', () => {
  if (!confirm('確定清除所有延遲與測速記錄? 自訂目標與開始設定會保留')) return;
  epoch++; latest.clear(); store.clear(); renderSpeed(); $('speed-status').textContent = '已清除測速記錄'; render();
});
function eraseSlot(slot) {
  for (const row of store.ring.values()) if (row.length > 1 + slot * 2) { row[1 + slot * 2] = null; row[2 + slot * 2] = null; }
  latest.delete(`custom${slot}`);
}
function removeTarget(slot) {
  epoch++; state.custom = state.custom.filter(item => item.slot !== slot); eraseSlot(slot);
  store.save(); buildCards(); render();
}
$('custom-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    if (state.custom.length >= 3) throw new Error('最多加入 3 個自訂目標');
    const url = validateURL($('custom-url').value);
    if (state.custom.some(item => item.url === url)) throw new Error('這個目標已加入');
    const slot = [4, 5, 6].find(value => !state.custom.some(item => item.slot === value));
    epoch++; eraseSlot(slot); state.custom.push({ slot, url });
    store.save(); $('custom-url').value = ''; $('custom-error').hidden = true; buildCards(); render();
  } catch (error) { $('custom-error').hidden = false; $('custom-error').textContent = error.message; }
});
buildCards(); renderSpeed(); render();
if (state.running) start(true);
else { $('status').textContent = '尚未連線至檢測服務. 按 "開始" 才連外'; }
