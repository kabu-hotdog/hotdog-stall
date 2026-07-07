# Check whether an approved pptx has been manually edited since approval.
# MUST be run before regenerating/overwriting any pptx that was shown to the user.
# Usage: powershell -File scripts/check-flyer-hash.ps1 -File "flyers\xxx.pptx"
# Output statuses:
#   NO_FILE   - file does not exist, safe to generate
#   NO_RECORD - file exists but was never approved; if it was ever shown to the user, confirm manually
#   MATCH     - unchanged since approval, safe to regenerate (approved version is in git)
#   MODIFIED  - manual edits detected! DO NOT OVERWRITE. Ask the user first. (exit code 1)
param(
    [Parameter(Mandatory=$true)][string]$File
)

if (-not (Test-Path $File)) {
    Write-Output "NO_FILE: $File does not exist. Safe to generate."
    exit 0
}

$full = (Resolve-Path $File).Path
$dir = Split-Path $full -Parent
$name = Split-Path $full -Leaf
$ledgerPath = Join-Path $dir ".approved-hashes.json"

if (-not (Test-Path $ledgerPath)) {
    Write-Output "NO_RECORD: no approval ledger in $dir. If this file was ever shown to the user, confirm with them before overwriting."
    exit 3
}

$ledger = Get-Content $ledgerPath -Raw | ConvertFrom-Json
$entry = $ledger.PSObject.Properties | Where-Object { $_.Name -eq $name }

if (-not $entry) {
    Write-Output "NO_RECORD: $name has no approval record. If this file was ever shown to the user, confirm with them before overwriting."
    exit 3
}

$currentHash = (Get-FileHash $full -Algorithm SHA256).Hash

if ($currentHash -eq $entry.Value.sha256) {
    Write-Output "MATCH: $name is unchanged since approval ($($entry.Value.approvedAt)). Safe to regenerate."
    exit 0
} else {
    Write-Output "MODIFIED: $name differs from the approved hash ($($entry.Value.approvedAt))."
    Write-Output "The user has likely edited this file manually. DO NOT OVERWRITE. Ask the user first."
    exit 1
}
