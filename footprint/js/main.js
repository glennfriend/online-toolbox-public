import { getChecks } from './registry.js';
import { glossary } from './glossary.js';
import { escapeHtml } from './util.js';
import { createTabs } from './tabs.js';

// 新增檢測只需一個模組與此處一筆檔名. 動態載入也隔離模組匯入失敗
const modules = [
  'public-ip', 'ip-info', 'timezone-ip', 'webrtc', 'headers', 'tls', 'tor',
  'latency-taiwan', 'latency-west', 'latency-east', 'download', 'regional-bandwidth',
  'dns', 'ip-risk', 'ipv6-only', 'user-agent', 'client-hints', 'locale', 'screen',
  'hardware', 'connection', 'battery', 'privacy', 'navigation', 'preferences',
  'canvas', 'webgl', 'audio', 'fonts', 'media-devices', 'voices', 'plugins',
  'permissions', 'fingerprint', 'uniqueness', 'geolocation', 'camera-microphone',
  'clipboard', 'extensions', 'cross-site', 'behavior', 'lan', 'server-tracking',
];
const results = new Map();
const elements = new Map();
const levels = { exposed: '會外洩', caution: '需注意', safe: '安全', neutral: '待執行', error: '錯誤' };
const groups = ['網路與 IP', '瀏覽器與系統', '指紋', '需要你同意才會外洩的', '其他檢測限制'];
const loadErrors = [];
await Promise.all(modules.map(async name => {
  try { await import(`./checks/${name}.js`); }
  catch (error) { loadErrors.push({ id: name, group: '其他檢測限制', title: `模組 ${name}`, run: () => { throw new Error(`模組載入失敗: ${error.message}`); } }); }
}));
// 依宣告順序呈現, 不受模組下載完成順序影響
const checks = [...getChecks(), ...loadErrors].sort((a, b) => modules.indexOf(a.id) - modules.indexOf(b.id));
const context = { results };
const pending = new Set(checks.filter(check => !check.needsNetwork && !check.action).map(check => check.id));
const tabs = createTabs(document.querySelector('#check-tabs'), document.querySelector('#groups'), groups);

function updateTab(group) {
  const exposed = tabs.panel(group).querySelectorAll('.badge.exposed').length;
  const busy = checks.some(check => check.group === group && pending.has(check.id));
  tabs.update(group, exposed, busy);
}

function renderRows(check, rows) {
  const body = elements.get(check.id);
  body.innerHTML = rows.map(result => {
    if (check.status === 'unavailable') {
      const reason = result.level === 'error' ? result.value : result.note || check.reason;
      return `<tr><th scope="row">${escapeHtml(result.label)}</th><td>${escapeHtml(reason)}</td></tr>`;
    }
    const level = Object.hasOwn(levels, result.level) ? result.level : 'caution';
    return `<tr><td>${escapeHtml(result.label)}</td><td><div class="value">${escapeHtml(result.value)}</div>${result.note ? `<div class="note">${escapeHtml(result.note)}</div>` : ''}</td><td><span class="badge ${level}">${levels[level]}</span></td></tr>`;
  }).join('');
  if (check.action) {
    const button = document.createElement('button');
    button.className = 'btn row-action';
    button.type = 'button';
    button.textContent = check.action;
    button.addEventListener('click', () => execute(check), { once: true });
    body.querySelector('td:nth-child(2)').append(button);
  }
  updateTab(check.group);
}
async function execute(check) {
  // 每個 run 與 render 都有自己的錯誤邊界
  pending.add(check.id);
  updateTab(check.group);
  try {
    elements.get(check.id).querySelector('button')?.remove();
    const rows = await check.run(context);
    if (!Array.isArray(rows) || !rows.length || rows.some(item => !item || typeof item.label !== 'string' || item.value === undefined)) throw new Error('檢測模組回傳格式不正確');
    results.set(check.id, rows);
    renderRows(check, rows);
  } catch (error) {
    const rows = [{ label: check.title, value: `檢測失敗: ${error.message}`, level: 'error' }];
    results.set(check.id, rows);
    renderRows(check, rows);
  } finally {
    pending.delete(check.id);
    updateTab(check.group);
  }
}
for (const group of groups) {
  const groupChecks = checks.filter(check => check.group === group);
  // 分區由模組宣告的 status 決定, 不依賴項目 id 或瀏覽器當次支援情況
  for (const isUnavailable of [false, true]) {
    const items = groupChecks.filter(check => (check.status === 'unavailable') === isUnavailable);
    if (!items.length) continue;
    const container = document.createElement('section');
    container.className = isUnavailable ? 'card unavailable-section' : 'card checks-card';
    tabs.panel(group).append(container);
    if (isUnavailable) {
      const heading = document.createElement('h2');
      heading.id = `unavailable-title-${groups.indexOf(group)}`;
      heading.textContent = '靜態網頁無法檢測的項目';
      container.setAttribute('aria-labelledby', heading.id);
      const explanation = document.createElement('p');
      explanation.textContent = '這些資訊對方網站可能拿得到, 但純靜態網頁沒辦法替你檢測';
      container.append(heading, explanation);
    }
    const table = document.createElement('table');
    table.className = isUnavailable ? 'unavailable-table' : 'check-table';
    table.setAttribute('aria-label', `${group}${isUnavailable ? ' - 靜態網頁無法檢測的項目' : ''}`);
    table.innerHTML = isUnavailable
      ? '<thead><tr><th scope="col">項目</th><th scope="col">原因</th></tr></thead>'
      : '<thead><tr><th scope="col">項目</th><th scope="col">值與說明</th><th scope="col">狀態</th></tr></thead>';
    for (const check of items) {
      const body = document.createElement('tbody');
      body.dataset.check = check.id;
      elements.set(check.id, body);
      table.append(body);
    }
    container.append(table);
  }
}
for (const check of checks) renderRows(check, [{ label: check.title, value: '', level: 'neutral' }]);
const services = [...new Set(checks.filter(check => check.needsNetwork).flatMap(check => check.services))].sort();
document.querySelector('#services').innerHTML = services.map(service => `<li>${escapeHtml(service)}</li>`).join('');
document.querySelector('#glossary').innerHTML = glossary.map(([term, meaning]) => `<dt>${escapeHtml(term)}</dt><dd>${escapeHtml(meaning)}</dd>`).join('');
document.querySelector('#start-network').addEventListener('click', async event => {
  const button = event.currentTarget;
  button.disabled = true;
  tabs.select(groups[0]);
  document.querySelector('#network-status').textContent = '網路檢測執行中';
  // 先清除前次結果, 避免依賴項引用舊資料
  const network = checks.filter(check => check.needsNetwork);
  network.forEach(check => pending.add(check.id));
  network.forEach(check => {
    results.delete(check.id);
    renderRows(check, [{ label: check.title, value: '檢測中', level: 'neutral' }]);
  });
  await Promise.all(network.filter(check => !check.afterNetwork).map(execute));
  await Promise.all(network.filter(check => check.afterNetwork).map(execute));
  document.querySelector('#network-status').textContent = '網路檢測已完成, 失敗原因請見各列';
  button.textContent = '重新執行網路檢測';
  button.disabled = false;
});
const local = checks.filter(check => !check.needsNetwork && !check.action && !check.afterLocal);
await Promise.all(local.map(execute));
await Promise.all(checks.filter(check => check.afterLocal).map(execute));
