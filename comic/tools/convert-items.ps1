# convert-items.ps1 — 批次把收件匣的原圖去背裁切成配件,放到 raw/assets/items/<角色>/<變化>.png,再刪原檔。
#
# 用法:先逐張看圖決定「角色/變化」,填好 $map(原檔名(不含.png) → '角色/變化' 或 @('角色/變化', thr[, 'portrait'])),
#   再執行:  powershell -ExecutionPolicy Bypass -File tools\convert-items.ps1
# thr(近白門檻)不填則用 232;寫實黑白素描等有灰背景的降到 ~212;上半身人像加 'portrait'(不從下緣去背)。
# 只處理「乾淨」收件匣;髒圖請直接叫 [ItemCut]::CutNoisy,見 tools/README。不在 $map 的檔會被列出、不誤刪。

$ErrorActionPreference = 'Stop'
$root   = Split-Path -Parent $PSScriptRoot            # comic/
$inDir  = Join-Path $root 'raw\assets\items_before_clean'
$itemsDir = Join-Path $root 'raw\assets\items'
Add-Type -Path (Join-Path $PSScriptRoot 'ItemCut.cs') -ReferencedAssemblies System.Drawing

# ── 每次轉換前編輯這裡(值 = "角色/變化")───────────────
$map = [ordered]@{
  # '2026-07-04_204707' = 'penguin/hello'
  # '2026-07-04_190132' = @('woman_bw/4', 212)
  # '2026-07-04_190201' = @('girl_3/main', 232, 'portrait')
}
# ────────────────────────────────────────────────────

if ($map.Count -eq 0) { Write-Host '$map 是空的 —— 請先填入 原檔名→"角色/變化" 再執行。'; return }

foreach ($k in $map.Keys) {
  $v = $map[$k]
  $thr = 232; $portrait = $false
  if ($v -is [array]) { $id = $v[0]; if ($v.Count -ge 2) { $thr = [int]$v[1] }; if ($v.Count -ge 3 -and $v[2] -eq 'portrait') { $portrait = $true } }
  else { $id = $v }
  $in = Join-Path $inDir "$k.png"
  if (-not (Test-Path $in)) { Write-Warning "找不到 $k.png,略過"; continue }
  $out = Join-Path $itemsDir ($id + '.png')            # id = "角色/變化" → 角色資料夾/變化.png
  $dir = Split-Path $out -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  [ItemCut]::Cut($in, $out, $thr, 6, (-not $portrait))
  $b = New-Object System.Drawing.Bitmap($out)
  Write-Host ("轉換 {0,-20} → {1,-22} {2,4}x{3}  thr={4}{5}" -f "$k.png", "$id.png", $b.Width, $b.Height, $thr, $(if($portrait){' portrait'}else{''}))
  $b.Dispose()
  Remove-Item $in -Force
  Write-Host "  刪除原檔 $k.png"
}

$left = Get-ChildItem $inDir -Filter *.png -ErrorAction SilentlyContinue
if ($left) { Write-Host "`n尚未分類(留在 items_before_clean,請補進 `$map):"; $left | ForEach-Object { Write-Host "  $($_.Name)" } }
else { Write-Host "`nitems_before_clean 已清空。" }
