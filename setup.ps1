$ErrorActionPreference='Stop'
Set-Location -LiteralPath $PSScriptRoot
$runtime=& (Join-Path $PSScriptRoot 'scripts/setup-node.ps1') -Root $PSScriptRoot
if(-not $runtime){throw 'Node.js is unavailable'}
$env:Path=(Split-Path -Parent $runtime)+';'+$env:Path
& $runtime (Join-Path $PSScriptRoot 'scripts/setup-wizard.cjs') @args
exit $LASTEXITCODE
