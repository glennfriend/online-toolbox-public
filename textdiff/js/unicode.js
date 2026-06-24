// unicode.js — 不可見/危險字元的共用資料與小工具(reveal 與 inspect 共用)。

// 碼點 → [顯示用符號, 中文說明]
export const INVISIBLE = {
  0x00A0: ['␠', 'NBSP 不斷行空格'],
  0x2007: ['␠', 'FIGURE SPACE 數字空格'],
  0x202F: ['␠', '窄不斷行空格'],
  0x3000: ['␣', '全形空格'],
  0x200B: ['∅', 'ZWSP 零寬空格'],
  0x200C: ['∅', 'ZWNJ 零寬不連字'],
  0x200D: ['∅', 'ZWJ 零寬連字'],
  0x2060: ['∅', 'WORD JOINER'],
  0xFEFF: ['∅', 'BOM / 零寬不斷行空格'],
  0x00AD: ['-', 'SHY 軟連字號'],
  0x200E: ['‹', 'LRM 左至右標記'],
  0x200F: ['›', 'RLM 右至左標記'],
  0x202A: ['⟦', 'LRE'], 0x202B: ['⟦', 'RLE'], 0x202C: ['⟧', 'PDF'],
  0x202D: ['⟦', 'LRO'], 0x202E: ['⟦', 'RLO 右至左覆寫(Trojan Source 風險!)'],
};

export const isInvisible = (cp) => Object.prototype.hasOwnProperty.call(INVISIBLE, cp);
export const u = (cp) => 'U+' + cp.toString(16).toUpperCase().padStart(4, '0');
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
