# 並列実行用の export-slides.ps1 ラッパー。
# 複数エージェントが同時に PowerPoint COM を触ると、片方の Quit() がもう片方の書き出しを殺すため、
# 名前付きミューテックスで1本ずつ直列化する。
# ユーザーが PowerPoint を開いている場合は何もせずエラー終了する（無断で閉じない。CLAUDE.md の規則）。
# 使い方: powershell -File scripts/export-locked.ps1 -PptxPath "flyers\pamphlet\cut-a.pptx" -OutDir "flyers\pamphlet\_preview" [-Width 1240]
param(
    [Parameter(Mandatory=$true)][string]$PptxPath,
    [Parameter(Mandatory=$true)][string]$OutDir,
    [int]$Width = 1240,
    [string]$Format = "PNG",
    [string[]]$Names
)
$mutex = New-Object System.Threading.Mutex($false, "Global\hotdog-stall-pptx-export")
if (-not $mutex.WaitOne([TimeSpan]::FromMinutes(5))) { Write-Error "timeout waiting for export lock"; exit 1 }
try {
    # 直前の書き出しの PowerPoint が終了処理中のことがあるので、最大30秒は消えるのを待つ
    for ($i = 0; $i -lt 60 -and (Get-Process POWERPNT -ErrorAction SilentlyContinue); $i++) { Start-Sleep -Milliseconds 500 }
    if (Get-Process POWERPNT -ErrorAction SilentlyContinue) {
        Write-Error "PowerPoint is already running (the user may be editing). Do NOT close it. Stop and report to the user."
        exit 2
    }
    $script = Join-Path $PSScriptRoot "..\export-slides.ps1"
    $params = @{ PptxPath = $PptxPath; OutDir = $OutDir; Width = $Width; Format = $Format }
    if ($Names) { $params.Names = $Names }
    & $script @params
    # Quit 後にプロセスが消えるのを待つ（次の順番の誤検知を防ぐ）
    for ($i = 0; $i -lt 20 -and (Get-Process POWERPNT -ErrorAction SilentlyContinue); $i++) { Start-Sleep -Milliseconds 500 }
} finally {
    $mutex.ReleaseMutex()
}
