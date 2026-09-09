# Refresh WebHosting/renzo_crm from the sibling development repo.
# Does not overwrite live env files or this folder's drop-in README.md.
# Does not copy .git, build artifacts, runtime data, or IDE state.
# CRITICAL: never copy SQLite. Pi PRODUCTION data lives in Docker volume
# webhosting_renzo_sqlite, not in this folder. See
# vault/Operations/Renzo-PRODUCTION-SQLite-Preservation.md

$ErrorActionPreference = "Stop"

$source = "C:\Users\Scoy9\Projects\renzo_crm"
$destination = $PSScriptRoot

if (-not (Test-Path -LiteralPath $source)) {
    throw "Source repo not found: $source"
}

$xd = @(
    ".git",
    "node_modules",
    ".nuxt",
    ".output",
    ".nitro",
    "data",
    ".obsidian",
    "coverage",
    "logs",
    ".idea",
    ".vscode"
)

$xf = @(
    "README.md",
    ".env",
    ".env.production",
    ".env.stage",
    ".env.dev",
    ".env.local",
    "renzo.sqlite",
    "*.sqlite",
    "*.sqlite-wal",
    "*.sqlite-shm",
    "*.sqlite-journal"
)

$xdArgs = foreach ($name in $xd) { @("/XD", $name) }
$xfArgs = foreach ($name in $xf) { @("/XF", $name) }

Write-Host "Refreshing $destination from $source"
& robocopy $source $destination /E /NFL /NDL /NJH /NP @xdArgs @xfArgs
$code = $LASTEXITCODE
if ($code -ge 8) {
    throw "robocopy failed with exit code $code"
}

Write-Host "Refresh complete (robocopy code $code). Live env files, drop-in README.md, and SQLite/data were left in place."
exit 0
