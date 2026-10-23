import { validateURL } from './segments.js';
export const KEY = 'netpath.v1';
export const DAY = 86400000;
export const CAPACITY = 17280;
// timestamp + 4-7 組 (中位數, 失敗次數), 省略未用的尾端欄位
const empty = () => ({ version: 1, running: false, interval: 5, autoSpeed: true, window: '600', tab: 'segments', custom: [], rows: [], speeds: [], lastSpeed: 0 });

// 固定容量的環形緩衝, 新資料覆蓋最舊資料
export class Ring {
  constructor(items = []) { this.data = new Array(CAPACITY); this.head = 0; this.size = 0; items.forEach(item => this.push(item)); }
  push(item) {
    if (this.size === CAPACITY) { this.data[this.head] = item; this.head = (this.head + 1) % CAPACITY; }
    else { this.data[(this.head + this.size) % CAPACITY] = item; this.size++; }
  }
  prune(now = Date.now()) {
    while (this.size && this.data[this.head][0] < now - DAY) { this.data[this.head] = undefined; this.head = (this.head + 1) % CAPACITY; this.size--; }
  }
  values() { return Array.from({ length: this.size }, (_, i) => this.data[(this.head + i) % CAPACITY]); }
  clear() { this.data = new Array(CAPACITY); this.head = 0; this.size = 0; }
}

export function createStore(warn) {
  let state = empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved.version !== 1 || !Array.isArray(saved.rows) || !Array.isArray(saved.custom) || !Array.isArray(saved.speeds)) throw new Error('不支援的記錄格式');
      const slots = new Set();
      const custom = saved.custom.slice(0, 3).map(item => {
        if (![4, 5, 6].includes(item.slot) || slots.has(item.slot)) throw new Error('自訂目標格式不正確');
        slots.add(item.slot);
        return { slot: item.slot, url: validateURL(item.url) };
      });
      const now = Date.now();
      const rows = saved.rows.filter(row => Array.isArray(row) && [9, 11, 13, 15].includes(row.length) && Number.isFinite(row[0]) && row[0] >= now - DAY && row[0] <= now && row.slice(1).every((v, i) => v === null || (Number.isFinite(v) && v >= 0 && (i % 2 === 0 || (Number.isInteger(v) && v <= 3))))).sort((a, b) => a[0] - b[0]).slice(-CAPACITY);
      state = { ...empty(), running: saved.running === true, interval: [5, 15, 60].includes(saved.interval) ? saved.interval : 5, autoSpeed: saved.autoSpeed !== false, window: ['600', '3600', '21600', 'all'].includes(saved.window) ? saved.window : '600', tab: ['segments', 'chart', 'speed', 'custom', 'about'].includes(saved.tab) ? saved.tab : 'segments', custom, rows, speeds: saved.speeds.filter(item => item && Number.isFinite(item.t) && item.t >= now - DAY && item.t <= now).slice(-150), lastSpeed: Number.isFinite(saved.lastSpeed) && saved.lastSpeed <= now ? saved.lastSpeed : 0 };
    }
  } catch (error) { warn(`無法讀取 localStorage: ${error.message}. 本次仍可量測, reload 可能遺失資料`); }
  const ring = new Ring(state.rows);
  delete state.rows;
  function prune() { ring.prune(); state.speeds = state.speeds.filter(item => item.t >= Date.now() - DAY).slice(-150); }
  function snapshot() { prune(); return { ...state, rows: ring.values() }; }
  return {
    state, ring, snapshot,
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(snapshot())); }
      catch (error) { warn(`無法儲存 localStorage: ${error.message}. 繼續量測, 請匯出 JSON 保留記錄`); }
    },
    clear() { ring.clear(); state.speeds = []; this.save(); },
  };
}
