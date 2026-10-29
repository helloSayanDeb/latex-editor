param([Parameter(Mandatory=$true)][string]$Root)
$ErrorActionPreference='Stop'
$Root=(Resolve-Path -LiteralPath $Root).Path
$link=(New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $Root 'Lemmata Setup.lnk'))
$link.TargetPath=Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe'
$link.Arguments='-NoProfile -ExecutionPolicy Bypass -File "'+(Join-Path $Root 'setup.ps1')+'"'
$link.WorkingDirectory=$Root
$link.IconLocation=(Join-Path $Root 'public\lemmata.ico')+',0'
$link.Description='Lemmata interactive setup and local launch'
$link.WindowStyle=1
$link.Save()
