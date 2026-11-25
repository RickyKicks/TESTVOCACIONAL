@echo off
setlocal
cd /d "%~dp0"
set "motor=node.exe"
if exist "%~dp0..\node.exe" set "motor=%~dp0..\node.exe"
"%motor%" -e "process.exit(Number(process.versions.node.split('.')[0]) >= 24 ? 0 : 1)" >nul 2>nul
if errorlevel 1 (
  echo Para abrir Orienta instala Node.js 24 o posterior y vuelve a hacer doble clic.
  pause
  exit /b 1
)
set "PORT=3100"
"%motor%" servidor.js --abrir
if errorlevel 1 pause
endlocal
