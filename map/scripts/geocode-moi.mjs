// geocode-moi.mjs — 用政府「門牌位置」開放資料把 builtin.json 的座標補正到門牌級。
//
// 這是「建置時」工具:CSV 只留在本機(map/scripts/_src/,已 gitignore),
// 產物是寫回 builtin.json 的座標。瀏覽器端完全不會載到這些資料。
//
// 用法:
//   node geocode-moi.mjs --validate   對照已知精確座標,印出誤差(不改檔)
//   node geocode-moi.mjs --report     列出每個點能否定位(不改檔)
//   node geocode-moi.mjs --apply      實際把查到的座標寫回 builtin.json
//
// 資料來源與下載方式見同目錄 README.md。

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BUILTIN = path.join(HERE, '..', 'data', 'builtin.json');
const SRC_DIR = path.join(HERE, '_src');

// 台北市 CSV 只有「鄉鎮市區代碼」沒有區名。本表由資料本身的代表街道反推驗證過
// (如 63000060 出現南京西路/民權西路 → 大同區)。
const TPE_DISTRICT = {
  63000010: '松山區', 63000020: '信義區', 63000030: '大安區', 63000040: '中山區',
  63000050: '中正區', 63000060: '大同區', 63000070: '萬華區', 63000080: '文山區',
  63000090: '南港區', 63000100: '內湖區', 63000110: '士林區', 63000120: '北投區',
};

// ── TWD97 TM2(EPSG:3826)→ WGS84 ─────────────────────────────────────
// GRS80 橢球、中央經線 121°E、尺度 0.9999、假東距 250000、假北距 0。
export function twd97ToWgs84(x, y) {
  const a = 6378137.0, f = 1 / 298.257222101;
  const e2 = f * (2 - f);
  const k0 = 0.9999, dx = 250000, lon0 = (121 * Math.PI) / 180;

  const e = Math.sqrt(e2);
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const M = y / k0;
  const mu = M / (a * (1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256));

  const J1 = (3 * e1) / 2 - (27 * e1 ** 3) / 32;
  const J2 = (21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32;
  const J3 = (151 * e1 ** 3) / 96;
  const J4 = (1097 * e1 ** 4) / 512;
  const fp = mu + J1 * Math.sin(2 * mu) + J2 * Math.sin(4 * mu) + J3 * Math.sin(6 * mu) + J4 * Math.sin(8 * mu);

  const e2p = e2 / (1 - e2);
  const C1 = e2p * Math.cos(fp) ** 2;
  const T1 = Math.tan(fp) ** 2;
  const R1 = (a * (1 - e2)) / (1 - e2 * Math.sin(fp) ** 2) ** 1.5;
  const N1 = a / Math.sqrt(1 - e2 * Math.sin(fp) ** 2);
  const D = (x - dx) / (N1 * k0);

  const Q1 = (N1 * Math.tan(fp)) / R1;
  const Q2 = D ** 2 / 2;
  const Q3 = ((5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * e2p) * D ** 4) / 24;
  const Q4 = ((61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 3 * C1 ** 2 - 252 * e2p) * D ** 6) / 720;
  const lat = fp - Q1 * (Q2 - Q3 + Q4);

  const Q5 = D;
  const Q6 = ((1 + 2 * T1 + C1) * D ** 3) / 6;
  const Q7 = ((5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * e2p + 24 * T1 ** 2) * D ** 5) / 120;
  const lon = lon0 + (Q5 - Q6 + Q7) / Math.cos(fp);

  return { lat: (lat * 180) / Math.PI, lng: (lon * 180) / Math.PI };
}

// ── 地址正規化 ────────────────────────────────────────────────────────
// CSV 的「號」是全形(如 ９１號、５之２號),我們的資料是半形 → 統一成半形比對。
const toHalf = (s) => String(s ?? '').replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));

