// clipboard.js — 把影像 Blob 複製到剪貼簿(image/png),可直接貼成圖片。
// 多數瀏覽器寫入剪貼簿只接受 image/png,非 png 先用 canvas 轉檔。

export async function copyImageBlob(blob) {
  if (!navigator.clipboard || !window.ClipboardItem) {
    throw new Error('此瀏覽器不支援複製圖片');
  }
  const png = blob.type === 'image/png' ? blob : await toPng(blob);
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
}

// 任意影像 Blob → PNG Blob(blob 是我們自己 fetch 來的,畫到 canvas 不會被 tainted)
function toPng(blob) {
  return createImageBitmap(blob).then((bitmap) => {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0);
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  });
}
