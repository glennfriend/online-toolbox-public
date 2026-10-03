// stale.mjs — 列出 builtin.json 裡「該重新上網查證」的點:沒有 checked,或 checked 超過門檻天數。
//
//   node stale.mjs                 預設門檻 180 天(與前端 util.js 的 STALE_DAYS 一致)
//   node stale.mjs --days=90       自訂門檻
//   node stale.mjs --group=台中     只看組名含「台中」的
//   node stale.mjs --json          輸出 JSON(交給 agent 分批查證用)
//
// 唯讀,不改檔。查證完成後把該點的 checked 寫成查證當天(YYYY-MM-DD)。

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1];
const DAYS = +(arg('days') || 180);
const GROUP = arg('group') || '';
const asJson = process.argv.includes('--json');

const data = JSON.parse(fs.readFileSync(path.join(here, '../data/builtin.json'), 'utf8'));
const now = Date.now();
const out = [];
for (const g of data.groups) {
  if (GROUP && !g.name.includes(GROUP)) continue;
  for (const p of g.points) {
    const age = p.checked ? Math.floor((now - new Date(p.checked + 'T00:00:00')) / 86400000) : null;
    if (age === null || age > DAYS) out.push({ group: g.name, title: p.title, address: p.address || '', hours: p.hours || '', checked: p.checked || '', age });
  }
}
out.sort((a, b) => (b.age ?? Infinity) - (a.age ?? Infinity));   // 沒查過的排最前,再來是最久的

if (asJson) { console.log(JSON.stringify(out, null, 2)); process.exit(0); }
const total = data.groups.reduce((n, g) => n + (GROUP && !g.name.includes(GROUP) ? 0 : g.points.length), 0);
console.log(`門檻 ${DAYS} 天:${out.length}/${total} 點需要重新查證(未記錄 ${out.filter((x) => !x.checked).length})\n`);
for (const x of out) console.log(`${(x.checked ? `${x.checked}(${x.age}天)` : '未記錄').padEnd(18)} ${x.group} | ${x.title}`);
