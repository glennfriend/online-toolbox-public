// nearby-numbers.mjs — 查某條路段「實際存在哪些門牌號」,用來判斷地址是不是寫錯。
//
//   node nearby-numbers.mjs "台中市北區公園路37號" "高雄市鹽埕區七賢三路100號" ...
//
// 對每個地址印出:該路段(同巷弄)實際存在的號碼、以及目標號碼在不在。
// 這是抓「地址錯」最快的方法 —— 門牌庫收錄的是地址,店倒了門牌還在,查無 = 地址有問題。

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { parseAddress } from './geocode-moi.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '_src');

const CITY_FILE = [
  { city: '臺北市', re: /taipei/i }, { city: '臺中市', re: /taichung/i },
  { city: '高雄市', re: /kaohsiung/i }, { city: '臺南市', re: /tainan/i }, { city: '宜蘭縣', re: /yilan/i },
];
const DISTRICT_OF = { '臺北市': 8, '臺中市': 7, '高雄市': 7 };   // 區代碼長度(僅供顯示判斷)

const queries = process.argv.slice(2).map((a) => ({ raw: a, p: parseAddress(a) })).filter((q) => q.p);
if (!queries.length) { console.error('用法:node nearby-numbers.mjs "<完整地址>" ...'); process.exit(1); }

// 依城市分組,每個檔只掃一次
const byCity = new Map();
for (const q of queries) {
  if (!byCity.has(q.p.city)) byCity.set(q.p.city, []);
  byCity.get(q.p.city).push(q);
}

for (const [city, qs] of byCity) {
  const cf = CITY_FILE.find((c) => c.city === city);
  const file = fs.readdirSync(SRC).find((f) => /\.csv$/i.test(f) && cf && cf.re.test(f));
  if (!file) { console.log(`\n[${city}] 找不到門牌檔,略過`); continue; }

  // 收集:同「街路段 + 巷 + 弄」的所有號碼(不管區,之後再用區名對照)
  const bucket = new Map();      // street|lane|alley -> Set(號)
  const codeSeen = new Map();    // street|lane|alley -> Set(區代碼)
  const toHalf = (s) => String(s ?? '').replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  const wanted = new Set(qs.map((q) => [q.p.street, q.p.lane, q.p.alley].join('|')));

  const rl = readline.createInterface({ input: fs.createReadStream(path.join(SRC, file), { encoding: 'utf8' }) });
  let first = true;
  for await (const line of rl) {
    if (first) { first = false; continue; }
    const f = line.split(',');
    const k = [(f[4] || f[5] || ''), toHalf(f[6]).replace('巷', ''), toHalf(f[7]).replace('弄', '')].map(nt).join('|');
    if (!wanted.has(k)) continue;
    const m = toHalf(f[8]).match(/^(\d+(?:之\d+)*)號/);
    if (!m) continue;
    if (!bucket.has(k)) { bucket.set(k, new Set()); codeSeen.set(k, new Set()); }
    bucket.get(k).add(m[1]);
    codeSeen.get(k).add(f[1]);
  }

  for (const q of qs) {
    const k = [q.p.street, q.p.lane, q.p.alley].join('|');
    const set = bucket.get(k) || new Set();
    const target = q.p.no.replace('號', '');
    const list = [...set].map((x) => ({ r: x, n: parseInt(x, 10) })).sort((a, b) => a.n - b.n);
    console.log(`\n【${q.raw}】`);
    console.log(`  該路段共 ${list.length} 個門牌;目標 ${target}號 → ${set.has(target) ? '✅ 存在(可能是區名寫錯)' : '❌ 不存在'}`);
    console.log(`  出現的區代碼:${[...(codeSeen.get(k) || [])].join(', ') || '(無)'}`);
    const near = list.filter((x) => Math.abs(x.n - parseInt(target, 10)) <= 20).map((x) => x.r);
    console.log(`  附近號碼:${near.join(', ') || '(無)'}`);
    if (list.length) console.log(`  範圍:${list[0].r} ~ ${list[list.length - 1].r}`);
  }
}
