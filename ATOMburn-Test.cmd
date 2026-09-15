@echo off
setlocal EnableExtensions
title ATOMburn - Lokaler Test
cd /d "%~dp0"

rem Codex Desktop bundles Node outside the normal PATH. Use it only when needed.
where node.exe >nul 2>&1
if errorlevel 1 (
  set "ATOM_NODE_BIN=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
  set "ATOM_FALLBACK_BIN=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback"
  if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
    set "PATH=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback;%PATH%"
  )
)

where node.exe >nul 2>&1
if errorlevel 1 goto :missing_node

where pnpm.cmd >nul 2>&1
if errorlevel 1 goto :missing_pnpm

if not exist "package.json" goto :wrong_folder
if not exist "node_modules\.modules.yaml" goto :missing_dependencies
if not exist "node_modules\.bin\electron-vite.cmd" goto :missing_dependencies

:menu
cls
echo ============================================================
echo                    ATOMburn - Lokaler Test
echo ============================================================
echo.
echo  Installierte Projektversion: ATOMburn 0.16.7.
echo  Simulator und Gate A bleiben hardwarelos. Reale Hardware wird nur
echo  nach ausdruecklicher Freigabe in den beaufsichtigten Dialogen verbunden.
echo.
echo  [1] App im Entwicklungsmodus starten
echo  [2] Produktionsbuild erstellen und starten
echo  [3] Vollstaendiges hardwareloses Gate A ausfuehren
echo  [4] Fokussierten Stabilitaetstest im Simulator ausfuehren
echo  [5] Beenden
echo.
set "ATOM_CHOICE="
set /p "ATOM_CHOICE=Auswahl [1-5]: "

if "%ATOM_CHOICE%"=="1" goto :dev
if "%ATOM_CHOICE%"=="2" goto :preview
if "%ATOM_CHOICE%"=="3" goto :gate
if "%ATOM_CHOICE%"=="4" goto :stability
if "%ATOM_CHOICE%"=="5" exit /b 0
goto :menu

:dev
cls
echo ATOMburn wird im Entwicklungsmodus gestartet...
echo Zum Beenden die App schliessen und danach Strg+C druecken.
echo.
call pnpm.cmd dev
set "ATOM_RESULT=%ERRORLEVEL%"
goto :result

:preview
cls
echo Produktionsbuild wird erstellt...
echo.
call pnpm.cmd build
if errorlevel 1 (
  set "ATOM_RESULT=%ERRORLEVEL%"
  goto :result
)
echo.
echo Produktionsbuild wird gestartet...
call pnpm.cmd preview
set "ATOM_RESULT=%ERRORLEVEL%"
goto :result

:gate
cls
echo Gate A wird vollstaendig ohne reale Hardware ausgefuehrt...
echo.
call pnpm.cmd gate:a
set "ATOM_RESULT=%ERRORLEVEL%"
goto :result

:stability
cls
echo Der fokussierte Stabilitaetstest laeuft vollstaendig im Simulator...
echo.
call pnpm.cmd test:stability
set "ATOM_RESULT=%ERRORLEVEL%"
goto :result

:result
echo.
if "%ATOM_RESULT%"=="0" (
  echo Vorgang erfolgreich beendet.
) else (
  echo Vorgang mit Fehlercode %ATOM_RESULT% beendet.
)
echo.
pause
goto :menu

:missing_node
echo FEHLER: Node.js wurde nicht gefunden.
echo Installiere Node.js 24 oder neuer und starte diese Datei erneut.
goto :fatal

:missing_pnpm
echo FEHLER: pnpm wurde nicht gefunden.
echo Installiere pnpm 11.16.0, zum Beispiel mit: corepack enable
goto :fatal

:wrong_folder
echo FEHLER: package.json fehlt. Die CMD muss im ATOMburn-Projektstamm liegen.
goto :fatal

:missing_dependencies
echo FEHLER: Die Projektabhaengigkeiten sind noch nicht installiert.
echo Oeffne PowerShell in diesem Ordner und fuehre einmal aus:
echo.
echo   pnpm install --frozen-lockfile
goto :fatal

:fatal
echo.
pause
exit /b 1
