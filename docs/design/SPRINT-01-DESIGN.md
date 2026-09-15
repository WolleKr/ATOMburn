# Sprint-01-Designsystem

## Referenzen

- vollständige Hauptansicht:
  `apps/desktop/assets/concepts/sprint-01-main-screen.png`
- Splash-Hintergrund ohne Typografie:
  `apps/desktop/assets/splash-background.png`
- Erzeugung: integrierter ImageGen-Workflow am 12. August 2026

Die Hauptansicht ist die Implementierungsspezifikation. Die sichtbare UI wird
nicht aus dem Screenshot gebaut; Text, Bedienelemente, Raster und Symbole
bleiben React/CSS/SVG. Der Splash-Hintergrund ist das einzige zentrale
Rasterasset.

## Farb- und Materialsystem

| Token | Wert | Verwendung |
|---|---|---|
| `--bg-deep` | `#090e13` | Fenster- und Canvasgrund |
| `--bg-chrome` | `#11171d` | Toolbar und Statusleiste |
| `--bg-panel` | `#151c23` | Inspektor und Toolrail |
| `--bg-hover` | `#1b2730` | Hoverzustand |
| `--line` | `#2a343d` | Trennlinien |
| `--grid-minor` | `rgba(85, 139, 158, .10)` | feines Raster |
| `--grid-major` | `rgba(85, 166, 194, .20)` | Hauptraster |
| `--cyan` | `#68c5e8` | Fokus, Maße, aktive Werkzeuge |
| `--text` | `#e7edf2` | Haupttext |
| `--text-muted` | `#8b98a3` | Sekundärtext |
| `--laser` | `#ff5a2b` | einziges warmes Markenzeichen |
| `--danger` | `#f06a68` | Fehlerzustand, nicht Laseraktion |

Keine cremefarbenen Flächen, bunten Statusbadges, Kartenraster oder weichen
Marketingverläufe. Flächen sind fast plan; Schatten dienen nur Fenster- und
Dialogtiefe.

## Typografie

- UI: `Inter`, `Segoe UI Variable`, `Segoe UI`, sans-serif
- technische Maße/Status: `JetBrains Mono`, `Cascadia Mono`, monospace
- Wortmarke: geometrische Versalien, `ATOM` hell und `burn` orange
- Toolbar: 14 px / 600
- Paneltitel: 13 px / 650
- Körpertext: 14–16 px / 400–500
- Maße/Status: 12–13 px / 500
- Startbild `AT` und `OM`: groß, exakt, als Vektor-/HTML-Typografie

## Hauptfenster und Container

```text
AppShell
  TopBar
  Workspace
    ToolRail
    CanvasStage
      Rulers
      WorkArea
      EmptyProjectActions
    Inspector
  StatusBar
  AboutDialog (modal)
  ErrorBoundary (modal fallback)
```

Die zentrale Arbeitsfläche dominiert. Toolrail und Inspector sind schmale,
offene Rails mit geraden Trennlinien. Nur fokussierte Toolbuttons besitzen eine
kompakte rechteckige Fläche.

## Erlaubte sichtbare Texte im ersten Viewport

- `ATOMburn`
- `New project`
- `Open project`
- `About`
- `Properties`
- `Operations`
- `No project open`
- `Create a new project or open an existing file.`
- `Ready`
- `410 mm`
- `400 mm`

Kein Verbindungsstatus, kein Start-/Fire-Knopf, keine Kamera, keine
Maschinenwerte und keine erfundenen Kennzahlen in Sprint 1.

## Symbole

Eigene kleine SVG-Komponenten mit `currentColor`, 20 × 20 px, 1,5 px Strich,
runden Linienenden und -verbindungen:

- Datei neu, Ordner öffnen, Info,
- Auswahl, Rechteck, Kreis, Linie, Polygon, Text, Knoten, Rasterpunkte,
- Ebenen und Maßband,
- leeres Dokument.

Werkzeuge außer Auswahl sind in Sprint 1 sichtbar, aber mit klarer
`aria-disabled`- und Tooltip-Kennzeichnung noch nicht aktiv.

## Interaktionen in Sprint 1

- `New project` zeigt einen lokalen, harmlosen Sprint-2-Hinweis.
- `Open project` zeigt denselben vorbereitenden Zustand.
- `Properties` und `Operations` wechseln die leere Inspektoransicht.
- `About` öffnet/schließt einen zugänglichen Dialog mit App- und Sprintstatus.
- Escape schließt Dialoge.
- Fokusindikatoren sind sichtbar.
- Keine Interaktion verlässt den Renderer oder greift auf Dateien zu.

## Splash-Komposition

Der Rasterhintergrund liefert Laserkopf, Strahl, Werkstück und technische
Zeichnungen. Darüber liegt mittig die kontrollierte Wortmarke:

```text
AT   <senkrechter Bild-Laserstrahl>   OM
```

Es wird kein Pipe-Zeichen gerendert. `AT` und `OM` sind getrennte, echte
Textknoten. Unterhalb steht klein `Precision laser workspace`. Der Splash wird
nach bestätigter Renderer-Bereitschaft weich ausgeblendet und blockiert keine
Fehleransicht.

## Responsive Regeln

- Referenz: 1440 × 900
- Mindestfenster: 1024 × 680
- unter 1180 px wird der Inspector schmaler, nicht über den Canvas gelegt
- unter 1080 px verschwinden rein vorbereitende Toolbuttons, Kernaktionen
  bleiben sichtbar
- UI-Skalierung 100 %, 150 % und 200 % darf keine primären Texte abschneiden

## Bewegungen

- Splash-Fade: 260 ms
- Dialog: 140 ms opacity/translate
- Hover/Fokus: 100–140 ms
- `prefers-reduced-motion` deaktiviert Übergangsbewegung
