@echo off
setlocal EnableExtensions
title ATOMburn - Stabilitaetstest
cd /d "%~dp0"

where node.exe >nul 2>&1
if errorlevel 1 (
  if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
    set "PATH=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback;%PATH%"
  )
)

where node.exe >nul 2>&1
if errorlevel 1 goto :missing_node
where pnpm.cmd >nul 2>&1
if errorlevel 1 goto :missing_pnpm
if not exist "node_modules\.modules.yaml" goto :missing_dependencies

cls
echo ============================================================
echo            ATOMburn 0.13.0 - Stabilitaetstest
echo ============================================================
echo.
echo Dieser Test verwendet ausschliesslich Simulatoren und lokale Dateien.
echo Es wird keine Verbindung zu LaserCam, USB oder Maschine aufgebaut.
echo.
call pnpm.cmd test:stability
if errorlevel 1 goto :failed

echo.
echo Stabilitaetstests bestanden. Produktionsbuild wird erstellt...
call pnpm.cmd build
if errorlevel 1 goto :failed

echo.
echo Stabilitaetstest und Produktionsbuild wurden erfolgreich beendet.
pause
exit /b 0

:missing_node
echo FEHLER: Node.js 24 oder neuer wurde nicht gefunden.
goto :fatal

:missing_pnpm
echo FEHLER: pnpm wurde nicht gefunden.
goto :fatal

:missing_dependencies
echo FEHLER: Die Projektabhaengigkeiten sind nicht installiert.
goto :fatal

:failed
echo.
echo Stabilitaetstest oder Build ist fehlgeschlagen. Es wurde keine Hardware angesprochen.
pause
exit /b 1

:fatal
echo.
pause
exit /b 1
