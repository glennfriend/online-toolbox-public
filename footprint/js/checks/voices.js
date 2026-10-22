import { registerCheck } from '../registry.js';
import { row, unsupported } from '../util.js';
registerCheck({ id: 'voices', group: '指紋', title: '語音合成 voices', async run() {
  if (!globalThis.speechSynthesis) return [unsupported('語音合成 voices', '瀏覽器未提供 speechSynthesis')];
  let voices = speechSynthesis.getVoices();
  if (!voices.length) await new Promise(resolve => {
    let timer;
    const finish = () => { clearTimeout(timer); speechSynthesis.removeEventListener('voiceschanged', finish); resolve(); };
    speechSynthesis.addEventListener('voiceschanged', finish);
    timer = setTimeout(finish, 1500);
  });
  voices = speechSynthesis.getVoices();
  return [row('語音合成 voices 數量', voices.length, '只查清單, 不播放聲音. 0 也可能是語音清單尚未載入')];
} });