// 只取「N號」或「N之M號」這段(丟掉樓層:同棟樓共用同一組座標)。
function baseNo(s) {
  const m = toHalf(s).match(/^(\d+(?:之\d+)?號)/);
  return m ? m[1] : '';
}

// 「53-4號」「53之4號」是同一個門牌;CSV 一律用「之」。先統一,否則 53-4 會被誤讀成 4 號。
const normDash = (s) => s.replace(/(\d+)\s*[-–—]\s*(\d+)\s*號/g, '$1之$2號');

// 我們的地址字串 → { city, district, street, lane, alley, no };無法解析回 null。
export function parseAddress(addr) {
  const a = normDash(toHalf(addr).replace(/\s+/g, ''));
  const m = a.match(/^(台北市|臺北市|宜蘭縣)(.{1,4}?[區鄉鎮市])(.+)$/);
  if (!m) return null;
  const [, city, district, rest] = m;

  const no = (rest.match(/(\d+(?:之\d+)?)號/) || [])[1];
  if (!no) return null;                                   // 沒門牌號 → 這份資料救不了
  const lane = (rest.match(/(\d+)巷/) || [])[1] || '';
  const alley = (rest.match(/(\d+)弄/) || [])[1] || '';
  const street = rest.split(/\d+巷|\d+弄|\d+(?:之\d+)?號/)[0];
  if (!street) return null;

  return { city: city.replace('台', '臺'), district, street, lane, alley, no: no + '號' };
}

const keyOf = (p) => [p.city, p.district, p.street, p.lane, p.alley, p.no].join('|');

// ── 掃 CSV,只撿我們要的門牌(單趟串流,不建 1.1M 筆索引)─────────────
async function lookupAll(wanted) {
  const found = new Map();
  const files = fs.existsSync(SRC_DIR) ? fs.readdirSync(SRC_DIR).filter((f) => /\.csv$/i.test(f)) : [];
  if (!files.length) throw new Error(`找不到門牌 CSV。請先依 ${path.join(HERE, 'README.md')} 下載到 ${SRC_DIR}`);

  for (const file of files) {
    const city = /taipei|臺北|台北/i.test(file) ? '臺北市' : /yilan|宜蘭/i.test(file) ? '宜蘭縣' : null;
    if (!city) { console.warn(`⚠ 跳過無法判斷縣市的檔案:${file}`); continue; }

    const rl = readline.createInterface({ input: fs.createReadStream(path.join(SRC_DIR, file), { encoding: 'utf8' }) });
    let first = true, rows = 0;
    for await (const line of rl) {
      if (first) { first = false; continue; }
      const f = line.split(',');
      if (f.length < 11) continue;
      rows++;
      const district = TPE_DISTRICT[f[1]] || f[1];
      const k = [city, district, f[4], toHalf(f[6]).replace('巷', ''), toHalf(f[7]).replace('弄', ''), baseNo(f[8])].join('|');
      if (!wanted.has(k) || found.has(k)) continue;
      const x = parseFloat(f[9]), y = parseFloat(f[10]);
      if (Number.isFinite(x) && Number.isFinite(y)) found.set(k, twd97ToWgs84(x, y));
    }
    console.log(`  掃過 ${file}:${rows.toLocaleString()} 筆`);
  }
  return found;
}

