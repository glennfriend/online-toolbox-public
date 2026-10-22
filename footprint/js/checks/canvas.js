import { registerCheck } from '../registry.js';
import { hash, row } from '../util.js';
registerCheck({ id: 'canvas', group: '指紋', title: 'Canvas 指紋', async run() {
  const canvas = document.createElement('canvas');
  canvas.width = 280; canvas.height = 70;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('瀏覽器未提供 Canvas 2D context');
  context.fillStyle = '#f60'; context.fillRect(12, 10, 180, 45);
  context.font = '18px Arial'; context.textBaseline = 'alphabetic';
  context.fillStyle = '#246'; context.fillText('Footprint 瀏覽資訊 Aa 0123 👣', 4, 30);
  context.globalCompositeOperation = 'multiply';
  context.fillStyle = 'rgba(40,180,130,.65)'; context.beginPath(); context.arc(140, 35, 26, 0, Math.PI * 2); context.fill();
  return [row('Canvas SHA-256', await hash(canvas.toDataURL()), '文字與圖形繪製結果的摘要. 字型與繪圖環境會影響結果, 防追蹤功能可能加入隨機值')];
} });
