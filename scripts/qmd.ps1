$ErrorActionPreference = 'Stop'

$workspace = "C:\Users\panka\.openclaw\workspace"
$src = Join-Path $workspace "tmp\qmd-src\src\qmd.ts"
$env:Path = "$env:USERPROFILE\.bun\bin;" + $env:Path
$env:INDEX_PATH = Join-Path $workspace ".qmd\index.sqlite"

if (-not (Test-Path $src)) {
  Write-Error "qmd source not found at $src"
}

bun $src @args