// 兩座標距離(公尺),用來量誤差。
export function distanceM(a, b) {
  const R = 6371000, toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// ── 主流程 ────────────────────────────────────────────────────────────
const MODE = process.argv[2] || '--report';

// 驗證用:先前由 OSM/Nominatim 實查命中門牌的點(獨立來源,可當標準答案)。
const KNOWN = [
  { address: '台北市大同區迪化街一段61號', name: '霞海城隍廟', lat: 25.0556, lng: 121.5102 },
  { address: '台北市大同區迪化街一段21號', name: '永樂市場', lat: 25.0549, lng: 121.5106 },
  { address: '台北市大同區迪化街一段207號', name: '迪化207博物館', lat: 25.0595, lng: 121.5095 },
];

const data = JSON.parse(fs.readFileSync(BUILTIN, 'utf8'));

if (MODE === '--validate') {
  const wanted = new Map();
  for (const k of KNOWN) { const p = parseAddress(k.address); if (p) wanted.set(keyOf(p), k); }
  console.log(`驗證 ${wanted.size} 個「已由 OSM 獨立查證」的門牌…`);
  const found = await lookupAll(new Set(wanted.keys()));
  console.log('\n門牌資料 vs OSM 實查:');
  let ok = 0;
  for (const [k, ref] of wanted) {
    const got = found.get(k);
    if (!got) { console.log(`  ✗ 查無此門牌  ${ref.name}  ${ref.address}`); continue; }
    const d = distanceM(ref, got);
    if (d < 50) ok++;
    console.log(`  ${d < 50 ? '✓' : '✗'} ${ref.name}  門牌=${got.lat.toFixed(5)},${got.lng.toFixed(5)}  OSM=${ref.lat},${ref.lng}  差 ${d.toFixed(0)}m`);
  }
  console.log(`\n結論:${ok}/${wanted.size} 落在 50m 內(TWD97→WGS84 換算與比對邏輯${ok === wanted.size ? '正確' : '有問題,先別套用'})`);
} else {
  // report / apply:對全部有門牌的點做定位
  const targets = [];
  for (const g of data.groups) {
    for (const p of g.points) {
      const parsed = p.address ? parseAddress(p.address) : null;
      targets.push({ g, p, parsed, key: parsed ? keyOf(parsed) : null });
    }
  }
  const resolvable = targets.filter((t) => t.key);
  console.log(`總點數 ${targets.length},可解析門牌 ${resolvable.length},掃描中…`);
  const found = await lookupAll(new Set(resolvable.map((t) => t.key)));

  let hit = 0, moved = [];
  for (const t of resolvable) {
    const got = found.get(t.key);
    if (!got) continue;
    hit++;
    const d = distanceM({ lat: t.p.lat, lng: t.p.lng }, got);
    moved.push({ t, got, d });
  }
  moved.sort((a, b) => b.d - a.d);
  console.log(`\n門牌命中 ${hit}/${resolvable.length}(未命中 = 地址可能有誤或該門牌不存在)`);
  console.log('\n位移最大的 15 筆(位移越大,原本估的越離譜 —— 也可能是地址本身就錯):');
  moved.slice(0, 15).forEach(({ t, got, d }) => {
    console.log(`  ${String(Math.round(d)).padStart(5)}m  ${t.p.title}  ${t.p.address}  → ${got.lat.toFixed(5)},${got.lng.toFixed(5)}`);
  });

  const miss = resolvable.filter((t) => !found.has(t.key));
  if (miss.length) {
    console.log(`\n查無門牌(${miss.length} 筆,地址存疑,需人工確認):`);
    miss.forEach((t) => console.log(`  - ${t.p.title}  ${t.p.address}`));
  }
  const noAddr = targets.filter((t) => !t.key);
  console.log(`\n無門牌可查(${noAddr.length} 筆,如夜市/步道/巷弄,本來就沒門牌):`);
  noAddr.forEach((t) => console.log(`  - ${t.p.title}  ${t.p.address || '(無地址)'}`));

  if (MODE === '--apply') {
    for (const { t, got } of moved) {
      t.p.lat = +got.lat.toFixed(6);
      t.p.lng = +got.lng.toFixed(6);
      delete t.p.approx;                    // 門牌級座標 → 不再是概略
      t.p.geo = 'moi-address';              // 記錄來源,之後可辨識哪些已補正
    }
    fs.writeFileSync(BUILTIN, JSON.stringify(data, null, 2) + '\n');
    console.log(`\n已寫回 ${BUILTIN}:${hit} 點改為門牌級座標(approx 移除、標記 geo:"moi-address")`);
  } else {
    console.log('\n(這是 --report,沒有改檔。確認無誤後用 --apply 寫回)');
  }
}
