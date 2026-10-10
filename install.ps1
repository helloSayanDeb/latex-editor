# Downloads the published Windows desktop installer; no Node.js or npm needed.
param(
  [string]$ReleaseRoot = 'https://github.com/helloSayanDeb/latex-editor/releases/latest/download',
  [string]$InstallDirectory = (Join-Path $env:LOCALAPPDATA 'Programs/TeXStudio Local'),
  [string[]]$LaunchArguments = @()
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$releaseRoot = $ReleaseRoot.TrimEnd('/')
$assetName = 'TeXStudio-Local-windows-x64.exe'
$downloadDir = Join-Path ([IO.Path]::GetTempPath()) ('texstudio-install-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $downloadDir | Out-Null
$installer = Join-Path $downloadDir $assetName
Invoke-WebRequest "$releaseRoot/$assetName" -UseBasicParsing -OutFile $installer
$checksumFile = Join-Path $downloadDir 'SHA256SUMS.txt'
Invoke-WebRequest "$releaseRoot/SHA256SUMS.txt" -UseBasicParsing -OutFile $checksumFile
$checksums = Get-Content -LiteralPath $checksumFile -Raw
$line = ($checksums -split "`n" | Where-Object { $_.Trim().EndsWith($assetName) } | Select-Object -First 1)
$algorithm = [Security.Cryptography.SHA256]::Create()
$stream = [IO.File]::OpenRead($installer)
try { $actualHash = [BitConverter]::ToString($algorithm.ComputeHash($stream)).Replace('-', '') }
finally { $stream.Dispose(); $algorithm.Dispose() }
if (!$line -or $actualHash -ne ($line.Trim() -split '\s+')[0]) { throw 'Installer checksum verification failed.' }
$installDir = $InstallDirectory
$installProcess = Start-Process -FilePath $installer -ArgumentList @('/S', "/D=$installDir") -WindowStyle Hidden -Wait -PassThru
if ($installProcess.ExitCode -ne 0) { throw "Installation failed ($($installProcess.ExitCode))." }
$appPath = Join-Path $installDir 'TeXStudio Local.exe'
if (!(Test-Path -LiteralPath $appPath)) { throw 'Open TeXStudio Local using the new desktop shortcut.' }
if ($LaunchArguments.Count) {
  $launched = Start-Process -FilePath $appPath -ArgumentList $LaunchArguments -WindowStyle Hidden -Wait -PassThru
  if ($launched.ExitCode -ne 0) { throw "App launch failed ($($launched.ExitCode))." }
}
else { Start-Process -FilePath $appPath }
Write-Host 'TeXStudio Local installed. Install MiKTeX if compilation reports a missing engine.'
