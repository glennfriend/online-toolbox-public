// jmdict.mjs — 解析 EDRDG 官方 JMdict_e_examp.gz(XML,含英文釋義與精選例句)。
//
// 檔案格式非常規律(每個元素一行),用正規表示式逐個 <entry> 解析即可,不需要 XML 套件。
// DTD 自訂實體(&v5k; 這類詞性/標記代碼)保留「代碼本身」,說明文字另外從 DTD 收進 entities,
// 前端再對代碼給中文標籤 —— 比展開成英文長句好用、也省空間。

import fs from 'node:fs';
import zlib from 'node:zlib';

const PREDEF = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const unesc = (s) => s.replace(/&(\w+);/g, (m, n) => PREDEF[n] ?? m);
const code = (s) => { const m = /^&([\w.-]+);$/.exec(s.trim()); return m ? m[1] : s.trim(); };

function all(block, tag) {
  const re = new RegExp(`<${tag}(?: [^>]*)?>([\\s\\S]*?)</${tag}>`, 'g');
  return [...block.matchAll(re)].map((m) => m[1]);
}
function allWithAttr(block, tag) {
  const re = new RegExp(`<${tag}((?: [^>]*)?)>([\\s\\S]*?)</${tag}>`, 'g');
  return [...block.matchAll(re)].map((m) => ({ attr: m[1], text: m[2] }));
}
const attr = (a, name) => { const m = new RegExp(`${name}="([^"]*)"`).exec(a || ''); return m ? m[1] : null; };

export function loadJmdict(file) {
  const xml = zlib.gunzipSync(fs.readFileSync(file)).toString('utf8');

  const entities = {};
  for (const m of xml.matchAll(/<!ENTITY ([\w.-]+) "([^"]*)">/g)) entities[m[1]] = m[2];
  const created = (/JMdict created: ([\d-]+)/.exec(xml) || [])[1] || null;

  const entries = [];
  const start = xml.indexOf('<entry>');
  for (const m of xml.slice(start).matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const b = m[1];
    const id = +all(b, 'ent_seq')[0];
    const k = all(b, 'k_ele').map((e) => ({
      t: unesc(all(e, 'keb')[0]),
      inf: all(e, 'ke_inf').map(code),
      pri: all(e, 'ke_pri').map((s) => s.trim()),
    }));
    const r = all(b, 'r_ele').map((e) => ({
      t: unesc(all(e, 'reb')[0]),
      inf: all(e, 're_inf').map(code),
      pri: all(e, 're_pri').map((s) => s.trim()),
      nokanji: /<re_nokanji\s*\/?>/.test(e),
      restr: all(e, 're_restr').map(unesc),
    }));
    let lastPos = [];
    const s = all(b, 'sense').map((e) => {
      let pos = all(e, 'pos').map(code);
      if (pos.length) lastPos = pos; else pos = lastPos;   // JMdict 規則:沒寫 pos 就沿用前一個義項
      const sense = {
        pos,
        misc: all(e, 'misc').map(code),
        field: all(e, 'field').map(code),
        dial: all(e, 'dial').map(code),
        info: all(e, 's_inf').map(unesc),
        stagk: all(e, 'stagk').map(unesc),
        stagr: all(e, 'stagr').map(unesc),
        xref: all(e, 'xref').map(unesc),
        ant: all(e, 'ant').map(unesc),
        ls: allWithAttr(e, 'lsource').map(({ attr: a, text }) => [attr(a, 'xml:lang') || 'eng', unesc(text)]),
        gloss: allWithAttr(e, 'gloss').map(({ attr: a, text }) => [unesc(text), attr(a, 'g_type')]),
        ex: all(e, 'example').map((x) => {
          const sents = allWithAttr(x, 'ex_sent');
          const ja = sents.find((t) => attr(t.attr, 'xml:lang') === 'jpn');
          const en = sents.find((t) => attr(t.attr, 'xml:lang') === 'eng');
          return ja ? [unesc(ja.text), en ? unesc(en.text) : ''] : null;
        }).filter(Boolean),
      };
      return sense;
    });
    entries.push({ id, k, r, s });
  }
  return { entities, created, entries };
}

// 常用度 → 排序分數(越小越常用)。JMdict 的 nfXX(每日新聞詞頻,每 500 詞一級)最細;
// news1/ichi1/spec1/spec2/gai1 = 「常用」;*2 = 次常用;都沒有 = 不常用。
export function priRank(pri) {
  let best = 100;
  for (const p of pri) {
    const nf = /^nf(\d\d)$/.exec(p);
    if (nf) best = Math.min(best, +nf[1]);
    else if (/^(news1|ichi1|spec1|spec2|gai1)$/.test(p)) best = Math.min(best, 50);
    else if (/^(news2|ichi2|gai2)$/.test(p)) best = Math.min(best, 70);
  }
  return best;
}
export const isCommon = (pri) => pri.some((p) => /^(news1|ichi1|spec1|spec2|gai1)$/.test(p));
