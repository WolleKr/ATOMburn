# Sprint-01-Fidelity-Prüfung

## Prüfgrundlage

- Sollbild: `apps/desktop/assets/concepts/sprint-01-main-screen.png`
- Istbild: `artifacts/test-reports/sprint-01/current/screenshots/iab-main-window.png`
- native Prüfgröße: 1440 × 900 CSS-Pixel
- zusätzliche Skalierungen: 100 %, 150 % und 200 %
- Mindestfenster: 1024 × 680 CSS-Pixel
- Prüfmethode: direkter visueller Vergleich beider Bilder mit `view_image`,
  DOM-Prüfung im Codex-In-App-Browser und Playwright-Snapshotmatrix

## Soll/Ist-Ledger

| Merkmal | Soll | Ist | Urteil |
|---|---|---|---|
| Grundaufbau | Titelzeile, Werkzeugleiste, Zeichenfläche, Inspector, Statuszeile | alle fünf Bereiche an denselben Kanten vorhanden | erfüllt |
| Farbwelt | Graphit, fast schwarzer Canvas, Cyan als Funktionsakzent, Orange in der Marke | Tokens und Kontraste entsprechen dem Entwurf | erfüllt |
| Zeichenfläche | technisches Raster, Lineale, Kreuzachsen und gestrichelte Arbeitsfläche | vollständig vorhanden; 410 × 400 mm sichtbar | erfüllt |
| Werkzeugleiste | kompakte monochrome Geometrie-Icons, aktive Auswahl cyan markiert | zehn vektorbasierte Icons; nur Auswahl aktiv, künftige Werkzeuge deaktiviert | erfüllt |
| Inspector | breite rechte Spalte mit Properties/Operations und Leerzustand | Tabstruktur, Cyan-Unterstrich und Leerzustand entsprechen dem Entwurf | erfüllt |
| Leerzustand | Dokument-Icon, `No project open`, zwei Projektaktionen | zusätzlich ein kurzer Erklärungssatz; Aktionen horizontal statt vertikal | akzeptierte Detailabweichung |
| Titelleiste | Marke links, Projektaktionen, About und Windows-Fensterknöpfe | Inhalt identisch; Browser-Snapshot hat naturgemäß keine nativen Fensterknöpfe, Electron stellt sie per Title-Bar-Overlay bereit | erfüllt |
| Statuszeile | `Ready` links | zusätzlich lokale Versionskennung rechts | akzeptierte Diagnoseergänzung |
| Größenverhalten | keine abgeschnittenen Kernelemente | 1440 × 900 ohne Overflow; Mindestfenster und drei Skalierungen automatisiert bestanden | erfüllt |

## Above-the-fold-Copy-Diff

Im Soll und Ist identisch vorhanden: `ATOMburn`, `New project`, `Open project`,
`About`, `Properties`, `Operations`, `No project open`, `Ready`, `410 mm` und
`400 mm`.

Nur im Ist ergänzt: `Create a new project or open an existing file.` sowie die
lokale Versionskennung `ATOMburn 0.0.0-dev`. Die Projektaktionen erscheinen im
Ist zusätzlich im Leerzustand. Diese Zusätze erklären den leeren Zustand und
unterstützen Diagnosezwecke; sie ändern keine Sprint-1-Funktion.

## Splash-Abgleich

Der Startbildschirm verwendet den generierten technischen Hintergrund, setzt
`AT` und `OM` als echte DOM-Typografie und nutzt den mittigen Laserstrahl statt
eines Pipe-Zeichens. Laserkopf, kontrollierter Auftreffpunkt, Werkstück,
Blaupausenlinien und orangefarbene Glut entsprechen der verbindlichen Bildidee.
Der Splash verschwindet automatisch, bleibt bei reduzierter Bewegung kurz und
blockiert danach keine Bedienung.

## Ergebnis

Keine blockierende visuelle Abweichung. Die ausstehende Nutzerabnahme betrifft
nur Motiv, Lichtwirkung, Icon-Lesbarkeit und persönliches Startgefühl.
