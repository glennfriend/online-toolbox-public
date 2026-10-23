import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Ring, createStore, KEY, CAPACITY, DAY } from '../js/store.js';
import { median, probe, timedFetch } from '../js/probe.js';
import { validateURL } from '../js/segments.js';

test('median 與 HTTPS URL 驗證', () => {
  assert.equal(median([]), null);
  assert.equal(median([100, 2, 4]), 4);
  assert.equal(median([100, 2, 4, 6]), 5);
  assert.equal(validateURL('https://example.com/health?token=a%2Fb#section'), 'https://example.com/health?token=a%2Fb');
  for (const url of ['http://example.com', 'javascript:alert(1)', 'https://user:pass@example.com']) assert.throws(() => validateURL(url));
});

test('環形緩衝會覆蓋最舊樣本, 並剔除超過 24 小時的樣本', () => {
  const now = Date.now();
  const ring = new Ring();
  for (let i = 0; i < CAPACITY + 3; i++) ring.push([now - CAPACITY + i]);
  assert.equal(ring.size, CAPACITY);
  assert.equal(ring.values()[0][0], now - CAPACITY + 3);
  ring.prune(now + DAY);
  assert.equal(ring.size, 3);
  ring.clear(); assert.equal(ring.size, 0);
});

test('儲存與 reload 會保留樣本, 讀取時清掉過期或損壞樣本', () => {
  const data = new Map(), warnings = [];
  globalThis.localStorage = { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
  const store = createStore(message => warnings.push(message));
  const now = Date.now(), row = [now, 30.1, 0, 45.2, 1, 150, 0, null, 3];
  store.ring.push(row); store.state.running = true; store.state.tab = 'about'; store.save();
  const saved = JSON.parse(data.get(KEY));
  saved.rows.push([now - DAY - 1, 1, 0, 1, 0, 1, 0, 1, 0], [now, -5, 0, 1, 0, 1, 0, 1, 0]);
  data.set(KEY, JSON.stringify(saved));
  const restored = createStore(message => warnings.push(message));
  assert.equal(restored.state.running, true);
  assert.equal(restored.state.tab, 'about');
  assert.deepEqual(restored.ring.values(), [row]);
  assert.equal(warnings.length, 0);
  saved.tab = 'unknown'; data.set(KEY, JSON.stringify(saved));
  assert.equal(createStore(message => warnings.push(message)).state.tab, 'segments');
  delete saved.tab; data.set(KEY, JSON.stringify(saved));
  assert.equal(createStore(message => warnings.push(message)).state.tab, 'segments');
  console.log(`預設 24 小時估算: ${JSON.stringify(row).length * CAPACITY} JSON bytes, 約 ${JSON.stringify(row).length * CAPACITY * 2} UTF-16 bytes`);
});

test('localStorage 被拒絕或額度不足時, 記憶體採樣與匯出仍可用', () => {
  const warnings = [];
  globalThis.localStorage = { getItem() { throw new Error('Storage denied'); }, setItem() { throw new Error('QuotaExceededError'); } };
  const store = createStore(message => warnings.push(message));
  store.ring.push([Date.now(), 30, 0, 40, 0, 150, 0, 200, 0]); store.save();
  assert.equal(store.snapshot().rows.length, 1);
  assert.equal(warnings.length, 2);
  assert.match(warnings[0], /無法讀取/); assert.match(warnings[1], /無法儲存/);
});

test('損壞 JSON 不會造成未捕捉例外或自動連外', () => {
  const warnings = [];
  globalThis.localStorage = { getItem: () => '{bad', setItem() {} };
  const store = createStore(message => warnings.push(message));
  assert.equal(store.state.running, false); assert.equal(warnings.length, 1);
});

test('單一端點部分失敗仍有中位數, 只剩一次成功時留下缺口', async () => {
  const original = globalThis.fetch;
  try {
    let count = 0;
    globalThis.fetch = async (url, options) => {
      assert.equal(options.credentials, 'omit'); assert.equal(options.cache, 'no-store'); assert.equal(options.redirect, 'error');
      return new Response('ok', { status: ++count === 2 ? 503 : 200 });
    };
    const result = await probe({ url: 'https://example.com/health' }, new AbortController().signal);
    assert.equal(result.failed, 1); assert.equal(typeof result.ms, 'number'); assert.match(result.error, /HTTP 503/);
    count = 0;
    globalThis.fetch = async () => new Response('ok', { status: ++count > 1 ? 503 : 200 });
    const failed = await probe({ url: 'https://example.com/health' }, new AbortController().signal);
    assert.equal(failed.ms, null); assert.equal(failed.failed, 2);
  } finally { globalThis.fetch = original; }
});

test('自訂 URL 使用 no-cors 與 follow, 保留 query 並接受 401 / 403', async () => {
  const original = globalThis.fetch;
  try {
    let count = 0;
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://example.com/health?signature=a%2Fb'); assert.equal(options.mode, 'no-cors');
      assert.equal(options.redirect, 'follow'); assert.equal(options.credentials, 'omit'); assert.equal(options.cache, 'no-store');
      return new Response('', { status: ++count === 2 ? 401 : 403 });
    };
    const result = await probe({ url: 'https://example.com/health?signature=a%2Fb', custom: true }, new AbortController().signal);
    assert.equal(result.failed, 0); assert.equal(typeof result.ms, 'number');
  } finally { globalThis.fetch = original; }
});

test('逾時與使用者暫停可中止 fetch, 暫停不混成失敗', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = (url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
      if (signal.aborted) reject(new DOMException('aborted', 'AbortError'));
    });
    await assert.rejects(timedFetch('https://example.com', { timeout: 10 }), /逾時/);
    const controller = new AbortController();
    const pending = probe({ url: 'https://example.com' }, controller.signal);
    controller.abort();
    await assert.rejects(pending, { name: 'AbortError' });
  } finally { globalThis.fetch = original; }
});
