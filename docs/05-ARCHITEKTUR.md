# Architekturvorschlag

## Entscheidung, die zuerst validiert wird

### Option A: TypeScript/React plus Desktop-Hülle

Empfohlener Spike, weil LaserFlow als sehr passender MIT-Baustein existiert.

- React für UI und Editor
- TypeScript für gemeinsam typisierte Dokument-, CAM- und Gerätemodelle
- Node `net.Socket` für die primäre LaserCam-TCP-Verbindung
- HTTP/MJPEG-Client für das integrierte Kamerabild
- Node `serialport` nur für direkten USB-Diagnosezugriff
- Electron als einfachste Desktop-Hülle für Node-Native-Module
- Vite für Frontend-Build
- Vitest für deterministische CAM-/Protokolltests

Vorteile:

- höchste direkte Wiederverwendung aus LaserFlow,
- SVG passt natürlich in DOM und Browserdarstellung,
- eine Sprache in UI, CAM und Kommunikation,
- schnelle UI-Entwicklung.

Nachteile:

- größere Desktop-Pakete,
- Native-Module müssen zur Electron-Version passen,
- klare Prozess- und IPC-Grenzen sind sicherheitsrelevant.

### Option B: Rayforge-Fork

- Python
- GTK4/Libadwaita
- vorhandene CAD-, CAM-, Material- und GRBL-Funktionen

Vorteile:

- größter vorhandener Funktionsumfang,
- MIT-Lizenz,
- umfangreiche Toolpath- und Preflight-Funktionen.

Nachteile:

- viel nicht benötigter Code,
- weniger vertraute Windows-UI und Packaging,
- Reduktion auf X30 Pro kann aufwendiger als ein fokussierter Neubau sein.

### Option C: .NET 8/Avalonia oder WPF

Vorteile:

- sehr gute Windows-Integration,
- kleiner und nativ wirkender,
- starke Typisierung und Tooling.

Nachteile:

- LaserFlow-Code nicht direkt nutzbar,
- LaserGRBL ist zwar C#, aber GPLv3 und technisch älter,
- Editor, CAM und Streamer müssten stärker neu gebaut werden.

## Empfehlung

Zuerst einen kleinen Option-A-Spike auf Grundlage isolierter LaserFlow-Module
bauen. Dessen GRBL-Parser und Streamer werden hinter `ByteTransport` gelegt und
zuerst über TCP mit der LaserCam getestet. Wenn Netzwerkstream, MJPEG und der
direkte serielle Diagnosefallback in einer gepackten Windows-App zuverlässig
arbeiten, bleibt TypeScript. Andernfalls wird Option C neu bewertet.

MeerK40t ergänzt diese Entscheidung in drei Rollen:

1. **Protokollreferenz:** TCP-Verbindung, GRBL-Parser, Statusfelder,
   Fehler-/Alarmtabellen und gepuffertes Senden.
2. **Algorithmusreferenz:** CutPlan, CutCode, Inner-first, Travel-Optimierung,
   RasterPlotter, Fill und Kamerakalibrierung.
3. **Testorakel:** identische kleine Projekte in MeerK40t und AtomBurn erzeugen
   und Pfade beziehungsweise G-Code vergleichen.

Der MeerK40t-Kernel, das globale Signal-/Plugin-System und die wxPython-GUI
werden nicht in die AtomBurn-Laufzeit übernommen. Falls einzelne Geometrie- oder
OpenCV-Funktionen in TypeScript unverhältnismäßig teuer werden, bleibt ein eng
begrenzter Python-Sidecar ein eigener Spike, nicht die Standardarchitektur.

## Zielmodule

```text
AtomBurn/
  apps/
    desktop/             Desktop-Hülle, Fenster, Updates deaktiviert
    ui/                  React UI
  packages/
    domain/              Dokument-, Geometrie- und Operationsmodelle
    importers/           SVG, Raster, später DXF/PDF
    cam/                 Line, Fill, Image, Optimierung
    gcode/               GRBL-Dialekt, Parser, Simulation
    machine/             Session, Status, Streaming, Commands
    transports/          LaserCam TCP und direkter serieller Fallback
    camera/              MJPEG, Snapshots und spätere Kalibrierung
    safety/              Preflight, Grenzen, Startfreigaben
    project-format/      Laden, Speichern, Migrationen
    test-fixtures/       SVGs, Bilder, G-Code und GRBL-Transkripte
  docs/REFERENCES.md     externe Quellen und Lizenzverweise
```

## Datenfluss

```text
Import -> Document Model -> Operations -> CAM IR -> G-Code
                                      -> Preview/Simulation
                                      -> Preflight
G-Code -> Streamer -> TCP Transport -> LaserCam -> USB -> GRBL
GRBL -> Parser -> Machine State -> UI / Log / Safety Controller
LaserCam -> MJPEG Client -> Live View / Snapshot / spätere Ausrichtung
```

## Zwischenrepräsentation (CAM IR)

Editorobjekte dürfen nicht direkt G-Code erzeugen. Eine neutrale CAM-
Zwischenrepräsentation enthält beispielsweise:

- `RapidMove(x, y)`
- `LinearMove(x, y, feed, power)`
- `ArcMove(...)`
- `LaserMode(M3|M4|Off)`
- `AirAssist(On|Off|Unchanged)`
- `OperationBoundary(id)`

Damit lassen sich Vorschau, Laufzeitschätzung, Preflight und G-Code aus
denselben Daten erzeugen.

## Projektformat

Vorschlag: ZIP-Container mit einer klar versionierten Struktur:

```text
project.atomburn
  manifest.json
  document.json
  operations.json
  assets/<sha256>.<ext>
  preview.png
```

Anforderungen:

- Maße immer in Millimetern,
- eingebettete statt fragile externe Assets,
- Schema-Version und Migrationen,
- Maschinenprofilreferenz plus Snapshot jobrelevanter Werte,
- keine geheimen oder maschinenspezifischen absoluten Pfade.

## Prozess- und Sicherheitsgrenzen

- Nur der Desktop-Hauptprozess besitzt Zugriff auf Netzwerksockets, serielle
  Ports, Kamerazugangsdaten und Dateien.
- Die UI kommuniziert über eine kleine, validierte IPC-API.
- Die UI kann keine beliebigen Bytes oder Shellbefehle senden.
- Rohkonsole ist im normalen Betrieb read-only; Schreibzugriff ist ein
  expliziter Expertenmodus.
- Eingabedateien werden als nicht vertrauenswürdig behandelt; SVG-Skripte,
  externe URLs und aktive Inhalte werden entfernt.

## Logging

Pro Sitzung werden gespeichert:

- App-Version und Build-Commit,
- OS und Portmetadaten,
- Firmwarekennung und gelesene GRBL-Werte,
- erzeugter G-Code-Hash,
- alle gesendeten/empfangenen Controllerzeilen mit Zeitstempel,
- Zustandswechsel und Benutzeraktionen,
- keine eingebetteten Projektbilder im Diagnoseprotokoll.

Zusätzlich für die LaserCam:

- Zielhost, TCP-Port und Firmwareversion,
- Zeitpunkte für Socketaufbau, Timeout und Trennung,
- Kamera-/Bridge-/GRBL-Gesundheit getrennt,
- keine Kennwörter, Sitzungs-Cookies oder vollständigen MJPEG-Frames im Log.

Logs sind wichtig für reproduzierbare Hardwarefehler und Support durch den
Hersteller.
