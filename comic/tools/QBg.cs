using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Collections.Generic;

// 道具用:只做「去背」,不 3 色量化(道具要保留原色)。
// 從四角沿「近白」像素 flood-fill → magenta sentinel;被輪廓包住的內部白(道具本體)保留。
// C# 5 語法(相容 Windows PowerShell 5.1 的 Add-Type)。
public static class QBg {
  static bool IsBgWhite(byte[] p, int idx) {
    return p[idx] > 235 && p[idx + 1] > 235 && p[idx + 2] > 235;   // 近白且未標記
  }
  static void Mark(byte[] p, int idx) { p[idx] = 0xFF; p[idx + 1] = 0x00; p[idx + 2] = 0xFF; p[idx + 3] = 0xFF; }
  public static void Run(string inPath, string outPath) {
    Bitmap s = new Bitmap(inPath);
    int W = s.Width, H = s.Height;
    Rectangle r = new Rectangle(0, 0, W, H);
    BitmapData d = s.LockBits(r, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    int st = d.Stride, n = Math.Abs(st) * H;
    byte[] p = new byte[n];
    Marshal.Copy(d.Scan0, p, 0, n);
    Queue<int> q = new Queue<int>();
    int[] sx = { 0, W - 1, 0, W - 1 };
    int[] sy = { 0, 0, H - 1, H - 1 };
    for (int c = 0; c < 4; c++) {
      int idx = sy[c] * st + sx[c] * 4;
      if (IsBgWhite(p, idx)) { Mark(p, idx); q.Enqueue(sx[c]); q.Enqueue(sy[c]); }
    }
    int[] dx = { 1, -1, 0, 0 };
    int[] dy = { 0, 0, 1, -1 };
    while (q.Count > 0) {
      int x = q.Dequeue(); int y = q.Dequeue();
      for (int e = 0; e < 4; e++) {
        int nx = x + dx[e], ny = y + dy[e];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        int idx = ny * st + nx * 4;
        if (IsBgWhite(p, idx)) { Mark(p, idx); q.Enqueue(nx); q.Enqueue(ny); }
      }
    }
    Marshal.Copy(p, 0, d.Scan0, n);
    s.UnlockBits(d);
    s.Save(outPath, ImageFormat.Png);
    s.Dispose();
  }
}
