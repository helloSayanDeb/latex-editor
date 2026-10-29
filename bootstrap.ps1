param([string]$InstallDirectory=(Join-Path $env:LOCALAPPDATA 'Lemmata/source'))
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$destination=[IO.Path]::GetFullPath($InstallDirectory)
if($destination -eq [IO.Path]::GetPathRoot($destination) -or $destination -eq $env:USERPROFILE){throw 'Choose a dedicated installation folder.'}
if(Test-Path -LiteralPath $destination){throw "The folder already exists: $destination. Run its Lemmata Setup.cmd, or choose another InstallDirectory."}
Write-Host 'LEMMATA / DOWNLOAD AND SETUP'
$commit=Invoke-RestMethod -Headers @{'User-Agent'='Lemmata-bootstrap'} 'https://api.github.com/repos/helloSayanDeb/latex-editor/commits/main'
if($commit.sha -notmatch '^[a-f0-9]{40}$'){throw 'Invalid repository revision'}
$work=Join-Path ([IO.Path]::GetTempPath()) ('lemmata-source-'+[guid]::NewGuid())
New-Item -ItemType Directory -Path $work | Out-Null
try{
 $archive=Join-Path $work 'source.zip'
 Invoke-WebRequest -UseBasicParsing ('https://codeload.github.com/helloSayanDeb/latex-editor/zip/'+$commit.sha) -OutFile $archive
 $extract=Join-Path $work 'extract';Expand-Archive -LiteralPath $archive -DestinationPath $extract
 $source=Join-Path $extract ('latex-editor-'+$commit.sha)
 $resolved=(Resolve-Path -LiteralPath $source).Path
 if(-not $resolved.StartsWith((Resolve-Path -LiteralPath $work).Path+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Source extraction escaped temporary folder'}
 if(-not(Test-Path -LiteralPath (Join-Path $resolved 'scripts/setup-wizard.cjs'))){throw 'The published repository does not include this setup wizard yet. Publish the current source first.'}
 New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
 Move-Item -LiteralPath $resolved -Destination $destination
 $receipt=[pscustomobject]@{schema=1;id=[guid]::NewGuid().ToString();root=$destination;revision=$commit.sha;components=@()}
 $receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $destination '.lemmata-install.json') -Encoding UTF8
}finally{
 $resolved=(Resolve-Path -LiteralPath $work).Path
 if($resolved -ne $work -or -not ([IO.Path]::GetFileName($resolved)).StartsWith('lemmata-source-')){throw 'Unexpected cleanup path'}
 Remove-Item -LiteralPath $resolved -Recurse -Force
}
& (Join-Path $destination 'setup.ps1')
exit $LASTEXITCODE
