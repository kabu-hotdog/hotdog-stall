# pptxの各スライドを画像として書き出す（PowerPoint COMオートメーション使用）
# 使い方: powershell -File export-slides.ps1 -PptxPath "flyers\v2-v5-updated.pptx" -OutDir "flyers\_preview"
# 確定納品用: powershell -File export-slides.ps1 -PptxPath "flyers\hotdog-nine.pptx" -OutDir "flyers" -Format JPG -Names "ダイナー","WANTED"
param(
    [Parameter(Mandatory=$true)][string]$PptxPath,
    [Parameter(Mandatory=$true)][string]$OutDir,
    [int]$Width = 1240,
    [string]$Format = "PNG",
    [string[]]$Names
)

$PptxPath = (Resolve-Path $PptxPath).Path
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Force -Path $OutDir | Out-Null }
$OutDir = (Resolve-Path $OutDir).Path

$ppt = New-Object -ComObject PowerPoint.Application
$pres = $ppt.Presentations.Open($PptxPath, $true, $true, $false)

$baseName = [System.IO.Path]::GetFileNameWithoutExtension($PptxPath)
$ext = $Format.ToLower()

for ($i = 1; $i -le $pres.Slides.Count; $i++) {
    $slide = $pres.Slides.Item($i)
    if ($Names -and $Names.Count -ge $i) {
        $outFile = Join-Path $OutDir "$($Names[$i-1]).$ext"
    } else {
        $outFile = Join-Path $OutDir "$baseName-slide$i.$ext"
    }
    $slide.Export($outFile, $Format, $Width)
    Write-Output "exported: $outFile"
}

$pres.Close()
$ppt.Quit()
