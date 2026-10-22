import { registerCheck } from '../registry.js';
import { deadline, hash, row, unsupported } from '../util.js';
registerCheck({ id: 'audio', group: '指紋', title: 'Audio 指紋', async run() {
  const Context = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  if (!Context) return [unsupported('Audio 指紋', '瀏覽器未提供 OfflineAudioContext')];
  const context = new Context(1, 44100, 44100);
  const oscillator = context.createOscillator();
  const compressor = context.createDynamicsCompressor();
  oscillator.type = 'triangle'; oscillator.frequency.value = 10000;
  compressor.threshold.value = -50; compressor.knee.value = 40; compressor.ratio.value = 12;
  compressor.attack.value = 0; compressor.release.value = .25;
  oscillator.connect(compressor); compressor.connect(context.destination); oscillator.start(0);
  try {
    const buffer = await deadline(context.startRendering(), 5000, 'OfflineAudioContext');
    const samples = Array.from(buffer.getChannelData(0).slice(4500, 5000));
    return [row('Audio SHA-256', await hash(samples), '離線音訊運算結果, 不播放聲音, 不使用麥克風. 瀏覽器可能加入防追蹤雜訊')];
  } finally { oscillator.disconnect(); compressor.disconnect(); }
} });
