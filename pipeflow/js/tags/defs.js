// tags/defs.js — 各 tag 的定義(被 main.js import 以註冊)。
// 每個 tag 都帶 desc(真正的意思),會顯示在滑鼠提示上 → 讀程式 / 用工具時都能確認語意,減少誤會。
// 要新增一種 tag = 在這裡多 defineTag 一個;偵測與 UI 會自動帶上。

import { defineTag, matchAny, matchAll } from './index.js';

// 網址:整段就是一個網址
defineTag({
  name: 'url',
  desc: '整段內容就是一個網址',
  match: matchAny([/^https?:\/\/\S+/im, /\bwww\.[a-z0-9-]+\.[a-z]{2,}/i]),
});

// 內文含網址(讓「萃取 urls」出現);與「整段是 url」不同
defineTag({
  name: 'has-urls',
  desc: '內文裡含有一個以上的網址',
  match: matchAny([/https?:\/\/\S+/i]),
});

// CSV:有逗號、多行,且開頭不是 < { [(避免把 HTML / JSON 誤判成 CSV)
defineTag({
  name: 'csv',
  desc: '逗號分隔、多行的表格(開頭不是 < { [)',
  match: matchAll([/,/, /\n\s*\S/, /^\s*[^<{[\s]/]),
});

// HTML 原始碼:有 DOCTYPE/<html> 或常見成對/自閉合標籤
defineTag({
  name: 'html',
  desc: 'HTML 原始碼',
  match: matchAny([
    /<!doctype html/i,
    /<html[\s>]/i,
    /<(div|p|a|span|table|ul|li|h[1-6]|body|head|section|article)\b[^>]*>[\s\S]*<\/\1>/i,
    /<(br|img|meta|link|hr|input)\b[^>]*\/?>/i,
  ]),
});

// TSV:有 Tab 且 多行
defineTag({
  name: 'tsv',
  desc: 'Tab 分隔、多行的表格(從 Excel / Google Sheet 複製就是這種)',
  match: matchAll([/\t/, /\n\s*\S/]),
});

// Markdown 表格:有 | 且 有 |---| 分隔線
defineTag({
  name: 'markdown',
  desc: 'Markdown 表格(有 | 與 ---| 分隔線)',
  match: matchAll([/\|/, /^\s*\|?[\s:|-]*-{2,}[\s:|-]*\|/m]),
});

// JSON:開頭是 { 或 [ 且能 parse
defineTag({
  name: 'json',
  desc: '能被解析的 JSON(物件或陣列)',
  match: (s) => {
    const t = s.trim();
    if (t[0] !== '{' && t[0] !== '[') return false;
    try { JSON.parse(t); return true; } catch { return false; }
  },
});

// 數字清單:多行,且大多數行是純數字
defineTag({
  name: 'number-list',
  desc: '多行,且大多數行是純數字',
  match: (s) => {
    const lines = s.trim().split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return false;
    const numeric = lines.filter((l) => /^-?[\d,]+(\.\d+)?$/.test(l.trim())).length;
    return numeric >= lines.length * 0.7;
  },
});

// 每一行的開頭都是數字(供「數字排序」用:只要有一行開頭不是數字,就不提供)
defineTag({
  name: 'num-lines',
  desc: '每一行的開頭都是數字',
  match: (s) => {
    const lines = s.trim().split(/\r?\n/).filter((l) => l.trim());
    return lines.length > 0 && lines.every((l) => /^\s*-?\d/.test(l));
  },
});

// Mermaid 圖表原始碼(flowchart / sequence / class …)
defineTag({
  name: 'mermaid',
  desc: 'Mermaid 圖表原始碼(flowchart / sequence / class …)',
  match: matchAny([
    /^\s*(graph|flowchart)\s+(TB|TD|BT|RL|LR)\b/im,
    /^\s*(sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|journey|gantt|pie|mindmap|gitGraph|timeline|quadrantChart)\b/im,
  ]),
});

// 多行(兩行以上)。hidden:不顯示成 chip,只用來閘控「排序」這類需要多行才有意義的 mod。
defineTag({
  name: 'multi-line',
  desc: '有兩行以上',
  hidden: true,
  match: (s) => s.trim().split(/\r?\n/).filter((l) => l.trim()).length >= 2,
});
