// 執行環境使用現有 Playwright, 網站本身沒有此相依
const { chromium } = require('/var/www/rh/remote-hunter-frontend/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const output = process.env.NETPATH_SHOTS || '/tmp/claude-1000/-var-www-aquarium/2bc7a9f8-e4c3-4894-83d5-4be62c782150/scratchpad';
const base = process.env.NETPATH_URL || 'http://127.0.0.1:8027/netpath/';
const key = 'netpath.v1';

(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.netpathChartAudit = { visible: 0, hidden: 0 };
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.id === 'chart') window.netpathChartAudit[this.canvas.clientWidth > 0 ? 'visible' : 'hidden']++;
      return clear.apply(this, args);
    };
  });
  const consoleErrors = [], pageErrors = [], requests = [], failures = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  page.on('requestfailed', request => failures.push({ url: request.url(), error: request.failure()?.errorText }));
  const state = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  const tab = title => page.getByRole('tab', { name: title, exact: true });
  async function selected(title) {
    assert.equal(await tab(title).getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('[role="tabpanel"]:visible').count(), 1);
  }
  const report = {};
  try {
    await page.goto(base);
    await page.waitForSelector('[data-segment="cdn"]');
    await page.waitForTimeout(1200);
    report.tabs = await page.getByRole('tab').allTextContents();
    assert.deepEqual(report.tabs, ['分段', '曲線', '速度', '自訂目標', '說明']);
    await selected('分段');
    assert(await page.locator('#consent-title').isVisible());
    report.requestsBeforeConsent = requests.filter(url => !url.startsWith(new URL(base).origin));
    assert.equal(report.requestsBeforeConsent.length, 0, '同意前不得連外');
    await page.getByRole('button', { name: '開始', exact: true }).click();
    await page.waitForTimeout(30000);
    const first = await state();
    assert(first.rows.length >= 2, '30 秒後應有多輪記錄');
    report.rowsBeforeReload = first.rows.length;
    report.firstRow = first.rows[0]; report.lastRow = first.rows.at(-1);
    report.cards = await page.locator('[data-segment]').evaluateAll(cards => cards.map(card => ({ id: card.dataset.segment, ms: card.querySelector('.reading').textContent, stats: card.querySelector('.stats').textContent, error: card.querySelector('.failure').textContent })));
    report.colo = await page.locator('#colo').innerText();
    assert.deepEqual(await page.evaluate(() => window.netpathChartAudit), { visible: 0, hidden: 0 }, '曲線 tab 隱藏時完全不畫');
    await page.screenshot({ path: path.join(output, 'netpath-tab-1.png'), fullPage: true });
    // 左右鍵循環, Home / End, 切換不碰量測排程
    await tab('分段').focus(); await page.keyboard.press('ArrowLeft'); await selected('說明');
    await page.keyboard.press('ArrowRight'); await selected('分段');
    await page.keyboard.press('End'); await selected('說明');
    await page.keyboard.press('Home'); await selected('分段');
    await page.keyboard.press('ArrowRight'); await selected('曲線');
    report.chartSize = await page.locator('#chart').evaluate(canvas => ({ width: canvas.clientWidth, bitmapWidth: canvas.width }));
    assert(report.chartSize.width > 0 && report.chartSize.bitmapWidth > 0);
    await page.locator('#chart').focus(); await page.keyboard.press('End');
    report.chartReadout = await page.locator('#chart-hover').innerText();
    assert(report.chartReadout.includes('ms'), '曲線可讀取歷史樣本');
    await page.screenshot({ path: path.join(output, 'netpath-tab-2.png'), fullPage: true });
    await tab('說明').click(); await selected('說明');
    const about = page.locator('#netpath-panel-about');
    assert(await about.getByRole('heading', { name: '怎麼看出問題在哪裡' }).isVisible());
    assert.match(await about.innerText(), /背景分頁的 timer/);
    assert.match(await about.innerText(), /localStorage 文字儲存約 2 MB/);
    assert(await about.getByRole('link', { name: '端點驗證記錄' }).isVisible());
    assert(await about.getByRole('link', { name: '功能與邊界' }).isVisible());
    await page.screenshot({ path: path.join(output, 'netpath-tab-3.png'), fullPage: true });
    const drawsWhileHidden = await page.evaluate(() => window.netpathChartAudit.visible);
    await page.waitForFunction(({ key, count }) => JSON.parse(localStorage.getItem(key)).rows.length > count, { key, count: first.rows.length }, { timeout: 22000 });
    report.rowsAfterSwitching = (await state()).rows.length;
    assert.equal(await page.evaluate(() => window.netpathChartAudit.visible), drawsWhileHidden, '隱藏曲線期間新增樣本不重畫');
    assert.equal(await page.evaluate(() => window.netpathChartAudit.hidden), 0);
    await page.reload();
    await page.waitForSelector('#netpath-panel-about:not([hidden])');
    await selected('說明');
    await page.waitForTimeout(6000);
    const restored = await state();
    assert.deepEqual(restored.rows[0], first.rows[0], 'reload 後保留最初樣本');
    assert(restored.running && restored.rows.length >= first.rows.length, 'reload 後續跑');
    report.rowsAfterReload = restored.rows.length;
    report.restoredTab = restored.tab;
    assert.equal(restored.tab, 'about');
    await tab('曲線').click();
    assert((await page.locator('#chart').evaluate(canvas => canvas.width)) > 0, '切回曲線重新繪製');
    assert((await page.evaluate(() => window.netpathChartAudit.visible)) > 0);
    await page.setViewportSize({ width: 390, height: 844 });
    await tab('分段').click();
    await page.waitForTimeout(500);
    report.mobile = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    assert(report.mobile.scrollWidth <= report.mobile.width, '手機不得有水平捲軸');
    await page.screenshot({ path: path.join(output, 'netpath-tab-m.png'), fullPage: true });
    // 其他分頁同樣不能撐寬頁面
    for (const title of ['曲線', '速度', '自訂目標', '說明']) {
      await tab(title).click();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${title} 手機無水平捲軸`);
    }
    await tab('速度').click();
    // 真實測速, 等目前量測完成後自動執行
    await page.locator('#speed-now').click();
    await page.waitForSelector('#netpath-tab-speed .tab-busy:not([hidden])', { timeout: 22000 });
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).speeds.length > 0, key, { timeout: 75000 });
    report.speed = (await state()).speeds.at(-1);
    assert(report.speed.download && report.speed.upload, '下載與上傳皆有真實結果');
    assert(await page.locator('#netpath-tab-speed .tab-busy').isHidden());
    await page.getByRole('button', { name: '暫停', exact: true }).click();
    await page.waitForFunction(() => !document.getElementById('start').disabled);
    const beforePausedReload = requests.length;
    await page.reload(); await page.waitForSelector('#netpath-panel-speed:not([hidden])'); await page.waitForTimeout(800);
    report.pausedReloadExternal = requests.slice(beforePausedReload).filter(url => !url.startsWith(new URL(base).origin));
    assert.equal(report.pausedReloadExternal.length, 0, '暫停後 reload 不連外');
    await tab('曲線').click();
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#export').click()]);
    const exportPath = path.join(output, 'netpath-export.json'); await download.saveAs(exportPath);
    const exported = JSON.parse(await fs.readFile(exportPath, 'utf8'));
    assert(exported.rows.length > 0 && exported.samplesPerRound === 3);
    report.exportRows = exported.rows.length;
    // 取消清除時保留資料
    page.once('dialog', dialog => dialog.dismiss()); await page.locator('#clear').click();
    assert.equal((await state()).rows.length, exported.rows.length);
    // 確認後清除
    page.once('dialog', dialog => dialog.accept()); await page.locator('#clear').click();
    assert.equal((await state()).rows.length, 0);
    report.clearConfirmed = true;
    report.consoleErrors = consoleErrors; report.pageErrors = pageErrors; report.requestFailures = failures;
    assert.deepEqual(pageErrors, [], '不得有未捕捉例外');
    assert.deepEqual(consoleErrors, [], '真實連線 console 不得有 error');
    report.pass = true;
  } catch (error) {
    report.pass = false; report.error = error.stack; report.consoleErrors = consoleErrors; report.pageErrors = pageErrors; report.requestFailures = failures;
    process.exitCode = 1;
  } finally {
    await fs.writeFile(path.join(output, 'netpath-browser-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2)); await browser.close();
  }
})();
