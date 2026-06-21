// arpabet.mjs — CMU 的 ARPAbet 音素 → IPA。純對照表,無相依。
// v1 簡化:重音數字(0/1/2)只用來決定 AH/ER 是否唸成弱化的 ə/ɚ,其餘不標重音符。

const MAP = {
  AA: 'ɑ', AE: 'æ', AH: 'ʌ', AO: 'ɔ', AW: 'aʊ', AY: 'aɪ',
  B: 'b', CH: 'tʃ', D: 'd', DH: 'ð', EH: 'ɛ', ER: 'ɝ', EY: 'eɪ',
  F: 'f', G: 'ɡ', HH: 'h', IH: 'ɪ', IY: 'i', JH: 'dʒ', K: 'k',
  L: 'l', M: 'm', N: 'n', NG: 'ŋ', OW: 'oʊ', OY: 'ɔɪ', P: 'p',
  R: 'ɹ', S: 's', SH: 'ʃ', T: 't', TH: 'θ', UH: 'ʊ', UW: 'u',
  V: 'v', W: 'w', Y: 'j', Z: 'z', ZH: 'ʒ',
};

// phonemes: 例如 ['AH0','B','AW1','T'] → 'əbaʊt'
export function arpaToIpa(phonemes) {
  let out = '';
  for (const ph of phonemes) {
    const m = ph.match(/^([A-Z]+)([0-2]?)$/);
    if (!m) continue;
    const base = m[1], stress = m[2];
    if (base === 'AH' && stress === '0') { out += 'ə'; continue; }
    if (base === 'ER' && stress === '0') { out += 'ɚ'; continue; }
    out += MAP[base] || '';
  }
  return out;
}
