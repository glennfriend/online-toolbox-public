// 自訂範例實連 RemoteHunter, 其他回應攔截以驗證錯誤邊界與排程
const { chromium } = require('/var/www/rh/remote-hunter-frontend/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.env.NETPATH_URL || 'http://127.0.0.1:8027/netpath/';
const output = process.env.NETPATH_SHOTS || '/tmp/claude-1000/-var-www-aquarium/2bc7a9f8-e4c3-4894-83d5-4be62c782150/scratchpad';
const key = 'netpath.v1';
const realCustomURL = 'https://api.remotehunter.com/up';

(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const report = { checks: [], uncaught: [], expectedConsoleErrors: [] };
  async function setup(config = {}) {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on('pageerror', error => report.uncaught.push(error.message));
    page.on('console', message => { if (message.type() === 'error') report.expectedConsoleErrors.push(message.text()); });
    const requests = [], responses = [];
    page.on('request', request => { if (request.url().startsWith('https://')) requests.push({ url: request.url(), method: request.method(), headers: request.headers() }); });
    page.on('response', response => responses.push({ url: response.url(), status: response.status() }));
    await page.route('https://**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (config.realCustom && request.url() === realCustomURL) { await route.continue(); return; }
      if (url.hostname === 'custom.example' && url.pathname === '/redirect') {
        await route.fulfill({ status: 302, headers: { location: realCustomURL } }); return;
      }
      const headers = { 'access-control-allow-origin': '*', 'timing-allow-origin': '*', 'access-control-expose-headers': 'server-timing,cf-meta-colo', 'cf-meta-colo': 'TST', 'server-timing': 'cfRequestDuration;dur=1' };
      let body = 'ok';
      if (url.pathname.endsWith('/trace')) body = 'ip=should-not-be-stored\ncolo=TST\n';
      if (url.pathname === '/__down') body = Buffer.alloc(Number(url.searchParams.get('bytes')));
      const status = config.failTaiwan && url.hostname.startsWith('asia-east1-') ? 503 : 200;
      await route.fulfill({ status, headers, body });
    });
    return { context, page, requests, responses };
  }
  try {
    {
      const { context, page, requests, responses } = await setup({ failTaiwan: true, realCustom: true });
      await page.goto(base); await page.waitForSelector('[data-segment="cdn"]');
      await page.locator('#custom-url').fill(realCustomURL);
      await page.locator('#custom-form button').click();
      assert.equal(requests.length, 0, '加入自訂目標不等於同意開始');
      await page.locator('#start').click();
      await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).rows.length > 0, key);
      const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
      assert.equal(saved.rows[0][3], null); assert.equal(saved.rows[0][4], 3);
      assert(Number.isFinite(saved.rows[0][1]) && Number.isFinite(saved.rows[0][5]) && Number.isFinite(saved.rows[0][7]));
      report.customTarget = { url: realCustomURL, statuses: responses.filter(response => response.url === realCustomURL).map(response => response.status), ms: saved.rows[0][9], failed: saved.rows[0][10], note: await page.locator('[data-segment="custom4"] .failure').innerText() };
      assert(Number.isFinite(saved.rows[0][9]), '真實 403 自訂目標應可量到總時間');
      assert.equal(saved.rows[0][10], 0);
      assert.deepEqual(report.customTarget.statuses, [403, 403, 403], '三次請求皆由真實目標回傳 403');
      assert(!JSON.stringify(saved).includes('should-not-be-stored'), 'trace IP 不可寫入記錄');
      await page.locator('[data-segment="cdn"] summary').click();
      const detail = await page.locator('[data-segment="cdn"] .details-text').innerText();
      assert(detail.includes('DNS') && detail.includes('cfRequestDuration'));
      assert.equal(requests.filter(request => request.url === realCustomURL).length, 3);
      await page.locator('[data-segment="custom4"] summary').click();
      assert.match(await page.locator('[data-segment="custom4"] .details-text').innerText(), /含重新導向的總時間/);
      await page.locator('#pause').click(); await page.waitForFunction(() => !document.getElementById('start').disabled);
      await page.reload(); await page.waitForSelector('[data-segment="custom4"]');
      assert.equal(await page.locator('[data-segment="custom4"]').count(), 1, '自訂目標 reload 後仍在');
      const count = requests.length; await page.waitForTimeout(100); assert.equal(requests.length, count);
      await page.locator('[data-segment="custom4"] button').click();
      const removed = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
      assert.equal(removed.custom.length, 0); assert.equal(removed.rows[0][9], null); assert.equal(removed.rows[0][10], null);
      report.checks.push('真實自訂 URL 403 可量測, 同意前不連外, 單一 503 隔離, Timing 細項, trace 隱私, 自訂持久化與移除');
      await context.close();
    }
    {
      const { context, page, requests, responses } = await setup({ realCustom: true });
      await page.goto(base); await page.waitForSelector('[data-segment="cdn"]');
      await page.locator('#custom-url').fill('https://custom.example/redirect?signature=a%2Fb');
      await page.locator('#custom-form button').click();
      await page.locator('#start').click();
      await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).rows.length > 0, key);
      const row = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).rows[0], key);
      assert(Number.isFinite(row[9])); assert.equal(row[10], 0);
      assert.equal(requests.filter(request => request.url === 'https://custom.example/redirect?signature=a%2Fb').length, 3, '保留原 query');
      assert.equal(requests.filter(request => request.url === realCustomURL).length, 3, '跟隨跨網域重新導向');
      assert.deepEqual(responses.filter(response => response.url === realCustomURL).map(response => response.status), [403, 403, 403]);
      report.redirectTarget = { ms: row[9], failed: row[10], finalStatus: 403, redirectedRequests: 3 };
      await page.locator('#pause').click();
      report.checks.push('自訂目標跟隨跨網域 302 到真實 403, 保留 query, 記錄總時間');
      await context.close();
    }
    {
      const { context, page } = await setup();
      await page.addInitScript(() => {
        Storage.prototype.getItem = function () { throw new DOMException('Storage denied', 'SecurityError'); };
        Storage.prototype.setItem = function () { throw new DOMException('Storage full', 'QuotaExceededError'); };
      });
      await page.goto(base); await page.waitForSelector('[data-segment="cdn"]');
      assert(await page.locator('#storage-warning').isVisible());
      await page.locator('#start').click();
      await page.waitForFunction(() => document.getElementById('history-status').textContent.includes('1 輪'));
      assert.match(await page.locator('#storage-warning').innerText(), /無法儲存/);
      await page.locator('#pause').click(); await page.waitForFunction(() => !document.getElementById('start').disabled);
      const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#export').click()]);
      const file = path.join(output, 'netpath-no-storage-export.json'); await download.saveAs(file);
      assert(JSON.parse(await fs.readFile(file, 'utf8')).rows.length > 0);
      report.checks.push('localStorage 讀寫皆失敗時, 仍量測與匯出');
      await context.close();
    }
    {
      const { context, page, requests } = await setup();
      await page.clock.install();
      await page.goto(base); await page.waitForSelector('[data-segment="cdn"]');
      await page.locator('#interval').selectOption('60');
      await page.locator('#start').click();
      await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).rows.length > 0, key);
      assert(!requests.some(request => request.method === 'POST'), '開始時不立即自動測速');
      await page.clock.fastForward(590000);
      await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).rows.length > 1, key);
      assert(!requests.some(request => request.method === 'POST'), '未滿 10 分鐘不自動測速');
      await page.clock.fastForward(60000);
      await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).speeds.length > 0, key);
      assert.equal(requests.filter(request => request.method === 'POST').length, 1);
      await page.locator('#auto-speed').uncheck();
      await page.waitForFunction(() => document.getElementById('status').textContent.includes('最近完成'));
      await page.clock.fastForward(650000);
      await page.waitForTimeout(200);
      assert.equal(requests.filter(request => request.method === 'POST').length, 1, '關閉後不再自動上傳');
      await page.locator('#pause').click();
      const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
      assert.equal(saved.interval, 60); assert.equal(saved.autoSpeed, false);
      assert(saved.rows.some((row, i) => i > 0 && row[0] - saved.rows[i - 1][0] > 500000), '背景大間隔照實記錄');
      report.checks.push('虛擬時間驗證首次 10 分鐘排程, 關閉自動測速, 真實樣本時間間隔');
      await context.close();
    }
    assert.deepEqual(report.uncaught, []);
    report.pass = true;
    assert(!report.expectedConsoleErrors.some(message => message.includes('redirect mode is not')));
  } catch (error) { report.pass = false; report.error = error.stack; process.exitCode = 1; }
  finally {
    await fs.writeFile(path.join(output, 'netpath-edge-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2)); await browser.close();
  }
})();
