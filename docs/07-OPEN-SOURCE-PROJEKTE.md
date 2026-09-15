# Open-Source-Projekte und Wiederverwendung

Stand: 12. August 2026. Lizenzangaben müssen beim tatsächlichen Import erneut am
konkreten Commit geprüft und mit dessen Lizenzdatei archiviert werden.

## Priorität A

### LaserFlow

- Repository: <https://github.com/praegustator/laserflow>
- Lizenz: MIT
- Stack: TypeScript, React, Fastify, Zustand, Vite, `serialport`, WebSocket
- Reife: jung und klein; 94 Commits bei der Recherche
- Bezug: Der Autor beschreibt einen Atomstack-Diodenlaser als eigenes Gerät.

Vorhanden:

- SVG/PNG-Frontend und grundlegende Platzierung,
- Operationen pro Ebene,
- SVG-zu-G-Code-CAM,
- G-Code-Vorschau und Jobqueue,
- GRBL-Verbindung und Status,
- 127-Byte-RX-Puffer-Streaming,
- Maschinenprofile und Materialpresets.

Konkret zu prüfen:

- `packages/backend/src/serial/`
- `packages/backend/src/jobs/`
- `packages/backend/src/cam/`
- gemeinsame Typen in Frontend/Backend
- Vitest-Tests und vorhandene Fixtures

Empfehlung: bester Startpunkt für Hardware-Spike und TypeScript-MVP. Nicht
blind als Ganzes übernehmen; zuerst Streamer, Parser und CAM mit Tests und dem
offiziellen GRBL-Protokoll vergleichen.

### Rayforge

- Repository: <https://github.com/barebaric/rayforge>
- Website: <https://rayforge.org/>
- Lizenz: MIT
- Stack: Python, GTK4, Libadwaita
- Reife: aktiv und funktionsreich; etwa 3900 Commits bei der Recherche

Vorhanden:

- 2D-CAD und parametrische Skizzen,
- SVG, DXF, PDF und Rasterimport,
- Kontur- und Rasteroperationen,
- Kerf, Overscan, Tabs, Dithering und Pfadoptimierung,
- 3D-Simulation,
- GRBL über seriell und Netzwerk,
- GRBL-Einstellungen, Preflight und No-Go-Zones,
- Materialbibliothek und Testgitter,
- Kamera und Print-and-Cut.

Empfehlung: wichtigste Referenz für Featurearchitektur, CAM, Preflight und
Materialrezepte. Ein reduzierter Fork ist als Alternative zum TypeScript-Neubau
zu evaluieren.

### MeerK40t

- Repository: <https://github.com/meerk40t/meerk40t>
- Lizenz: MIT
- Stack: Python, wxPython, pyserial, numpy, Pillow
- Status: sehr umfangreich, aktuell laut Projekt in Maintenance Mode
- geprüfter Snapshot: `5f68a45bff41d98e4d3fe8b8267857218099afa8`

Vorhanden:

- GRBL-Treiber für Atomstack und andere Geräte,
- GRBL-Verbindungen über Serial, TCP und WebSocket,
- Operationsbaum, CutPlan, CutCode und Spooler,
- Geometrieengine mit Linien, Bézierkurven, Bögen, Clipping und Scanline Fill,
- Raster-PlotPlanner,
- Materialtests, Tracing, DXF, Kamera und Rotary,
- viele Hardware- und Golden-File-Tests.

Interessante Bereiche:

- `meerk40t/grbl/`
- `meerk40t/grbl/tcp_connection.py`
- `meerk40t/grbl/controller.py`
- `meerk40t/grbl/driver.py`
- `meerk40t/core/cutplan.py`
- `meerk40t/core/cutcode/`
- `meerk40t/core/plotplanner.py`
- `meerk40t/core/spoolers.py`
- `meerk40t/core/geomstr.py`
- `meerk40t/tools/rasterplotter.py`
- `meerk40t/image/dither.py`
- `meerk40t/fill/fills.py`
- `meerk40t/camera/camera.py`
- GRBL-Outputtests

Empfehlung: verbindliche Zweitreferenz neben LaserFlow. Ausgewählte Algorithmen
und Tests nach TypeScript portieren; MeerK40t zusätzlich als ausführbares
Testorakel verwenden. Den vollständigen Kernel beziehungsweise die wxPython-GUI
nicht übernehmen. Die detaillierte Bewertung steht in
[MeerK40t-Analyse](15-MEERK40T-ANALYSE.md).

## Priorität B

### LaserGRBL

- Repository: <https://github.com/arkypita/LaserGRBL>
- Lizenz: GPLv3
- Stack: C#, WinForms/.NET Framework

Vorhanden:

- bewährte GRBL-Kommunikation,
- Rasterimport und Graustufenkonvertierung,
- Dithering, Line-to-Line und Vektorisierung,
- G-Code-Vorschau,
- Windows-/CH340-Erfahrung.

