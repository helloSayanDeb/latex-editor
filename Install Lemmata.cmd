@echo off
if exist "%~dp0bootstrap.ps1" (
 powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0bootstrap.ps1"
) else (
 powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& ([scriptblock]::Create((Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/helloSayanDeb/latex-editor/main/bootstrap.ps1').Content))"
)
if errorlevel 1 pause
