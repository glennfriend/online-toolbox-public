// duckdb.js — 【外部相依】DuckDB-Wasm 由 CDN 載入,不內嵌。讓 CSV 能直接下任意 SQL(group by/join…)。
//
// 跟 lib/mermaid.js 一樣:集中在這個檔、標明是外部的;要換版本/換 library 只動這裡。
// 錯誤分兩種,各自丟出清楚訊息:載入失敗(CDN/網路)vs SQL 執行失敗。
//
// DuckDB-Wasm 的 worker 在 CDN 上,跨網域不能直接 new Worker → 用 blob importScripts 包一層繞過。

const VER = '1.29.0';
const CDN = `https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@${VER}/+esm`;

let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const duckdb = await import(/* @vite-ignore */ CDN);
      const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles());
      const workerUrl = URL.createObjectURL(
        new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' }),
      );
      const worker = new Worker(workerUrl);
      const db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), worker);
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      URL.revokeObjectURL(workerUrl);
      return db;
    })().catch((e) => {
      dbPromise = null; // 失敗就重置,下次可重試
      throw new Error('無法載入外部 DuckDB-Wasm(CDN:' + CDN + ')。可能是網路 / CDN / 瀏覽器不支援。原始錯誤:' + (e && e.message ? e.message : e));
    });
  }
  return dbPromise;
}

// 把 CSV/TSV 文字當成資料表 t,跑使用者的 SQL,回傳結果(CSV 文字,可再往下接)。
export async function queryCsv(text, sql) {
  const db = await getDb();
  const conn = await db.connect();
  try {
    await db.registerFileText('pf_input', text);
    // read_csv_auto 會自動偵測分隔符(逗號 / Tab)
    await conn.query("CREATE OR REPLACE TABLE t AS SELECT * FROM read_csv_auto('pf_input', header=true)");
    const res = await conn.query(sql);
    return arrowToCsv(res);
  } catch (e) {
    throw new Error('SQL 執行失敗:' + (e && e.message ? e.message : e));
  } finally {
    await conn.close();
  }
}

function arrowToCsv(res) {
  const cols = res.schema.fields.map((f) => f.name);
  const rows = res.toArray().map((r) => (typeof r.toJSON === 'function' ? r.toJSON() : r));
  const cell = (v) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [cols.join(',')];
  rows.forEach((row) => lines.push(cols.map((c) => cell(row[c])).join(',')));
  return lines.join('\n');
}
