# Record SHA256 of approved pptx files into a per-folder ledger (.approved-hashes.json).
# Run this when the user explicitly approves a flyer, then git commit the snapshot.
# Usage: powershell -File scripts/approve-flyer.ps1 -Files "flyers\a.pptx","flyers\b.pptx"
param(
    [Parameter(Mandatory=$true)][string[]]$Files
)

foreach ($f in $Files) {
    if (-not (Test-Path $f)) {
        Write-Output "SKIP: $f not found"
        continue
    }
    $full = (Resolve-Path $f).Path
    $dir = Split-Path $full -Parent
    $name = Split-Path $full -Leaf
    $ledgerPath = Join-Path $dir ".approved-hashes.json"

    $table = @{}
    if (Test-Path $ledgerPath) {
        $existing = Get-Content $ledgerPath -Raw | ConvertFrom-Json
        foreach ($p in $existing.PSObject.Properties) {
            $table[$p.Name] = @{ sha256 = $p.Value.sha256; approvedAt = $p.Value.approvedAt }
        }
    }

    $hash = (Get-FileHash $full -Algorithm SHA256).Hash
    $table[$name] = @{ sha256 = $hash; approvedAt = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss") }

    $table | ConvertTo-Json | Out-File $ledgerPath -Encoding utf8
    Write-Output "APPROVED: $name -> $ledgerPath"
}

Write-Output ""
Write-Output "Next step: git add + git commit to snapshot the approved state."
