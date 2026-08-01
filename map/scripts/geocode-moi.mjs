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

// 各市 CSV 只有「鄉鎮市區代碼」沒有區名。以下對照表都是**由資料本身的代表街道反推並逐一核對**過
// (例:台北 63000060 出現南京西路/民權西路 → 大同區;高雄 6400100 出現七賢三路 → 鹽埕區)。
const TPE_DISTRICT = {
  63000010: '松山區', 63000020: '信義區', 63000030: '大安區', 63000040: '中山區',
  63000050: '中正區', 63000060: '大同區', 63000070: '萬華區', 63000080: '文山區',
  63000090: '南港區', 63000100: '內湖區', 63000110: '士林區', 63000120: '北投區',
};

const TXG_DISTRICT = {
  6600100: '中區', 6600200: '東區', 6600300: '南區', 6600400: '西區', 6600500: '北區',
  6600600: '西屯區', 6600700: '南屯區', 6600800: '北屯區', 6600900: '豐原區', 6601000: '東勢區',
  6601100: '大甲區', 6601200: '清水區', 6601300: '沙鹿區', 6601400: '梧棲區', 6601500: '后里區',
  6601600: '神岡區', 6601700: '潭子區', 6601800: '大雅區', 6601900: '新社區', 6602000: '石岡區',
  6602100: '外埔區', 6602200: '大安區', 6602300: '烏日區', 6602400: '大肚區', 6602500: '龍井區',
  6602600: '霧峰區', 6602700: '太平區', 6602800: '大里區', 6602900: '和平區',
};

const KHH_DISTRICT = {
  6400100: '鹽埕區', 6400200: '鼓山區', 6400300: '左營區', 6400400: '楠梓區', 6400500: '三民區',
  6400600: '新興區', 6400700: '前金區', 6400800: '苓雅區', 6400900: '前鎮區', 6401000: '旗津區',
  6401100: '小港區', 6401200: '鳳山區', 6401300: '林園區', 6401400: '大寮區', 6401500: '大樹區',
  6401600: '大社區', 6401700: '仁武區', 6401800: '鳥松區', 6401900: '岡山區', 6402000: '橋頭區',
  6402100: '燕巢區', 6402200: '田寮區', 6402300: '阿蓮區', 6402400: '路竹區', 6402500: '湖內區',
  6402600: '茄萣區', 6402700: '永安區', 6402800: '彌陀區', 6402900: '梓官區', 6403000: '旗山區',
  6403100: '美濃區', 6403200: '六龜區', 6403300: '甲仙區', 6403400: '杉林區', 6403500: '內門區',
  6403600: '茂林區', 6403700: '桃源區', 6403800: '那瑪夏區',
};

// 沒有門牌 CSV 的縣市,仍需要行政區清單才能正確切「區名 / 路名」。
const TNN_DISTRICTS = ['中西區', '東區', '南區', '北區', '安平區', '安南區', '永康區', '歸仁區', '新化區',
  '左鎮區', '玉井區', '楠西區', '南化區', '仁德區', '關廟區', '龍崎區', '官田區', '麻豆區', '佳里區',
  '西港區', '七股區', '將軍區', '學甲區', '北門區', '新營區', '後壁區', '白河區', '東山區', '六甲區',
  '下營區', '柳營區', '鹽水區', '善化區', '大內區', '山上區', '新市區', '安定區'];
const ILA_DISTRICTS = ['宜蘭市', '羅東鎮', '蘇澳鎮', '頭城鎮', '礁溪鄉', '壯圍鄉', '員山鄉', '冬山鄉',
  '五結鄉', '三星鄉', '大同鄉', '南澳鄉'];

// 檔名 → 該市設定。lonLat 有值表示 CSV 已自帶 WGS84 經緯度(台中),不必自己換算 TWD97。
const CITIES = [
  { city: '臺北市', match: /taipei|臺北|台北/i, districts: TPE_DISTRICT },
  { city: '臺中市', match: /taichung|臺中|台中/i, districts: TXG_DISTRICT, lonLat: [11, 12] },
  { city: '高雄市', match: /kaohsiung|高雄/i, districts: KHH_DISTRICT },
  { city: '臺南市', match: /tainan|臺南|台南/i, districts: null },   // 待台南開放平台恢復後補
  { city: '宜蘭縣', match: /yilan|宜蘭/i, districts: null },
];