Empfehlung: sehr wertvolle Referenz und Testgegenstand am X30 Pro. Direkte
Übernahme koppelt das kombinierte Werk an GPLv3, sofern sie in einem abgeleiteten
Programm erfolgt. Für reine private Verwendung wäre das grundsätzlich möglich,
aber MIT-Bausteine halten zukünftige Optionen einfacher.

### CNCjs

- Repository: <https://github.com/cncjs/cncjs>
- Lizenz: MIT
- Stack: Node/Browser

Vorhanden:

- GRBL-Sender, serielle Verbindung und Konsole,
- 3D-Toolpath-Anzeige,
- Jogging, Homing, Hold, Resume und Reset,
- plattformübergreifende Desktop-/Webarchitektur.

Empfehlung: Protokoll- und Zustandsreferenz, falls LaserFlow-Lücken auftauchen.
CAM und Laserbildverarbeitung sind nicht sein Schwerpunkt.

### LaserWeb4

- Repository: <https://github.com/LaserWeb/LaserWeb4>
- Lizenz: AGPL-3.0
- Stack: JavaScript/Web
- Status: älter; eigene Projektseite nennt noch GRBL-Unterstützung

Vorhanden:

- SVG/DXF/Raster-CAM,
- GRBL und andere Firmwaretypen,
- G-Code-Vorschau.

Empfehlung: historische Referenz. Direkte Übernahme ist wegen Alter,
Komplexität und AGPL nicht erste Wahl. LaserFlow wurde ausdrücklich aus
Unzufriedenheit mit LaserWeb4 heraus entwickelt.

## Spezialisierte Projekte

### Maker.js

- Repository: <https://github.com/microsoft/maker.js>
- Lizenz: Apache-2.0
- Nutzen: 2D-Geometrie, Pfadketten, Transformationen, Schnittpunkte,
  Boolesche Operationen, Offsets, Text und SVG-/DXF-Export.

### Paper.js

- Repository: <https://github.com/paperjs/paper.js>
- Lizenz: MIT
- Nutzen: Vektorgeometrie, Canvas, SVG-Import/-Export, Pfad- und Boolesche
  Operationen.
- Risiko: großes Framework; prüfen, ob wir wirklich dessen Szenenmodell als
  Domänenmodell übernehmen möchten.

### Clipper2

- Repository: <https://github.com/AngusJohnson/Clipper2>
- Lizenz: BSL-1.0 (Boost Software License, nicht Business Source License)
- Nutzen: robustes Polygon-Clipping, Offsets und Union/Difference/XOR in C#,
  C++ und über Ports auch TypeScript/WASM.
- Hinweis: Das Projekt warnt aktuell vor Fehlern im Triangulationscode;
  Clipping/Offsetting und Triangulation getrennt bewerten.

### SVGnest

- Repository: <https://github.com/Jack000/SVGnest>
- Lizenz: MIT
- Nutzen: unregelmäßiges Nesting, Part-in-Part, konkave Formen, Abstände und
  genetische Optimierung.
- Einsatz: spätere Option, nicht MVP.

### VTracer

- Repository: <https://github.com/visioncortex/vtracer>
- Lizenz: MIT
- Stack: Rust, CLI, Python und WebAssembly-Möglichkeiten
- Nutzen: schnelle Schwarzweiß- und Farbbild-Vektorisierung.
- Einsatz: spätere Bildnachzeichnung, vorzugsweise als klar abgegrenztes Tool
  oder WASM-Modul.

### Node SerialPort

- Repository: <https://github.com/serialport/node-serialport>
- Lizenz: MIT
- Nutzen: etablierter Zugriff auf Windows-COM-Ports aus Node/Electron.
- Einsatz: direkte Abhängigkeit, nicht Quellcodekopie.

### SVG.js

- Repository: <https://github.com/svgdotjs/svg.js>
- Lizenz: MIT
- Nutzen: leichtgewichtige SVG-DOM-Manipulation.
- Einsatz: möglicher Editorbaustein; gegen Paper.js und eigenes Modell testen.

### DXF

- TypeScript/Browser: <https://github.com/skymakerolof/dxf>, MIT
- .NET: <https://github.com/ixmilia/dxf>, MIT
- Einsatz: erst nach Stack-Entscheidung.

## Ausgeschlossene oder niedrig priorisierte Projekte

- K40 Whisperer: für M2-Nano/K40 statt GRBL-X30-Pro.
- GRBL-Firmware-Forks: AtomBurn soll die vorhandene Firmware zunächst nicht
  flashen oder ersetzen.
- proprietäre LightBurn-Binaries/Assets: keine zulässige Codequelle.
- Projekte ohne erkennbare Lizenzdatei: nur studieren, nichts übernehmen.

## Empfohlene Prüf-Reihenfolge

1. LaserFlow klonen und exakten Commit/Lizenz archivieren.
2. Streamer und Parser isoliert testen.
3. Rayforge und MeerK40t nur die relevanten CAM-/Testbereiche vergleichen.
4. Entscheidung: kleiner LaserFlow-basierter Neubau oder Rayforge-Fork.
5. Erst danach einzelne Geometrie-, DXF- und Tracing-Libraries festlegen.
