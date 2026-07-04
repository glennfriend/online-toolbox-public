# convert-items.ps1 — 批次把 raw/items_before/ 的原圖去背裁切成配件,放到 raw/items/,再刪原檔。
#
# 用法:先逐張看圖、依 WordNet 決定 id,填好下面的 $map(原檔名(不含.png) → id 或 @(id, thr)),
#   再執行:  powershell -ExecutionPolicy Bypass -File tools\convert-items.ps1
# thr(近白門檻)不填則用 232;寫實黑白素描等有灰背景的降到 ~212。
# 不在 $map 裡的 items_before 檔會被略過並列出(提醒尚未分類),不會誤刪。

$ErrorActionPreference = 'Stop'
$root   = Split-Path -Parent $PSScriptRoot          # comic/
$inDir  = Join-Path $root 'raw\items_before_clean'  # 乾淨白底收件匣;髒圖(有雜質)用 CutNoisy,見 tools/README
$outDir = Join-Path $root 'raw\items'
Add-Type -Path (Join-Path $PSScriptRoot 'ItemCut.cs') -ReferencedAssemblies System.Drawing

# ── 每次轉換前編輯這裡 ───────────────────────────────
$map = [ordered]@{
  # '2026-07-04_190132' = 'adult_female_3'          # 用預設門檻 232
  # '2026-07-04_190157' = @('adult_female_4', 212)  # 指定門檻
}
# ────────────────────────────────────────────────────

if ($map.Count -eq 0) { Write-Host '$map 是空的 —— 請先填入 原檔名→id 再執行。'; return }

foreach ($k in $map.Keys) {
  $v = $map[$k]
  if ($v -is [array]) { $id = $v[0]; $thr = [int]$v[1] } else { $id = $v; $thr = 232 }
  $in = Join-Path $inDir "$k.png"
  if (-not (Test-Path $in)) { Write-Warning "找不到 $k.png,略過"; continue }
  $out = Join-Path $outDir "$id.png"
  [ItemCut]::Cut($in, $out, $thr)
  $b = New-Object System.Drawing.Bitmap($out)
  Write-Host ("轉換 {0,-20} → {1,-18} {2,4}x{3}  thr={4}" -f "$k.png", "$id.png", $b.Width, $b.Height, $thr)
  $b.Dispose()
  Remove-Item $in -Force                              # 轉換成功才刪原檔
  Write-Host "  刪除原檔 $k.png"
}

# 提醒:還留在收件匣、沒被轉換的原圖(README.md 不算)
$left = Get-ChildItem $inDir -Filter *.png -ErrorAction SilentlyContinue
if ($left) { Write-Host "`n尚未分類(留在 items_before,請補進 `$map):"; $left | ForEach-Object { Write-Host "  $($_.Name)" } }
else { Write-Host "`nitems_before 已清空。" }
