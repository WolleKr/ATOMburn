# Sprint-08-Testbericht

## Stand

Sprint 8 ist implementiert, vollständig automatisch geprüft und mit dem
separat freigegebenen Gate B (`H-DRY-01`) am realen X30 Pro abgenommen.

## Implementiert

- neutrale Line-CAM-Zwischenrepräsentation in Millimetern
- Line-/Score-Operationen für Auswahl oder alle Vektorobjekte
- editierbare Geschwindigkeit, Leistung, Durchgänge und Aktivierung
- Transformation von Pfad, Rechteck und Ellipse
- kleinere geschlossene Konturen vor größeren Konturen
- `$30`-Leistungsskalierung und zwingende `$32=1`-Bestätigung
- Bounds-Preflight für die vollständige 410 × 400-mm-Arbeitsfläche
- Framing-Geometrie, Weglänge und Laufzeitschätzung
- deterministischer GRBL-Export mit defensivem `M5`/`S0`
- Rückparser mit Befehlsallowlist und Prüfung der modalen Sicherheitsreihenfolge
- `.gc`-/`.nc`-Speicherdialog ausschließlich im Hauptprozess
- Werkzeugweg-, Bounds-, Leistungs- und G-Code-Vorschau
- technisch fehlender Versand-/Startweg für reale CAM-Jobs

## Automatische Ergebnisse

| Prüfung | Ergebnis |
|---|---|
| Lint und TypeScript | bestanden |
| Unit-/Sicherheits-/Integrations-/UI-Tests | 100/100 bestanden |
| CAM-Golden-File und Rückparser | bestanden |
| Produktionsbuild und Icon-Erzeugung | bestanden |
| Electron-SerialPort-Smoke | bestanden; 1 Port sichtbar, nicht geöffnet |
| Electron-App-Smoke | bestanden |
| UI-Endtests bei 100/150/200 % | 21/21 bestanden |
| Paketgrenze und lokale Markdown-Links | bestanden |

JUnit: `artifacts/test-reports/sprint-08/current/junit.xml`. Der Lauf stellt
keine Verbindung zur realen Maschine her.

## Gate B — H-DRY-01

- Verbindung: LaserCam TCP `192.168.178.71:23`
- Controller: GRBL 1.1h
- Homing: bestanden, Endposition `WPos 1.000,1.000`
- Checkmodus: festes, emissionsfreies 10-mm-Quadrat vollständig akzeptiert
- Position im Checkmodus unverändert bei `1.000,1.000`
- reales laserloses Framing: `1,1 → 11,1 → 11,11 → 1,11 → 1,1`
- Vorschub: 300 mm/min
- abschließendes Homing: bestanden, `WPos 1.000,1.000`
- technische Auswertung: bestanden
- Sichtbestätigung durch den anwesenden Nutzer: Bewegung bestätigt
- Laser-/Spindelstatus während der Statusmeldungen: `0`

Der lokale maschinenlesbare Bericht liegt unter
`artifacts/hardware-acceptance/2026-08-13T18-09-14-389Z-h-dry-01.json` und wird
wegen des vollständigen privaten Transcripts nicht in Git aufgenommen.

## Wiederholbarkeit

`scripts/hardware-dry-run.mjs` ist hart auf dieses Protokoll und eine
laufbezogene Freigabe begrenzt. Es enthält keine Emissionsbefehle, keine freie
Konsole und keine automatische Wiederholung.
