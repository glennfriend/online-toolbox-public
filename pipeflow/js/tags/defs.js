// tags/defs.js — 各 tag 的定義(被 main.js import 以註冊)。
// 要新增一種 tag = 在這裡多 defineTag 一個;偵測與 UI 會自動帶上。

import { defineTag, matchAny, matchAll } from './index.js';

// 網址:任一條中即可
defineTag({
  name: 'url',
  match: matchAny([/^https?:\/\/\S+/im, /\bwww\.[a-z0-9-]+\.[a-z]{2,}/i]),
});

// 內文含網址(讓「萃取 urls」出現);與單純是一條 url 不同
defineTag({
  name: 'has-urls',
  match: matchAny([/https?:\/\/\S+/i]),
});

// CSV:有逗號、多行,且開頭不是 { 或 [(避免把 JSON 誤判成 CSV)
defineTag({
  name: 'csv',
  match: matchAll([/,/, /\n\s*\S/, /^\s*[^{[\s]/]),
});

// TSV:有 Tab 且 多行
defineTag({
  name: 'tsv',
  match: matchAll([/\t/, /\n\s*\S/]),
});

// Markdown 表格:有 | 且 有 |---| 分隔線
defineTag({
  name: 'markdown',
  match: matchAll([/\|/, /^\s*\|?[\s:|-]*-{2,}[\s:|-]*\|/m]),
});

// JSON:開頭是 { 或 [ 且能 parse(自訂判斷)
defineTag({
  name: 'json',
  match: (s) => {
    const t = s.trim();
    if (t[0] !== '{' && t[0] !== '[') return false;
    try { JSON.parse(t); return true; } catch { return false; }
  },
});

// 數字清單:多行,且大多數行是純數字
defineTag({
  name: 'number-list',
  match: (s) => {
    const lines = s.trim().split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return false;
    const numeric = lines.filter((l) => /^-?[\d,]+(\.\d+)?$/.test(l.trim())).length;
    return numeric >= lines.length * 0.7;
  },
});
