using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;

// ItemCut —— 配件去背(點陣圖)。
//
// 核心問題:單純「四邊泛洪清近白 → 透明」會從細縫漏進主體內部,把主體該有的白(白襯衫、
// 白雲內部)也挖成透明破洞;但主體之間的「寬」空隙(狗四腿之間)又必須保留透明。
// 解法:算出「真正的外部」= 泛洪的近白區,先侵蝕 R 像素(細縫會被切斷),只保留仍與邊緣相連的
// 部分,再膨脹 R 像素還原邊界。這樣:細縫相連的內部白 → 判為主體(不透明);寬空隙 → 仍是外部(透明)。
//
// Cut()  :原圖 → 去背 + 裁切;內部漏白還原成「原色」不透明。
// FillHoles():就地修已處理過的 PNG(沒有原圖時的搶救),封閉/細縫破洞 → 填白不透明。
public static class ItemCut
{
    // 由「候選外部遮罩 cand」算出「真正外部」:侵蝕 R → 保留與邊緣相連 → 膨脹 R。
    static bool[] TrueExterior(bool[] cand, int w, int h, int R)
    {
        int n = w * h;
        bool[] e = new bool[n];
        for (int y = 0; y < h; y++)
            for (int x = 0; x < w; x++)
            {
                bool all = true;
                for (int dy = -R; dy <= R && all; dy++)
                    for (int dx = -R; dx <= R; dx++)
                    {
                        int nx = x + dx, ny = y + dy;
                        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; // 界外視為外部(方便邊緣連通)
                        if (!cand[ny * w + nx]) { all = false; break; }
                    }
                e[y * w + x] = all;
            }

        bool[] core = new bool[n];
        var q = new Queue<int>();
        Action<int> seed = (i) => { if (e[i] && !core[i]) { core[i] = true; q.Enqueue(i); } };
        for (int x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
        for (int y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
        while (q.Count > 0)
        {
            int i = q.Dequeue(), x = i % w, y = i / w;
            if (x + 1 < w) seed(i + 1);
            if (x - 1 >= 0) seed(i - 1);
            if (y + 1 < h) seed(i + w);
            if (y - 1 >= 0) seed(i - w);
        }

        bool[] ext = new bool[n];
        for (int y = 0; y < h; y++)
            for (int x = 0; x < w; x++)
                if (core[y * w + x])
                    for (int dy = -R; dy <= R; dy++)
                        for (int dx = -R; dx <= R; dx++)
                        {
                            int nx = x + dx, ny = y + dy;
                            if (nx >= 0 && ny >= 0 && nx < w && ny < h) ext[ny * w + nx] = true;
                        }
        return ext;
    }

    public static void Cut(string inPath, string outPath, int thr) { Cut(inPath, outPath, thr, 6); }

    public static void Cut(string inPath, string outPath, int thr, int R)
    {
        using (var src = new Bitmap(inPath))
        {
            int w = src.Width, h = src.Height, n = w * h;
            var bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb);
            using (var g = Graphics.FromImage(bmp)) g.DrawImage(src, 0, 0, w, h);

            // 1) 四邊泛洪近白 = 候選外部
            bool[] cand = new bool[n]; bool[] seen = new bool[n];
            var q = new Queue<int>();
            Action<int, int> push = (x, y) => {
                if (x < 0 || y < 0 || x >= w || y >= h) return;
                int idx = y * w + x; if (seen[idx]) return; seen[idx] = true;
                Color c = bmp.GetPixel(x, y);
                if (c.R >= thr && c.G >= thr && c.B >= thr) { cand[idx] = true; q.Enqueue(idx); }
            };
            for (int x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
            for (int y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
            while (q.Count > 0) { int i = q.Dequeue(); int x = i % w, y = i / w; push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }

            // 2) 真正外部(細縫漏入的內部白會被排除)
            bool[] ext = TrueExterior(cand, w, h, R);

            // 3) 外部 → 透明;其餘(含被漏挖的內部白)→ 保留原色不透明。順便算主體外框。
            int minX = w, minY = h, maxX = -1, maxY = -1;
            for (int y = 0; y < h; y++)
                for (int x = 0; x < w; x++)
                {
                    int idx = y * w + x;
                    if (ext[idx]) bmp.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
                    else { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
                }
            if (maxX < 0) { bmp.Save(outPath, ImageFormat.Png); bmp.Dispose(); return; }

            int pad = 4;
            minX = Math.Max(0, minX - pad); minY = Math.Max(0, minY - pad);
            maxX = Math.Min(w - 1, maxX + pad); maxY = Math.Min(h - 1, maxY + pad);
            var outBmp = bmp.Clone(new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1), PixelFormat.Format32bppArgb);
            outBmp.Save(outPath, ImageFormat.Png);
            outBmp.Dispose(); bmp.Dispose();
        }
    }

    // 髒圖版:主體附近有雜質(散點、分鏡框、殘字)。去背後只保留「最大的連通塊」= 主體,
    // 其餘小塊(雜質)一律清成透明。適合 raw/items_before_noisy/。thr 通常要比乾淨圖低一點才吃得掉灰底。
    public static void CutNoisy(string inPath, string outPath, int thr) { CutNoisy(inPath, outPath, thr, 6); }

    public static void CutNoisy(string inPath, string outPath, int thr, int R)
    {
        using (var src = new Bitmap(inPath))
        {
            int w = src.Width, h = src.Height, n = w * h;
            var bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb);
            using (var g = Graphics.FromImage(bmp)) g.DrawImage(src, 0, 0, w, h);

            bool[] cand = new bool[n]; bool[] seen = new bool[n];
            var q = new Queue<int>();
            Action<int, int> push = (x, y) => {
                if (x < 0 || y < 0 || x >= w || y >= h) return;
                int idx = y * w + x; if (seen[idx]) return; seen[idx] = true;
                Color c = bmp.GetPixel(x, y);
                if (c.R >= thr && c.G >= thr && c.B >= thr) { cand[idx] = true; q.Enqueue(idx); }
            };
            for (int x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
            for (int y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
            while (q.Count > 0) { int i = q.Dequeue(); int x = i % w, y = i / w; push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }

            bool[] ext = TrueExterior(cand, w, h, R);

            // 最大連通塊(8 連通)= 主體;其餘 = 雜質
            int[] lbl = new int[n]; for (int i = 0; i < n; i++) lbl[i] = -1;
            int best = -1, bestSize = 0;
            var bfs = new Queue<int>();
            for (int s = 0; s < n; s++)
            {
                if (ext[s] || lbl[s] != -1) continue;
                int cur = s, size = 0; lbl[s] = s; bfs.Enqueue(s);
                while (bfs.Count > 0)
                {
                    int i = bfs.Dequeue(); size++;
                    int x = i % w, y = i / w;
                    for (int dy = -1; dy <= 1; dy++)
                        for (int dx = -1; dx <= 1; dx++)
                        {
                            int nx = x + dx, ny = y + dy;
                            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                            int j = ny * w + nx;
                            if (!ext[j] && lbl[j] == -1) { lbl[j] = s; bfs.Enqueue(j); }
                        }
                }
                if (size > bestSize) { bestSize = size; best = s; }
            }

            int minX = w, minY = h, maxX = -1, maxY = -1;
            for (int y = 0; y < h; y++)
                for (int x = 0; x < w; x++)
                {
                    int idx = y * w + x;
                    if (lbl[idx] == best) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
                    else bmp.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
                }
            if (maxX < 0) { bmp.Save(outPath, ImageFormat.Png); bmp.Dispose(); return; }

            int pad = 4;
            minX = Math.Max(0, minX - pad); minY = Math.Max(0, minY - pad);
            maxX = Math.Min(w - 1, maxX + pad); maxY = Math.Min(h - 1, maxY + pad);
            var outBmp = bmp.Clone(new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1), PixelFormat.Format32bppArgb);
            outBmp.Save(outPath, ImageFormat.Png);
            outBmp.Dispose(); bmp.Dispose();
        }
    }

    // 搶救:已處理過、沒有原圖時,把「封閉或細縫相連」的透明破洞填成不透明白;寬空隙(如狗腿間)保留透明。
    public static void FillHoles(string path, int R)
    {
        int w, h;
        using (var s = new Bitmap(path)) { w = s.Width; h = s.Height; }
        // 已裁切的圖外圍透明邊太薄(比侵蝕半徑還小),外部連通會被侵蝕掉 → 先加一圈透明邊 M。
        int M = R + 2;
        int W = w + 2 * M, H = h + 2 * M, N = W * H;
        var big = new Bitmap(W, H, PixelFormat.Format32bppArgb);
        using (var g = Graphics.FromImage(big))
        {
            g.Clear(Color.FromArgb(0, 0, 0, 0));
            using (var src = new Bitmap(path)) g.DrawImage(src, M, M, w, h);
        }

        bool[] trans = new bool[N];
        for (int y = 0; y < H; y++)
            for (int x = 0; x < W; x++)
                if (big.GetPixel(x, y).A <= 20) trans[y * W + x] = true;

        bool[] ext = TrueExterior(trans, W, H, R);
        int filled = 0;
        for (int y = 0; y < H; y++)
            for (int x = 0; x < W; x++)
            {
                int idx = y * W + x;
                if (trans[idx] && !ext[idx]) { big.SetPixel(x, y, Color.FromArgb(255, 255, 255, 255)); filled++; }
            }

        var outBmp = big.Clone(new Rectangle(M, M, w, h), PixelFormat.Format32bppArgb);   // 裁回原尺寸
        big.Dispose();
        outBmp.Save(path, ImageFormat.Png);
        outBmp.Dispose();
        Console.WriteLine("FillHoles " + System.IO.Path.GetFileName(path) + " filled=" + filled);
    }
}
