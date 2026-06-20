// translate.js — 翻譯 mod(參數化 + 非同步,用外部 lib/translate.js)。
//   • 輸出是「雙語」:每一段先原文、下一行接譯文,段與段之間空一行 → 仍是純文字,可再往下接 pipe。
//   • param:true → 目標語言代碼(預設 zh-TW),可改成 ja / zh-CN / en …,按「執行」重翻。
//   • 逐段翻譯:某一段失敗只在「那一段」標紅,其他段照常(絕不無聲、也不整批失敗)。

import { defineMod } from './index.js';
import { translateText } from '../lib/translate.js';

defineMod({
  id: 'translate',
  label: 'Google 翻譯',
  appliesTo: ['text', 'multi-line'], // 純文字 / 多行文章
  param: true,
  defaultParam: 'zh-TW',
  paramLabel: '目標語言代碼(zh-TW 繁中、zh-CN 簡中、ja 日、ko 韓、en 英、fr 法…),改完按「執行」',
  async: true,
  external: 'Google Translate(非官方端點;備援 MyMemory)',
  async run(input, tags, param) {
    const tl = (param || 'zh-TW').trim();
    const paras = input.split(/\n\s*\n/); // 依空行分段
    const out = [];
    for (const p of paras) {
      const orig = p.replace(/\s+$/, '');
      if (!orig.trim()) { out.push(''); continue; } // 保留空段落間距
      try {
        const zh = await translateText(orig, tl);
        out.push(orig + '\n' + zh);
      } catch (e) {
        out.push(orig + '\n❌ 翻譯失敗:' + e.message);
      }
    }
    return out.join('\n\n');
  },
});
