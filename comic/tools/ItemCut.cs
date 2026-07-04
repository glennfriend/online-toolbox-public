using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;

// ItemCut —— 配件去背(點陣圖):從四角泛洪清掉近白背景 → 透明,再裁切到主體外框。
// 只清「與邊緣相連」的近白區域,所以主體內部的白(例如白外套)會保留。
// 用法(PowerShell):
//   Add-Type -Path ItemCut.cs -ReferencedAssemblies System.Drawing
//   [ItemCut]::Cut("in.png","out.png",232)
public static class ItemCut
{
    public static void Cut(string inPath, string outPath, int thr)
    {
        using (var src = new Bitmap(inPath))
        {
            int w = src.Width, h = src.Height;
            // 轉成可寫 alpha 的 32bpp
            var bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb);
            using (var g = Graphics.FromImage(bmp)) g.DrawImage(src, 0, 0, w, h);

            bool[] bg = new bool[w * h];          // true = 判定為背景(要透明)
            bool[] seen = new bool[w * h];
            var q = new Queue<int>();

            Action<int,int> push = (x, y) => {
                if (x < 0 || y < 0 || x >= w || y >= h) return;
                int idx = y * w + x;
                if (seen[idx]) return;
                seen[idx] = true;
                Color c = bmp.GetPixel(x, y);
                if (c.R >= thr && c.G >= thr && c.B >= thr) { bg[idx] = true; q.Enqueue(idx); }
            };

            // 四邊全部當種子(不只四角:有些圖主體貼近某一角,單靠四角泛洪不完整)
            for (int x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
            for (int y = 0; y < h; y++) { push(0, y); push(w - 1, y); }

            while (q.Count > 0) {
                int idx = q.Dequeue();
                int x = idx % w, y = idx / w;
                push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
            }

            // 背景 → 全透明;主體 → 保留。順便算主體外框。
            int minX = w, minY = h, maxX = -1, maxY = -1;
            for (int y = 0; y < h; y++)
                for (int x = 0; x < w; x++)
                {
                    int idx = y * w + x;
                    if (bg[idx]) { bmp.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0)); }
                    else
                    {
                        if (x < minX) minX = x; if (x > maxX) maxX = x;
                        if (y < minY) minY = y; if (y > maxY) maxY = y;
                    }
                }

            if (maxX < 0) { bmp.Save(outPath, ImageFormat.Png); bmp.Dispose(); return; } // 整張皆背景

            int pad = 4;
            minX = Math.Max(0, minX - pad); minY = Math.Max(0, minY - pad);
            maxX = Math.Min(w - 1, maxX + pad); maxY = Math.Min(h - 1, maxY + pad);
            int cw = maxX - minX + 1, ch = maxY - minY + 1;

            var outBmp = bmp.Clone(new Rectangle(minX, minY, cw, ch), PixelFormat.Format32bppArgb);
            outBmp.Save(outPath, ImageFormat.Png);
            outBmp.Dispose();
            bmp.Dispose();
        }
    }
}
