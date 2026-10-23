import { SAMPLES } from './segments.js';
const clock = time => new Date(time).toLocaleTimeString('zh-TW', { hour12: false });

export function createChart(canvas, readout) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('瀏覽器無法建立 canvas');
  let rows = [], series = [], start = 0, end = 0, selected = -1, width = 0, height = 0;
  const left = 48, right = 12, top = 18, bottom = 30;
  function draw() {
    width = canvas.clientWidth; height = canvas.clientHeight;
    const ratio = devicePixelRatio || 1;
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const plotW = width - left - right, plotH = height - top - bottom;
    const values = rows.flatMap(row => series.map(item => row[1 + item.slot * 2])).filter(Number.isFinite);
    const max = Math.max(50, Math.ceil(values.reduce((high, value) => Math.max(high, value), 0) * 1.15 / 50) * 50);
    const x = time => left + (time - start) / Math.max(1, end - start) * plotW;
    const y = value => top + plotH * (1 - value / max);
    ctx.font = '11px system-ui'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const value = max * i / 4, py = y(value);
      ctx.strokeStyle = '#e5e9ef'; ctx.beginPath(); ctx.moveTo(left, py); ctx.lineTo(width - right, py); ctx.stroke();
      ctx.fillStyle = '#57606a'; ctx.textAlign = 'right'; ctx.fillText(Math.round(value), left - 7, py + 4);
    }
    ctx.textAlign = 'left'; ctx.fillText('ms', 4, 11);
    for (let i = 0; i <= 2; i++) {
      const time = start + (end - start) * i / 2;
      ctx.textAlign = i === 0 ? 'left' : i === 2 ? 'right' : 'center';
      ctx.fillText(clock(time), x(time), height - 7);
    }
    for (const [seriesIndex, item] of series.entries()) {
      const column = 1 + item.slot * 2;
      ctx.strokeStyle = item.color; ctx.lineWidth = 1.7; ctx.beginPath();
      let previous = null;
      for (const row of rows) {
        const value = row[column], failed = row[column + 1];
        if (!Number.isFinite(value) || failed > 0) { previous = null; continue; }
        if (previous && row[0] - previous[0] <= 90000) ctx.lineTo(x(row[0]), y(value));
        else ctx.moveTo(x(row[0]), y(value));
        previous = row;
      }
      ctx.stroke();
      for (const row of rows) {
        const value = row[column], failed = row[column + 1];
        if (!Number.isFinite(value) && !(failed > 0)) continue;
        const py = Number.isFinite(value) ? y(value) : top + 5 + seriesIndex * 7;
        ctx.fillStyle = failed > 0 ? '#cf222e' : item.color;
        ctx.beginPath(); ctx.arc(x(row[0]), py, failed > 0 ? 3.2 : 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (!rows.length) { ctx.fillStyle = '#57606a'; ctx.textAlign = 'center'; ctx.fillText('開始後, 延遲樣本會出現在這裡', left + plotW / 2, top + plotH / 2); }
    if (selected >= 0 && selected < rows.length) {
      ctx.strokeStyle = '#687789'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(x(rows[selected][0]), top); ctx.lineTo(x(rows[selected][0]), height - bottom); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  function describe() {
    if (selected < 0 || !rows[selected]) return;
    const row = rows[selected];
    readout.textContent = `${clock(row[0])} | ${series.map(item => {
      const value = row[1 + item.slot * 2], failed = row[2 + item.slot * 2];
      return `${item.title}: ${Number.isFinite(value) ? `${value.toFixed(1)} ms` : failed > 0 ? '失敗 / 有效樣本不足' : '未量測'}${failed > 0 ? ` (失敗 ${failed}/${SAMPLES})` : ''}`;
    }).join(' | ')}`;
  }
  canvas.addEventListener('pointermove', event => {
    if (!rows.length) return;
    const px = event.clientX - canvas.getBoundingClientRect().left;
    const time = start + Math.max(0, Math.min(1, (px - left) / (width - left - right))) * (end - start);
    let best = 0;
    for (let i = 1; i < rows.length; i++) if (Math.abs(rows[i][0] - time) < Math.abs(rows[best][0] - time)) best = i;
    selected = best; describe(); draw();
  });
  canvas.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || !rows.length) return;
    event.preventDefault();
    selected = event.key === 'Home' ? 0 : event.key === 'End' ? rows.length - 1 : Math.max(0, Math.min(rows.length - 1, (selected < 0 ? rows.length - 1 : selected) + (event.key === 'ArrowRight' ? 1 : -1)));
    describe(); draw();
  });
  new ResizeObserver(draw).observe(canvas);
  return { update(allRows, targets, window) {
    series = targets;
    end = Date.now(); start = window === 'all' ? Math.min(end - 60000, allRows[0]?.[0] ?? end) : end - Number(window) * 1000;
    rows = allRows.filter(row => row[0] >= start && row[0] <= end);
    selected = -1; draw();
    readout.textContent = rows.length ? '移到曲線上查看數值. 觸控可點選, 鍵盤可用左右方向鍵' : '此時間範圍尚無樣本';
  } };
}
