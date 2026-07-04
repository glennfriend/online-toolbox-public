using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Collections.Generic;

public static class QFlood {
  static bool IsWhite(byte[] p, int idx) {
    // 白且尚未被標成 sentinel(magenta 的 G=0)
    return p[idx] == 0xFF && p[idx + 1] == 0xFF && p[idx + 2] == 0xFF;
  }
  // 背景標成 magenta(B=FF,G=00,R=FF);vtracer 描完後由 extract-parts 當背景丟掉。
  static void Mark(byte[] p, int idx) { p[idx] = 0xFF; p[idx + 1] = 0x00; p[idx + 2] = 0xFF; p[idx + 3] = 0xFF; }
  // 量化成 3 色(黑/腮紅/白)後,從四角沿白色 flood fill → alpha=0(背景透明);
  // 被髮/輪廓包住的白(膚)不會被觸及,保留為不透明白。
  public static void Run(string inPath, string outPath) {
    Bitmap s = new Bitmap(inPath);
    int W = s.Width, H = s.Height;
    Rectangle r = new Rectangle(0, 0, W, H);
    BitmapData d = s.LockBits(r, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    int st = d.Stride;
    int n = Math.Abs(st) * H;
    byte[] p = new byte[n];
    Marshal.Copy(d.Scan0, p, 0, n);
    for (int k = 0; k < n; k += 4) {
      byte b = p[k], g = p[k + 1], rr = p[k + 2];
      int lum = (rr * 299 + g * 587 + b * 114) / 1000;
      if (lum < 110) { p[k] = 0x1C; p[k + 1] = 0x1C; p[k + 2] = 0x1C; }
      else if (rr > b + 12 && rr > 190 && lum < 245) { p[k] = 0xC6; p[k + 1] = 0xD6; p[k + 2] = 0xF0; }
      else { p[k] = 0xFF; p[k + 1] = 0xFF; p[k + 2] = 0xFF; }
      p[k + 3] = 0xFF;
    }
    Queue<int> q = new Queue<int>();
    int[] sx = { 0, W - 1, 0, W - 1 };
    int[] sy = { 0, 0, H - 1, H - 1 };
    for (int c = 0; c < 4; c++) {
      int idx = sy[c] * st + sx[c] * 4;
      if (IsWhite(p, idx)) { Mark(p, idx); q.Enqueue(sx[c]); q.Enqueue(sy[c]); }
    }
    int[] dx = { 1, -1, 0, 0 };
    int[] dy = { 0, 0, 1, -1 };
    while (q.Count > 0) {
      int x = q.Dequeue(); int y = q.Dequeue();
      for (int e = 0; e < 4; e++) {
        int nx = x + dx[e]; int ny = y + dy[e];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        int idx = ny * st + nx * 4;
        if (IsWhite(p, idx)) { Mark(p, idx); q.Enqueue(nx); q.Enqueue(ny); }
      }
    }
    Marshal.Copy(p, 0, d.Scan0, n);
    s.UnlockBits(d);
    s.Save(outPath, ImageFormat.Png);
    s.Dispose();
  }
}
