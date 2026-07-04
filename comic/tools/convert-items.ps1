# convert-items.ps1 — 批次把某畫風收件匣的原圖去背裁切成配件,放到該畫風的 items/,再刪原檔。
#
# 用法:設定 $style,先逐張看圖、依 WordNet 決定 id,填好 $map(原檔名(不含.png) → id 或 @(id, thr)),
#   再執行:  powershell -ExecutionPolicy Bypass -File tools\convert-items.ps1
# thr(近白門檻)不填則用 232;寫實黑白素描等有灰背景的降到 ~212。
# 只處理「乾淨」收件匣(items_before_clean);髒圖(有雜質)請直接叫 [ItemCut]::CutNoisy,見 tools/README。
# 上半身人像貼下緣的白衣服會被吃掉 → 用 @(id, thr, 'portrait') 第三格標記,改走不從下緣去背。
# 不在 $map 裡的檔會被略過並列出(提醒尚未分類),不會誤刪。

$ErrorActionPreference = 'Stop'
$root  = Split-Path -Parent $PSScriptRoot            # comic/
$style = 'default'                                    # ← 要處理哪個畫風(default / sketch / …)
$inDir  = Join-Path $root "raw\style\$style\items_before_clean"
$outDir = Join-Path $root "raw\style\$style\items"
Add-Type -Path (Join-Path $PSScriptRoot 'ItemCut.cs') -ReferencedAssemblies System.Drawing

# ── 每次轉換前編輯這裡 ───────────────────────────────
$map = [ordered]@{
  # '2026-07-04_190132' = 'dog_6'                       # 預設門檻 232
  # '2026-07-04_190157' = @('adult_female_7', 212)      # 指定門檻
  # '2026-07-04_190201' = @('adult_female_8', 232, 'portrait')  # 上半身人像:不從下緣去背
}
# ────────────────────────────────────────────────────

if ($map.Count -eq 0) { Write-Host '$map 是空的 —— 請先填入 原檔名→id 再執行。'; return }

foreach ($k in $map.Keys) {
  $v = $map[$k]
  $thr = 232; $portrait = $false
  if ($v -is [array]) { $id = $v[0]; if ($v.Count -ge 2) { $thr = [int]$v[1] }; if ($v.Count -ge 3 -and $v[2] -eq 'portrait') { $portrait = $true } }
  else { $id = $v }
  $in = Join-Path $inDir "$k.png"
  if (-not (Test-Path $in)) { Write-Warning "找不到 $k.png,略過"; continue }
  $out = Join-Path $outDir "$id.png"
  [ItemCut]::Cut($in, $out, $thr, 6, (-not $portrait))   # portrait → seedBottom=false
  $b = New-Object System.Drawing.Bitmap($out)
  Write-Host ("轉換 {0,-20} → {1}/{2,-18} {3,4}x{4}  thr={5}{6}" -f "$k.png", $style, "$id.png", $b.Width, $b.Height, $thr, $(if($portrait){' portrait'}else{''}))
  $b.Dispose()
  Remove-Item $in -Force                              # 轉換成功才刪原檔
  Write-Host "  刪除原檔 $k.png"
}

$left = Get-ChildItem $inDir -Filter *.png -ErrorAction SilentlyContinue
if ($left) { Write-Host "`n尚未分類(留在 $style/items_before_clean,請補進 `$map):"; $left | ForEach-Object { Write-Host "  $($_.Name)" } }
else { Write-Host "`n$style/items_before_clean 已清空。" }
