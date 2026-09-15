# Sprint-07-Testbericht

## Stand

Sprint 7 implementiert den ersten sicheren Dokumenteditor und eine
hardwarefreie Importstrecke. Importierte Inhalte sind editierbare
Millimetergeometrie; sie sind ausdrücklich noch kein ausführbarer Laserjob.

## Implementiert

- Auswahl und Mehrfachauswahl im Arbeitsbereich
- Verschieben, Skalieren, Drehen, Spiegeln und Duplizieren
- Undo/Redo mit begrenzter Historie
- Ebenen- und Operationsübersicht
- SVG/SVGZ-, DXF-, LBRN/LBRN2-, PNG-, JPEG- und BMP-Import
- Import ausschließlich im Hauptprozess ohne freie Dateipfade im Renderer
- sichtbarer Importbericht mit Warnungen für angenäherte, unbekannte oder
  beschädigte Elemente
- eingebettete Rasterdaten statt externer Dateireferenzen
- Projektgrößenlimit von 64 MiB, damit große, normalisierte Vektorprojekte
  wieder geöffnet werden können

## Persönliche Importabnahme

Alle Dateien aus `tests/data_to_load/` wurden unverändert lokal importiert,
serialisiert und wieder geöffnet:

| Datei | Importierte Objekte | `.atomburn`-Größe |
|---|---:|---:|
| `Anhänger_Schmetterlinge_Blumen.svg` | 235 | 2.281.008 Byte |
| `HirschLandschaft.lbrn2` | 25 | 546.078 Byte |
| `Lichtbogen.lbrn2` | 2.675 | 14.594.100 Byte |
| `MondLicht_Reparatur.lbrn2` | 6 | 17.944 Byte |
| `test.lbrn2` | 3 | 38.585 Byte |

Ein LightBurn-Rechteck ohne positive Abmessungen wurde in `Lichtbogen.lbrn2`
sicher übersprungen und als Diagnose gemeldet. Die Quelldateien wurden nicht
in Git aufgenommen.

## Automatische Ergebnisse

| Prüfung | Ergebnis |
|---|---|
| Lint und TypeScript | bestanden |
| Unit-/Sicherheits-/Integrations-/UI-Tests | 87/87 bestanden |
| Produktionsbuild und Icon-Erzeugung | bestanden |
| Electron-SerialPort-Smoke | bestanden; 1 Port sichtbar, nicht geöffnet |
| Electron-App-Smoke | bestanden |
| UI-Endtests bei 100/150/200 % | 21/21 bestanden |
| Paketgrenze und lokale Markdown-Links | bestanden |

Der automatische Lauf erzeugt seinen JUnit-Bericht unter
`artifacts/test-reports/sprint-07/current/`. Gate A stellt keine Verbindung zu
einem Laser her.

## Hardware

Keine Hardwareverbindung und keine Maschinenbewegung. Der Laser war offline
und wird für Sprint 7 nicht benötigt.

## Bekannte Grenzen

- SVG-Bögen werden derzeit als gerade Segmente angenähert und gemeldet.
- Text wird nur aus LightBurn-`BackupPath` übernommen.
- DXF unterstützt bewusst nur die dokumentierten 2D-Entities.
- Importdaten erzeugen noch keine CAM-Operation und keinen G-Code.