// 城市 → 行政區名稱清單(給 parseAddress 切「區名 / 路名」用)。
const DISTRICTS_OF = {
  '台北市': Object.values(TPE_DISTRICT),
  '台中市': Object.values(TXG_DISTRICT),
  '高雄市': Object.values(KHH_DISTRICT),
  '台南市': TNN_DISTRICTS,
  '宜蘭縣': ILA_DISTRICTS,
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

// 只取「N號」「N之M號」(台中還有「2之3之2號」)這段;丟掉樓層,同棟樓共用一組座標。
function baseNo(s) {
  const m = toHalf(s).match(/^(\d+(?:之\d+)*號)/);
  return m ? m[1] : '';
}

// 「53-4號」「53之4號」是同一個門牌;CSV 一律用「之」。先統一,否則 53-4 會被誤讀成 4 號。
const normDash = (s) => s.replace(/(\d+)\s*[-–—]\s*(\d+)\s*號/g, '$1之$2號');

// 「臺」與「台」在路名/區名混用(CSV 寫「臺灣大道」,一般人寫「台灣大道」)。
// 組 key 前兩邊都轉成「台」,否則整條臺灣大道都會查不到。
const normTai = (s) => String(s ?? '').replace(/臺/g, '台');

// 街道名多數放在「街路段」欄;但老聚落(如旗津旗下巷)街路段是空的,名字在「地區」欄。
const streetOf = (f) => f[4] || f[5] || '';

// 我們的地址字串 → { city, district, street, lane, alley, no };無法解析回 null。
export function parseAddress(addr) {
  const a = normDash(toHalf(addr).replace(/\s+/g, ''));
  // 區名一律「比對該市的實際行政區清單」,不用正規表示式猜 —— 猜會出事:
  //   非貪婪 → 「前鎮區」被切成「前鎮」+「區新光路」(鎮 在字元類裡)
  //   貪婪   → 「中區市府路」被切成「中區市」+「府路」(市 也在字元類裡)
  const cm = a.match(/^(台北市|臺北市|台中市|臺中市|台南市|臺南市|高雄市|宜蘭縣)(.+)$/);
  if (!cm) return null;
  const city = cm[1];
  const list = DISTRICTS_OF[normTai(city)] || [];
  // 由長到短比對,避免「東區」先吃掉「東區…」而漏掉更長的正解
  const district = [...list].sort((x, y) => y.length - x.length).find((d) => normTai(cm[2]).startsWith(normTai(d)));
  if (!district) return null;
  const rest = cm[2].slice(district.length);

  const no = (rest.match(/(\d+(?:之\d+)*)號/) || [])[1];
  if (!no) return null;                                   // 沒門牌號 → 這份資料救不了
  const lane = (rest.match(/(\d+)巷/) || [])[1] || '';
  const alley = (rest.match(/(\d+)弄/) || [])[1] || '';
  const street = rest.split(/\d+巷|\d+弄|\d+(?:之\d+)*號/)[0];
  if (!street) return null;

  return { city: city.replace('台', '臺'), district, street, lane, alley, no: no + '號' };
}

export const keyOf = (p) => [p.city, p.district, p.street, p.lane, p.alley, p.no].map(normTai).join('|');

// ── 掃 CSV,只撿我們要的門牌(單趟串流,不建 1.1M 筆索引)─────────────
export async function lookupAll(wanted) {
  const found = new Map();
  const files = fs.existsSync(SRC_DIR) ? fs.readdirSync(SRC_DIR).filter((f) => /\.csv$/i.test(f)) : [];
  if (!files.length) throw new Error(`找不到門牌 CSV。請先依 ${path.join(HERE, 'README.md')} 下載到 ${SRC_DIR}`);

  for (const file of files) {
    const cfg = CITIES.find((c) => c.match.test(file));
    if (!cfg) { console.warn(`⚠ 跳過無法判斷縣市的檔案:${file}`); continue; }

    const rl = readline.createInterface({ input: fs.createReadStream(path.join(SRC_DIR, file), { encoding: 'utf8' }) });
    let first = true, rows = 0;
    for await (const line of rl) {
      if (first) { first = false; continue; }
      const f = line.split(',');
      if (f.length < 11) continue;
      rows++;
      const district = (cfg.districts && cfg.districts[f[1]]) || f[1];
      const k = [cfg.city, district, streetOf(f), toHalf(f[6]).replace('巷', ''), toHalf(f[7]).replace('弄', ''), baseNo(f[8])]
        .map(normTai).join('|');
      if (!wanted.has(k) || found.has(k)) continue;
      if (cfg.lonLat) {                                   // CSV 自帶 WGS84(台中)→ 直接用,不必換算
        const lng = parseFloat(f[cfg.lonLat[0]]), lat = parseFloat(f[cfg.lonLat[1]]);
        if (Number.isFinite(lat) && Number.isFinite(lng)) found.set(k, { lat, lng });
      } else {
        const x = parseFloat(f[9]), y = parseFloat(f[10]);
        if (Number.isFinite(x) && Number.isFinite(y)) found.set(k, twd97ToWgs84(x, y));
      }
    }
    console.log(`  掃過 ${file}:${rows.toLocaleString()} 筆`);
  }
  return found;
}

// 退路:門牌庫查無「該號」時,找同一路段(同巷弄)號碼最接近的門牌當概略位置。
// 用於「地址在各來源一致、但政府門牌登記有缺口」的情況 —— 回傳值一律標 approx,不假裝精確。
//   wanted: Map<key, {city,district,street,lane,alley,no}>
//   回傳 Map<key, {lat,lng,viaNo,gap}>
export async function nearestOnStreet(wanted) {
  const out = new Map();
  const files = fs.existsSync(SRC_DIR) ? fs.readdirSync(SRC_DIR).filter((f) => /\.csv$/i.test(f)) : [];
  // 每個 key 蒐集同路段所有號碼 → 之後挑最近的
  const pool = new Map();   // key -> [{n, lat, lng}]
  for (const file of files) {
    const cfg = CITIES.find((c) => c.match.test(file));
    if (!cfg) continue;
    const rl = readline.createInterface({ input: fs.createReadStream(path.join(SRC_DIR, file), { encoding: 'utf8' }) });
    let first = true;
    for await (const line of rl) {
      if (first) { first = false; continue; }
      const f = line.split(',');
      if (f.length < 11) continue;
      const district = (cfg.districts && cfg.districts[f[1]]) || f[1];
      const no = baseNo(f[8]);
      if (!no) continue;
      const streetKey = [cfg.city, district, streetOf(f), toHalf(f[6]).replace('巷', ''), toHalf(f[7]).replace('弄', '')]
        .map(normTai).join('|');
      for (const [key, p] of wanted) {
        const want = [p.city, p.district, p.street, p.lane, p.alley].map(normTai).join('|');
        if (want !== streetKey) continue;
        const n = parseInt(no, 10);
        if (!Number.isFinite(n)) continue;
        const pt = cfg.lonLat
          ? { lat: parseFloat(f[cfg.lonLat[1]]), lng: parseFloat(f[cfg.lonLat[0]]) }
          : twd97ToWgs84(parseFloat(f[9]), parseFloat(f[10]));
        if (!Number.isFinite(pt.lat) || !Number.isFinite(pt.lng)) continue;
        if (!pool.has(key)) pool.set(key, []);
        pool.get(key).push({ n, ...pt });
      }
    }
  }
  for (const [key, arr] of pool) {
    const target = parseInt(wanted.get(key).no, 10);
    let best = null;
    for (const c of arr) {
      const gap = Math.abs(c.n - target);
      if (!best || gap < best.gap) best = { ...c, gap };
    }
    if (best) out.set(key, { lat: best.lat, lng: best.lng, viaNo: best.n, gap: best.gap });
  }
  return out;
}

// 兩座標距離(公尺),用來量誤差。
export function distanceM(a, b) {
  const R = 6371000, toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// ── 主流程 ────────────────────────────────────────────────────────────
// 只有「直接執行」才跑;被 import 當函式庫時不該有副作用。
const RUN_DIRECTLY = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (RUN_DIRECTLY) await main();

async function main() {
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
}
