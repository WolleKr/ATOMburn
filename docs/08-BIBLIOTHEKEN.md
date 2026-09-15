# Bibliothekskandidaten

Diese Liste ist eine Vorauswahl, keine bereits beschlossene Dependency-Liste.

## Empfohlener TypeScript-Stack

| Aufgabe | Kandidat | Lizenz | Bewertung |
|---|---|---|---|
| Desktop-Hülle | Electron | MIT | einfachster Node-SerialPort-Weg |
| UI | React | MIT | passt zu LaserFlow |
| State | Zustand | MIT | klein und in LaserFlow vorhanden |
| Seriell | `serialport` | MIT | Windows/Linux/macOS, etabliert |
| XML/SVG-Parsing | `fast-xml-parser` 5.10.1 und `svg-path-parser` 1.1.0 | MIT | seit Sprint 7 eingesetzt; XML-Sicherheitsgrenzen liegen davor |
| SVG-Editor | SVG.js oder eigenes React/SVG | MIT | Spike erforderlich |
| Vektorgeometrie | Paper.js | MIT | leistungsfähig, aber großes Modell |
| Geometrie alternativ | Maker.js | Apache-2.0 | laser-/CNC-nah |
| Polygonoffset | Clipper2 TypeScript/WASM | Lizenz des Ports prüfen | Kerf/Boolean/Fill |
| DXF | `dxf-parser` 1.1.2 | MIT | seit Sprint 7 ausschließlich im privilegierten Hauptprozess eingesetzt |
| Tracing | VTracer/WASM oder `@neplex/vectorizer` | MIT | spätere Funktion |
| Nesting | SVGnest | MIT | spätere Funktion |
| Tests | Vitest | MIT | passt zu LaserFlow |
| Schema | Zod | MIT | IPC, Projekt- und Profildaten validieren |

## MeerK40t als Quellreferenz

MeerK40t ist keine npm-Abhängigkeit und wird nicht in den Renderer eingebettet.
Der festgehaltene MIT-Snapshot dient für:

- TypeScript-Portierung klar abgegrenzter Algorithmen,
- Übernahme und Übersetzung passender Test-Fixtures,
- Vergleichsausgaben für G-Code, Cut-Reihenfolge und Rasterpfade,
- Referenz für GRBL-TCP- und Kamera-Fehlerfälle.

Besonders geeignet sind Fehler-/Alarmtabellen, CutCode-Primitiven als
Designvorlage, Inner-first-/Travel-Tests, RasterPlotter-Fixtures und ausgewählte
Dither-Kernel. Nicht als Bibliothek geeignet sind Kernel, wxPython-GUI,
allgemeiner Spooler und die stark gekoppelte komplette `CutPlan`-Klasse.

Ein Python-Sidecar mit ausgewählten MeerK40t-Modulen ist nur ein Fallback, falls
OpenCV-Kalibrierung oder Geometrieportierung im TypeScript-Spike klar schlechter
abschneidet. Dann benötigt er eine kleine versionierte JSON-API und darf niemals
direkt ungeprüfte Maschinenbefehle aus der UI erhalten.

## Möglicher .NET-Stack

| Aufgabe | Kandidat | Lizenz | Bewertung |
|---|---|---|---|
| UI | Avalonia oder WPF | MIT / Microsoft | Windows-nativ bzw. cross-platform |
| Grafik | SkiaSharp | MIT | Canvas und Raster |
| Seriell | `System.IO.Ports` | MIT/.NET | direkter COM-Zugriff |
| Polygongeometrie | Clipper2 C# | BSL-1.0 | sehr passend |
| DXF | IxMilia.Dxf | MIT | vollständiger .NET-Parser |
| SVG | Svg.Skia/SkiaSharp.Extended | jeweilige Lizenz prüfen | kein Kandidat ungeprüft festlegen |
| Raster | SkiaSharp oder eigene Pixelpipeline | MIT | vermeidet unklare Zusatzlizenz |
| Tests | xUnit | Apache-2.0 | Standard |

ImageSharp ist technisch attraktiv, besitzt aber inzwischen eine eigene Split-
Lizenz. Für ein privates Projekt mag sie nutzbar sein; dennoch muss die konkrete
Version vor Aufnahme geprüft werden. Sie ist deshalb kein ungeprüfter Default.

## Kriterien für jede Dependency

- konkrete Version oder Commit festhalten,
- Lizenzdatei archivieren,
- transitive Abhängigkeiten und native Binaries prüfen,
- aktive Wartung und offene Sicherheitsmeldungen ansehen,
- reproduzierbarer Build ohne Download zur Laufzeit,
- Tests für unsere tatsächlich genutzten Funktionen,
- keine Telemetrie oder Netzwerkzugriffe ohne ausdrückliche Entscheidung,
- Austauschbarkeit bei sicherheitskritischen Bausteinen.

## Was selbst implementiert werden sollte

- AtomBurn-Dokumentmodell,
- Geräteprofil und X30-Pro-Validierung,
- Safety Controller und Preflight-Regeln,
- GRBL-Session-Zustandsmaschine,
- kontrollierte Abbruch- und Reconnect-Politik,
- Projektformat,
- Zuordnung von Operationen, Materialien und Maschinenprofilen,
- Tests mit aufgezeichneten X30-Pro-Transkripten.

Der eigentliche serielle Treiber und robuste Geometriealgorithmen sollten
dagegen möglichst aus etablierten Bibliotheken kommen.
