# Sprint 16 Bericht - automatische Bettmarkenerkennung

## Stand vom 2. September 2026

Der Softwareumfang von Sprint 16 ist implementiert und Gate A ist vollständig
grün. Es wurde keine reale Hardware verbunden, keine Bewegung ausgelöst und
keine Laseremission gestartet. Die physische Nutzerabnahme Gate B bleibt
ausstehend; Sprint 16 ist deshalb noch nicht vollständig abgenommen.

## Arbeitsaufteilung

Die Umsetzung wurde in vier getrennte Arbeitsströme aufgeteilt und anschließend
integriert:

1. lokale Markererkennung, Geometrie, Qualitätswerte und Persistenzmetadaten;
2. isolierte UI-Vorschläge, manuelle Korrektur, Annehmen/Verwerfen und
   Snapshot-Invalidierung;
3. deterministische sechsseitige 400-x-400-mm-Kalibrierkarte und PDF-Prüfung;
4. Version 0.16.5, Build-/Testartefakte und Release-Invarianten.

## Ergebnis

- ATOMburn verwendet die lokale Markerfamilie `atomburn-binary-4x4-v1` mit
  fünf eindeutig dekodierten IDs. Das vorhandene OpenCV-Kalibrier-WASM enthält
  keine ArUco-/AprilTag-Erkennung; deshalb wurde keine nicht verfügbare Funktion
  vorausgesetzt und keine neue Netzwerk- oder Native-Abhängigkeit eingeführt.
- Die IDs werden fest auf X/Y 40/40, 360/40, 360/360, 40/360 und 200/200 mm
  abgebildet. Eine Zuordnung nach Bildposition findet nicht statt.
- Rotation und Spiegelung werden dekodiert. Fehlende, doppelte, fremde,
  kontrastarme oder geometrisch unplausible Marken bleiben nicht annehmbar.
- Der Mittelpunkt ist ein unabhängiger Kontrollpunkt und wird nicht in den
  Vierpunkt-Perspektivfit einbezogen. Der Grenzwert von 5 mm bleibt bestehen.
- Bilddaten sind auf 16 Megapixel begrenzt; große Komponenten speichern keine
  unbeschränkten Pixel-Arrays. Analyse und Bilder bleiben lokal.
- Automatische Funde erscheinen zunächst nur als farblich und barrierefrei
  bezeichnete Vorschläge. Erkennung, Annehmen und Speichern sind drei getrennte
  Aktionen. Verwerfen ändert die gespeicherte Kalibrierung nicht.
- Manuelle Korrekturen behalten Fließkomma-Pixelwerte. Ein neuer Snapshot macht
  offene Vorschläge sichtbar veraltet und sperrt deren Annahme.
- Kalibrierformat Version 2 speichert Snapshot-, Kamera-, Linsen-, Auflösungs-,
  Algorithmus- und Änderungsmetadaten. Bestehende Version-1-Dateien bleiben
  lesbar.
- Die Markerkarte wird deterministisch aus denselben Markerdefinitionen wie der
  Detektor erzeugt. Alle sechs A4-Seiten behalten Schnittkanten, Montagefolge und
  100-mm-Kontrolllinien. Die gerenderten Seiten wurden vollständig visuell auf
  Beschnitt, Lesbarkeit und Markerabstände geprüft.
- Die Anwendungsversion ist `0.16.5`; aktive Build-, Test- und Releasepfade
  verweisen auf Sprint 16.
- Der Playwright-Aufruf verwaltet den Vite-Testserver nun selbst und beendet ihn
  unter Windows zuverlässig, sodass `pnpm gate:a` sauber zurückkehrt.

## Gate A

Build-ID: `98dd8538f426-dirty` (Arbeitsbaum vor Commit).

| Befehl/Test | Ergebnis |
|---|---|
| `python scripts/generate-camera-bed-alignment-target.py --check` | bestanden; PDF deterministisch aktuell |
| fokussierte Sprint-16-/Kamera-UI-Tests | 6 Dateien, 23 Tests bestanden |
| `pnpm gate:a` | bestanden |
| Vitest innerhalb Gate A | 79 Dateien, 294 Tests bestanden |
| Produktionsbuild | bestanden; separater lazy geladener Marker-Detektor und eingebettetes Kalibrier-WASM vorhanden |
| Electron SerialPort Smoke | bestanden; ein Port wurde nur aufgelistet, nicht geöffnet |
| Electron Renderer Smoke | bestanden |
| Playwright | 21/21 bei 100 %, 150 % und 200 % bestanden |
| Release-Invarianten | `ok: true`, keine fehlenden Dateien oder erkannten Secrets |
| Release-Manifest/-Inventar | unter `artifacts/release/sprint-16/` erzeugt |

JUnit, Screenshots und der Laufbericht liegen unter
`artifacts/test-reports/sprint-16/`. Lokale Diagnoseexporte werden nicht in ein
Release-Manifest aufgenommen.

## Sicherheits- und Negativtests

- Keine automatische Speicherung oder Hardwareaktion durch Erkennung oder
  Annahme.
- Kein Raten bei 0-4, doppelten oder fremden IDs.
- Kamera- und Auflösungsabweichungen sowie ungültige Linsenkalibrierung sperren
  die Analyse.
- Konvexität, Markengrößen, Kontrast, Mittelpunktlage, Perspektivstabilität und
  unabhängiger Kontrollfehler werden geprüft.
- Die bestehenden Sprint-12-Tests und die getrennten Hardware-Grenzen bleiben
  grün.

## Offene Nutzerabnahme

Gate B aus `SPRINT-16-PLAN.md` bleibt manuell auszuführen: Karte bei 100 %
drucken, alle Kontrollmaße und die exakte Ausrichtung zum Maschinenkoordinaten-
system prüfen, Snapshot erkennen, fünf Fadenkreuze bei 250-400 % kontrollieren,
einen Punkt korrigieren, Teilverdeckung ablehnen und anschließend RMS/Maximum
protokollieren. Eine nicht nachgewiesene Papierausrichtung darf nicht als
Kamera-zu-Laser-Kalibrierung gespeichert werden.

Es gibt keine freigegebenen, datenschutzgeprüften realen Sprint-12-Kamerabilder
im Repository. Die automatische Referenzregression verwendet deshalb
synthetische Rotations-, Spiegel-, Teilfund- und Geometriefixtures; reale Bilder
werden erst in Gate B durch den Nutzer bewertet.

## Entscheidung

Gate A: bestanden. Nächster erlaubter Schritt: Gate B durch den Nutzer ohne
Laseremission. Gate C bleibt getrennt und wurde nicht geöffnet.
