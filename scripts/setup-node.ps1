param([Parameter(Mandatory=$true)][string]$Root)
$ErrorActionPreference='Stop'
$Root=(Resolve-Path -LiteralPath $Root).Path
$record=Join-Path $Root '.lemmata-install.json'
$data=$null
if(Test-Path -LiteralPath $record){$data=Get-Content -LiteralPath $record -Raw | ConvertFrom-Json;if($data.schema -ne 1 -or $data.root -ne $Root -or $data.id -notmatch '^[a-f0-9-]{36}$'){throw 'Invalid install record'}}
if($data){$owned=$data.components | Where-Object id -eq 'node';if($owned){$expected=Join-Path $env:LOCALAPPDATA ('Lemmata/toolchains/'+$data.id+'/node');if($owned.path -ne $expected -or (Get-Item -LiteralPath $expected).Attributes -band [IO.FileAttributes]::ReparsePoint -or (Get-Content -LiteralPath (Join-Path $expected '.lemmata-owner') -Raw) -ne $data.id){throw 'Private runtime ownership check failed'};$entry=Join-Path $owned.path 'runtime/node.exe';if(Test-Path -LiteralPath $entry){return $entry}}}
$existing=Get-Command node -ErrorAction SilentlyContinue
if($existing){$version=(& $existing.Source --version);if($LASTEXITCODE -eq 0 -and $version -match '^v([0-9]+)[.]' -and [int]$Matches[1] -ge 22){return $existing.Source}}
Write-Host 'LEMMATA / RUNTIME SETUP'
Write-Host 'Download a private Node.js runtime for Lemmata? Existing system Node and Git stay unchanged.'
if((Read-Host '[y/N]') -notmatch '^(y|yes)$'){throw 'Node.js 22+ is required.'}
if(-not $data){$data=[pscustomobject]@{schema=1;id=[guid]::NewGuid().ToString();root=$Root;components=@()}}
if($data.id -notmatch '^[a-f0-9-]{36}$'){throw 'Invalid installation ID'}
$base=Join-Path $env:LOCALAPPDATA ('Lemmata/toolchains/'+$data.id)
$target=Join-Path $base 'node'
if(Test-Path -LiteralPath $target){throw 'Private runtime folder exists. Use the uninstaller before replacing it.'}
New-Item -ItemType Directory -Path $target -Force | Out-Null
Set-Content -LiteralPath (Join-Path $target '.lemmata-owner') -Value $data.id -NoNewline
$data.components=@($data.components)+[pscustomobject]@{id='node';kind='directory';path=$target;status='installing'}
$data | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $record -Encoding UTF8
$arch=if(($env:PROCESSOR_ARCHITECTURE+' '+$env:PROCESSOR_ARCHITEW6432) -match 'ARM64'){'arm64'}else{'x64'}
$sums=(Invoke-WebRequest -UseBasicParsing 'https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt').Content
$line=($sums -split "`n" | Where-Object {$_ -match ('node-v24[.][0-9.]+-win-'+$arch+'[.]zip$')} | Select-Object -First 1)
if(-not $line){throw 'Official Node archive was not found'}
$parts=$line.Trim() -split '\s+';$expected=$parts[0];$asset=$parts[1]
$archive=Join-Path $target 'node.zip'
Invoke-WebRequest -UseBasicParsing ('https://nodejs.org/dist/latest-v24.x/'+$asset) -OutFile $archive
if((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $expected){throw 'Node archive checksum mismatch'}
$extract=Join-Path $target 'extract';Expand-Archive -LiteralPath $archive -DestinationPath $extract
$source=Join-Path $extract ($asset -replace '[.]zip$','')
$resolved=(Resolve-Path -LiteralPath $source).Path
if(-not $resolved.StartsWith((Resolve-Path -LiteralPath $target).Path+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Runtime extraction escaped target'}
Move-Item -LiteralPath $resolved -Destination (Join-Path $target 'runtime')
Remove-Item -LiteralPath $archive -Force
Remove-Item -LiteralPath $extract -Recurse -Force
($data.components | Where-Object id -eq 'node').status='installed'
$data | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $record -Encoding UTF8
return (Join-Path $target 'runtime/node.exe')
