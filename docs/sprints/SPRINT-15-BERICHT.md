# Sprint 15 Bericht — abgeschlossen

## Stand vom 1. September 2026

Alle dreizehn Arbeitspakete des Sprint-15-Plans sind implementiert. Es wurde
keine reale Maschine verbunden und keine Laseremission ausgelöst. Der bereits
bestandene Raster-Hardwaretest wurde nicht wiederholt.

## Ergebnis

- Direkte Canvas-Interaktion mit Mehrfachauswahl, Drag, acht Resize-Griffen,
  Drehgriff, Pfeiltasten und genau einem History-Commit pro Geste.
- Platzierung von Rechteck, Ellipse, Linie, Polygon und editierbarem Text;
  Knoten verschieben/hinzufügen/löschen, offene Pfade teilen sowie
  rechteckige und polare Arrays.
- Seitenverhältnistreue Arbeitsfläche, cursorzentrierter Zoom 100–1000 %,
  kollisionsfreie Koordinaten und getrennte Anzeige von Projektursprung und
  bestätigt bekanntem Maschinen-Home.
- Pflichtimportfilter und Importregressionen für Vektor-, Projekt- und
  Rasterformate; bestehende Projektobjekte bleiben erhalten.
- Bereinigte Produktionsnavigation mit separaten Bereichen für Maschine,
  Kamera und Diagnose sowie eine pausierbare Kamera-Arbeitsansicht.
- About mit Windows/Architektur, WolleKr und fest erlaubtem Repository-Link.
- Versionierte letzte Ordner für Projekt, Import und Export mit sicherem
  Fallback bei fehlenden oder beschädigten Einstellungen.
- Zentraler, bereinigter Fehlerdialog mit kopierbaren Details und sichtbarer,
  nie automatisch publizierender GitHub-Issue-Übergabe.
- Job- und GRBL-Zustand bleiben getrennt; Hold, Resume und Abort funktionieren
  für alle überwachten Jobarten auch bei zuletzt bestätigtem GRBL-`Idle`.

Die Abgrenzung zu nicht übernommenen LaserWeb4-Funktionen steht in der
[Capability-Matrix](../SPRINT-15-CAPABILITY-MATRIX.md).

## Gate A

Bestanden:

- ESLint und TypeScript;
- 74 Vitest-Dateien mit 273 Unit-/UI-Tests;
- Reporter-, Paketgrenzen- und Markdown-Linkprüfung;
- Produktionsbuild und Icon-Erzeugung;
- Electron-SerialPort-Smoke und Electron-Renderer-Smoke;
- 21 Playwright-Fälle bei 100 %, 150 % und 200 % Skalierung;
- Browser- und Windows-Desktop-Smoke ohne Hardwarezugriff.

Der Chromium-Smoke verwendet innerhalb der verwalteten Test-Sandbox
`--no-sandbox`, weil verschachteltes Chromium-Sandboxing unter Windows dort
keinen Renderer starten kann. Die produktive `BrowserWindow` behält
`sandbox: true`, `contextIsolation: true` und `nodeIntegration: false`; diese
Grenzen werden separat geprüft.

## Hardwaregrenze

Für die Freigabe 0.15.0 ist kein neuer Emissionstest erforderlich. Alle
Software- und Simulatorgates sind grün. Reale Bewegungs- oder Emissionstests
bleiben ausschließlich nutzerinitiiert und folgen den dokumentierten
Hardware-Gates und Testflächen.
