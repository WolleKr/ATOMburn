# Sprint 13 Bericht — Ausfälle, Performance und Langzeittest

## Ergebnis des Implementierungsabgleichs

Der frühere Stand war nicht vollständig: Recovery und Diagnoseexport lagen nur
als unverbundene Hilfsmodule vor; lediglich drei kleine Tests existierten. Die
geforderten Langstream-, Fault-, Leak-, Großprojekt-, Datenträger- und
Lifecycle-Nachweise fehlten. Diese Lücken sind im Offline-Umfang geschlossen.

## Umgesetzter Offline-Umfang

- Eine zentrale `SessionRecoveryPolicy` wird beim App-Start, Renderer-Absturz,
  Sleep/Wake, Netzwerkwechsel, Verbindungsverlust, Timeout und Alarm gesetzt.
  Alle drei realen Jobstarts verlangen danach eine zeitlich neuere, bestätigte
  Idle-Synchronisierung; es gibt kein Auto-Resume.
- Sleep/Wake und Netzwerkwechsel verwerfen die aktive Maschinensitzung.
- Die Bewegungsansicht unterstützt ausdrücklich LaserCam TCP oder direkten USB,
  nutzt dieselbe Maschinenlogik und führt keinen automatischen Fallback aus.
- Der Geräte-Dialog exportiert ein lokales JSON-Diagnosepaket. Renderer und UI
  erhalten keine Dateirechte; Main validiert die IPC-Daten, redigiert Secrets,
  Authorization, Cookies und Kameradaten und begrenzt die Ausgabe auf 256 KiB.
- Beschädigte lokale Geräteprofile werden als `.invalid` quarantänisiert und
  durch ein nicht verbindendes Standardprofil ersetzt.
- Streamer-/CAM-Hotpaths vermeiden wiederholte Bounds- und Zustandsallokationen;
  Diagnosezählung und Portsuche laufen jeweils in einem Durchlauf.
- Sichtbare Entwicklungsbegriffe wurden aus dem Renderer entfernt. Die App zeigt
  `ATOMburn 0.13.0`; der frühere Menüpunkt heißt **Calibration mark**.
- `ATOMburn-Stabilitaetstest.cmd` führt den fokussierten Offline-Test und danach
  den Produktionsbuild aus. `ATOMburn-Test.cmd` enthält denselben Fokuslauf im
  Menü, ohne reale Hardware zu verbinden.

## Automatisierte Abnahme

- 250 Unit-/Integrations-/UI-Tests in 64 Dateien bestanden.
- 100 wiederholte Simulatorjobs ohne Zustands-, Puffer- oder Listenerwachstum.
- 50.000 Streamzeilen als beschleunigter virtueller Langlauf bestanden.
- Error, Alarm und Reset in Running und Hold räumen alle Pufferzustände sicher.
- 1.000-Objekt-CAM-Projekt innerhalb der Arbeitsfläche bestanden.
- Datenträger-/Rename-Fehler, beschädigte Profile sowie Projekt-Up-/Downgrade-
  Grenzen bestanden.
- 21 Playwright-Fälle bei 100 %, 150 % und 200 % bestanden.
- SerialPort-Smoke und echter Electron-Smoke bestanden.
- Zwei Produktionsbuilds waren byte-identisch; Digest:
  `51f1008078fd3934f3d3c760bbf4bd88d2eebba0042a33d9bab5ca000ed4de02`.

Der vollständige Bericht liegt unter
`artifacts/test-reports/sprint-13/14c6a1bd4846-dirty/summary.md`.

## Release Candidate

- Portable Windows-x64-Ausgabe:
  `output/ATOMburn-0.13.0-win-x64/ATOMburn.exe`
- Paketmanifest:
  `output/ATOMburn-0.13.0-win-x64.manifest.json`
- Manifest-SHA-256:
  `b1e1c78ae1dd9d244d70e9fae724c29b73ddd9bd54612078058f772775f10a1b`
- Paket-Smoke-Test: Exitcode 0, isoliertes Profil, kein Hardwarezugriff.

## Offene Gates

Die Hardwareabnahme wurde am 27.08.2026 durch den Nutzer durchgeführt:

- `H-STABILITY-LONG-01`: erfolgreich, zehn bestätigte Läufe ohne Abweichung.
- `H-SLEEP-IDLE-01`: erfolgreich.
- `H-LOSS-WLAN-01`: erfolgreich.
- `H-LOSS-USB-01`: vom Nutzer nicht ausführbar und ausdrücklich übersprungen;
  damit als abgenommen/geschlossen dokumentiert, aber nicht technisch bestanden.

Der vollständige Gate-A-Lauf wurde nach `pnpm install --frozen-lockfile`
gestartet. Lint, Typecheck, 250 Unit-/Integrations-/UI-Tests, Reporter-,
Package- und Link-Prüfungen, Build sowie Electron-SerialPort-Smoke waren grün.
Der Electron-Smoke-Test scheiterte anschließend an der lokalen Umgebung:
Chromium konnte trotz `--disable-gpu` keinen nutzbaren GPU-Prozess starten
(`GPU process isn't usable`, Exitcode `2147483651`).

Die zuvor problematische Abhängigkeitssperre ist inzwischen beseitigt:
`pnpm install --frozen-lockfile` lief erfolgreich mit `pnpm 11.19.0` durch.
Die portable Ausgabe bleibt unabhängig davon startfähig.

Damit sind die vorgesehenen Hardwarefälle einschließlich des ausdrücklich
übersprungenen USB-Falls für die Sprint-13-Abnahme dokumentiert. Als technische
Restabweichung bleibt nur der nicht erfolgreiche Electron-Smoke-Test der
aktuellen Ausführungsumgebung.
