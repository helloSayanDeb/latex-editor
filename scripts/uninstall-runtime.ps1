param([Parameter(Mandatory=$true)][string]$Request)
$ErrorActionPreference='Stop'
try {
 $data=Get-Content -LiteralPath $Request -Raw | ConvertFrom-Json
 Wait-Process -Id $data.pid -Timeout 180 -ErrorAction SilentlyContinue
 if(Get-Process -Id $data.pid -ErrorAction SilentlyContinue){throw 'Runtime still running; removal cancelled'}
 $record=Join-Path $data.root '.lemmata-install.json'
 $receipt=Get-Content -LiteralPath $record -Raw | ConvertFrom-Json
 if($receipt.root -ne $data.root -or $receipt.id -ne $data.id -or $data.id -notmatch '^[a-f0-9-]{36}$'){throw 'Installation identity mismatch'}
 $expected=Join-Path $env:LOCALAPPDATA ('Lemmata/toolchains/'+$data.id+'/node')
 if($data.target -ne $expected -or (Resolve-Path -LiteralPath $expected).Path -ne $expected){throw 'Unexpected removal target'}
 if((Get-Item -LiteralPath $expected).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Linked runtime root'}
 if((Get-Content -LiteralPath (Join-Path $expected '.lemmata-owner') -Raw) -ne $data.id){throw 'Ownership mismatch'}
 $component=$receipt.components | Where-Object id -eq 'node'
 if($component.path -ne $expected -or $component.status -ne 'removal-pending'){throw 'Runtime is not pending removal'}
 Remove-Item -LiteralPath $expected -Recurse -Force
 $receipt.components=@($receipt.components | Where-Object id -ne 'node')
 $receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $record -Encoding UTF8
 Remove-Item -LiteralPath $Request -Force
 # Keep the empty helper directory; no recursive cleanup of a computed temp path.
} catch {
 $_ | Out-String | Set-Content -LiteralPath ($Request+'.log')
 exit 1
}
