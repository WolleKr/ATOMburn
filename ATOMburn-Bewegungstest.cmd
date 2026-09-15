@echo off
setlocal EnableExtensions
title ATOMburn - Sicherer Bewegungstest
cd /d "%~dp0"

where node.exe >nul 2>&1
if errorlevel 1 (
  if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
    set "PATH=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;%PATH%"
  )
)

where node.exe >nul 2>&1
if errorlevel 1 goto :missing_node
if not exist "scripts\hardware-visual-acceptance.mjs" goto :wrong_folder

cls
echo ============================================================
echo          ATOMburn - Laserloser 40x40-Bewegungstest
echo ============================================================
echo.
echo Dieser Test verbindet sich mit 192.168.178.71:23 und bewegt
echo den Laserkopf. Er sendet M5 und ein begrenztes Quadrat mit
echo 300 mm/min. Es wird kein Laserbefehl gesendet.
echo.
node.exe scripts\hardware-visual-acceptance.mjs
set "ATOM_RESULT=%ERRORLEVEL%"
echo.
if "%ATOM_RESULT%"=="0" (
  echo Bewegungstest vollstaendig bestanden.
) else (
  echo Bewegungstest nicht bestanden oder nicht freigegeben. Code: %ATOM_RESULT%
)
echo.
pause
exit /b %ATOM_RESULT%

:missing_node
echo FEHLER: Node.js 24 oder neuer wurde nicht gefunden.
goto :fatal

:wrong_folder
echo FEHLER: Das Bewegungstest-Skript fehlt. Starte diese CMD im ATOMburn-Projektstamm.
goto :fatal

:fatal
echo.
pause
exit /b 1
