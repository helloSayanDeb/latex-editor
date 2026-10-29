$ErrorActionPreference='Stop'
Set-Location -LiteralPath $PSScriptRoot
$runtime=$null
$record=Join-Path $PSScriptRoot '.lemmata-install.json'
if(Test-Path -LiteralPath $record){$data=Get-Content -LiteralPath $record -Raw | ConvertFrom-Json;if($data.schema -ne 1 -or $data.root -ne $PSScriptRoot -or $data.id -notmatch '^[a-f0-9-]{36}$'){throw 'Invalid install record'};$component=$data.components | Where-Object id -eq 'node';if($component){$expected=Join-Path $env:LOCALAPPDATA ('Lemmata/toolchains/'+$data.id+'/node');if($component.path -ne $expected -or (Get-Item -LiteralPath $expected).Attributes -band [IO.FileAttributes]::ReparsePoint -or (Get-Content -LiteralPath (Join-Path $expected '.lemmata-owner') -Raw) -ne $data.id){throw 'Runtime ownership check failed'};$runtime=Join-Path $component.path 'runtime/node.exe'}}
if(-not $runtime -or -not(Test-Path -LiteralPath $runtime)){$command=Get-Command node -ErrorAction SilentlyContinue;if($command){$runtime=$command.Source}}
if(-not $runtime){throw 'Node.js is unavailable. Preserve the installation record and use the documented manual cleanup.'}
& $runtime (Join-Path $PSScriptRoot 'scripts/uninstall-wizard.cjs') @args
exit $LASTEXITCODE
