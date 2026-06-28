// preprocess.js — 純 canvas 影像前處理(無外部相依,獨立模組)。
//
// 目的:把「小字 / 低對比 / 偏暗」的圖整理成模型更好認的樣子。對清晰文件未必有幫助,
// 故在 UI 是「預設關閉」的選項。做三件事:
//   1) 放大小圖 — 圖太小時等比放大,讓文字筆劃有足夠細節(辨識會把每個文字框縮到固定高度)。
//   2) 轉灰階    — 去色,降低彩色背景干擾。
//   3) 拉對比    — 用 2%/98% 百分位做線性拉伸,避免極端噪點主導,讓字黑背景白更分明。
//
// 刻意「不做」自動去歪斜(deskew):可靠的角度偵測較重,且偵錯時容易把本來正的圖轉歪、反而更糟。
// 寧缺勿濫 —— 等真的需要再單獨評估。

const UPSCALE_TARGET = 1500;  // 長邊小於此值就放大到此(px)
const MAX_SCALE = 3;          // 放大倍率上限

// File / Blob → HTMLCanvasElement(原尺寸)。
export async function blobToCanvas(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// 對 canvas 做前處理,回傳「處理後的新 canvas」(不改動原圖)。
export function preprocess(src) {
  const canvas = upscaleSmall(src);   // 可能回傳同一張(免放大時)
  grayscaleContrast(canvas);          // 就地處理
  return canvas;
}

// 圖太小就等比放大;夠大則原樣返回。
function upscaleSmall(src) {
  const long = Math.max(src.width, src.height);
  if (long >= UPSCALE_TARGET) return src;
  const scale = Math.min(MAX_SCALE, UPSCALE_TARGET / long);
  const c = document.createElement('canvas');
  c.width = Math.round(src.width * scale);
  c.height = Math.round(src.height * scale);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

// 灰階 + 百分位對比拉伸(就地改寫傳入的 canvas)。
function grayscaleContrast(canvas) {
  const ctx = canvas.getContext('2d');
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const n = d.length / 4;

  // 一次掃描:轉灰階、建直方圖。
  const lum = new Uint8ClampedArray(n);
  const hist = new Uint32Array(256);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const g = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
    lum[j] = g;
    hist[g]++;
  }

  // 取 2% / 98% 百分位當拉伸端點,排除極端噪點。
  const lo = percentile(hist, n, 0.02);
  const hi = percentile(hist, n, 0.98);
  const range = Math.max(1, hi - lo);

  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    let v = ((lum[j] - lo) / range) * 255;
    v = v < 0 ? 0 : v > 255 ? 255 : v;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
}

// 由直方圖找出累積到比例 p 時的灰階值(0–255)。
function percentile(hist, total, p) {
  const target = total * p;
  let acc = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= target) return v;
  }
  return 255;
}
