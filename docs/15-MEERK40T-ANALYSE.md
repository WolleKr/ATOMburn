# MeerK40t-Analyse und Wiederverwendung

## Kurzfazit

**Ja, MeerK40t wird für AtomBurn herangezogen.** Es ist besonders wertvoll als
Quellreferenz, Algorithmuslieferant und ausführbares Testorakel. Es sollte aber
nicht unverändert zum Fundament der App oder vollständig geforkt werden.

Empfohlene Rollenverteilung:

- **LaserFlow:** TypeScript-/React-Struktur und kleiner Browser-CAM-Workflow,
- **MeerK40t:** GRBL-TCP, CAM-Pipeline, Geometrie, Rasterung, Optimierung,
  Kamerakalibrierung und Tests,
- **AtomBurn:** fokussiertes Dokumentmodell, sichere GRBL-Zustandsmaschine,
  LaserCam-V2-Integration und moderne Windows-Oberfläche.

## Analysierter Stand

| Feld | Wert |
|---|---|
| offizielles Repository | <https://github.com/meerk40t/meerk40t> |
| Commit | `5f68a45bff41d98e4d3fe8b8267857218099afa8` |
| Commitdatum | 28. Juli 2026 |
| Lizenz | MIT |
| Version laut `CLAUDE.md` | 0.9.9000 |
| Status laut Projekt | Maintenance Mode; GRBL als stabil ausgewiesen |
| lokale Kopie | keine; externe Referenz bleibt außerhalb des Repositorys |
| Referenz-Commit | `5f68a45bff41d98e4d3fe8b8267857218099afa8` |

Ausgewertet wurden insbesondere:

- [`CLAUDE.md`](https://github.com/meerk40t/meerk40t/blob/5f68a45bff41d98e4d3fe8b8267857218099afa8/CLAUDE.md),
- [Copilot-Entwicklerhinweise](https://github.com/meerk40t/meerk40t/blob/5f68a45bff41d98e4d3fe8b8267857218099afa8/.github/copilot-instructions.md),
- [`NOTES.md`](https://github.com/meerk40t/meerk40t/blob/5f68a45bff41d98e4d3fe8b8267857218099afa8/NOTES.md),
- GRBL-, Core-, Image-, Fill-, Camera- und Testmodule.

## Was `CLAUDE.md` klärt

Die Datei ist tatsächlich eine gute Architekturkarte. Sie erklärt vier für
AtomBurn wichtige Konzepte:

1. **Dokument und Operationen sind getrennt.** Elemente liegen in einem eigenen
   Baum; Operationsknoten referenzieren sie über `ReferenceNode`. Ein Element
   kann dadurch mehreren Operationen zugeordnet werden.
2. **CAM ist eine gestufte Pipeline.** `CutPlan` führt von kopierten Operationen
   über Koordinatentransformation und Validierung zu CutCode, Voroptimierung,
   Optimierung, LaserJob und Driver.
3. **CutCode ist die Maschinenzwischenrepräsentation.** Linien, quadratische und
   kubische Kurven, Plot-, Raster-, Dwell-, Home-, Goto-, Wait-, Input- und
   Output-Primitiven sind vom konkreten Gerätetreiber getrennt.
4. **Hardware ist gekapselt.** Device, Driver und Controller bilden getrennte
   Schichten; der Controller kann Serial, TCP, WebSocket oder Mock verwenden.

Diese Trennungen passen sehr gut zum bereits vorgeschlagenen AtomBurn-CAM-IR.
Der komplette MeerK40t-Kernel ist dafür jedoch nicht erforderlich.

## Wiederverwendungs-Matrix

| Bereich | MeerK40t-Quelle | Wert für AtomBurn | Vorgehen |
|---|---|---|---|
| GRBL über TCP | `grbl/tcp_connection.py` | sehr hoch; direkt relevant für LaserCam | Verhalten und Tests nach TypeScript portieren, nicht blind kopieren |
| GRBL-Parser/Streamer | `grbl/controller.py` | hoch; Status, Settings, Puffer, Realtime | Parserdaten übernehmen, sichere Session neu implementieren |
| G-Code-Erzeugung | `grbl/driver.py`, `grbl/gcodejob.py` | hoch als Referenz und Golden-Oracle | Ausgaben vergleichen; AtomBurn-Emitter klein halten |
| Operationsmodell | `core/node/` | hoch als Architekturidee | vereinfachtes typisiertes AtomBurn-Modell bauen |
| CAM-Pipeline | `core/cutplan.py` | sehr hoch | Phasengrenzen und Tests übernehmen, nicht die ganze Klasse |
| CAM-IR | `core/cutcode/` | sehr hoch | Primitiven in Millimeter/TypeScript neu definieren |
| Inner-first/Travel | `core/cutplan.py`, `core/geomstr.py` | sehr hoch | Algorithmen schrittweise mit portierten Tests übernehmen |
| Geometrie | `core/geomstr.py` | fachlich sehr hoch, technisch stark gekoppelt | als Oracle; Einzelalgorithmen portieren oder etablierte TS-Libs nutzen |
| Rasterpfade | `tools/rasterplotter.py` | sehr hoch für Bildgravur | zunächst Standard-Bidirektional/Overscan portieren; Spezialmodi später |
| PlotPlanner | `core/plotplanner.py` | mittel | Gruppierungsideen nutzen; K40-PPI-Teile nicht ungeprüft übernehmen |
| Dithering | `image/dither.py` | hoch für ausgewählte Kernel | Floyd, Atkinson, Stucki mit neuen Golden-Tests portieren |
| Vector Fill | `fill/fills.py` | hoch | Scanline-/Euler-Fill mit Clipper2-Alternative vergleichen |
| Kamera | `camera/camera.py` | hoch für OpenCV-Kalibrierung | Fisheye/Perspektive als Referenz; MJPEG separat anbinden |
| Spooler | `core/spoolers.py` | mittel als Zustands-/Queue-Idee | eigene kleine, sichere Jobqueue schreiben |
| Kernel/Plugins | `kernel/` | gering für fokussierte App | nicht übernehmen |
| wxPython-GUI | `gui/` | gering | nicht übernehmen |

## Direkter Nutzen für die Mintion LaserCam

MeerK40t besitzt bereits eine TCP-Verbindung für GRBL:

- [`tcp_connection.py`](https://github.com/meerk40t/meerk40t/blob/5f68a45bff41d98e4d3fe8b8267857218099afa8/meerk40t/grbl/tcp_connection.py)
  probiert einen bevorzugten Port sowie 8080 und 23,
- kann vor der GRBL-Verbindung die HTTP-Oberfläche ansprechen,
- aktiviert TCP-Keepalive,
- puffert beliebig geteilte TCP-Daten bis zum Zeilenende,
- meldet Verbindungs- und Schreibfehler über den Geräte-Service.

Der GRBL-Controller wählt den Transport über dieselbe Schnittstelle wie Serial
und WebSocket. Das bestätigt unsere Architekturentscheidung: Oberhalb eines
Byte-Transports können Parser, Session und Streamer unabhängig davon bleiben,
ob der X30 Pro direkt per COM-Port oder über die LaserCam verbunden ist.

MeerK40ts Kamera akzeptiert vollständige HTTP-URLs unverändert und öffnet sie
mit OpenCV `VideoCapture`. Damit ist der LaserCam-Endpunkt
`http://<ip>/ipcam/mjpeg.cgi` grundsätzlich mit diesem Modell kompatibel. Die
Kamera implementiert außerdem:

- horizontales und vertikales Spiegeln,
- Fisheye-Kalibrierung über 6-x-9-Schachbrettaufnahmen,
- Perspektivtransformation über vier Eckpunkte,
- Snapshots beziehungsweise Arbeitsflächen-Hintergrund,
- Reconnect-Versuche.

Für AtomBurn werden diese mathematischen Schritte übernommen oder nachgebildet,
nicht die wxPython-Darstellung.

## Sicherheits- und Qualitätslücken vor einer Übernahme

Der Code ist eine wertvolle Referenz, erfüllt AtomBurns strengere
Maschinenregeln aber nicht unverändert.

### TCP-Verbindung

- `probe_grbl_port()` akzeptiert jeden Port, der irgendein Datenpaket liefert;
  trotz Funktionsbeschreibung wird der Inhalt nicht auf eine GRBL-Antwort
  validiert.
- Der Socket wird nach dem Connect auf blockierende Reads ohne Anwendungstimeout
  gesetzt. AtomBurn benötigt zusätzlich einen eigenen Status-/Idle-Watchdog.
- `TCP_NODELAY` wird nicht gesetzt.
- Schlägt `write()` fehl, trennt die Verbindung die Methode liefert aber keinen
  Fehler an den Aufrufer zurück. Zu diesem Zeitpunkt kann die Zeile schon im
  logischen Forward-Puffer stehen.
- Automatische Portproben und HTTP-Wakeup sind bei der Diagnose nützlich, dürfen
  in AtomBurn aber ausschließlich vor einer Sitzung und nie während eines Jobs
  stattfinden.

### GRBL-Controller

- Character Counting über einen Bytepuffer ist vorhanden und grundsätzlich
  passend.
- Bei `error:n` entfernt MeerK40t die bestätigte Zeile, signalisiert den Fehler
  und weckt den Sender wieder auf. AtomBurn muss standardmäßig den gesamten Job
  stoppen.
- `ALARM` wird gemeldet, im untersuchten Controllerabschnitt aber nicht
  unmittelbar mit einem garantierten Leeren aller normalen Sendewarteschlangen
  verbunden. AtomBurn stoppt den Stream atomar.
- Die Bootvalidierung liest `$`, `$$`, `$G` und `?`, aber nicht zwingend `$I`.
- Ein Reset wird erkannt und löst Revalidierung aus; AtomBurn muss zusätzlich
  den aktiven Job dauerhaft als fehlgeschlagen markieren.
- Für TCP-Transport, Queue-/Ack-Verhalten, `error`, `ALARM` und Reset fehlen im
  untersuchten Testbaum ausreichend direkte Controller-Integrationstests.

Diese Punkte sprechen für einen kleinen eigenen TypeScript-Controller mit
MeerK40t als Vorlage und Testquelle, nicht für das unveränderte Einbetten des
Controllers.

## CAM- und Dokumentmodell

MeerK40ts Pipeline lässt sich sauber auf AtomBurn übertragen:

| MeerK40t | AtomBurn |
|---|---|
| Elements Branch | `DocumentObject[]` |
| Operations Branch + References | `Operation` mit Objekt-IDs |
| `CutPlan.copy()` | unveränderlicher Job-Snapshot |
| `preprocess()` | Transformation nach Maschinenkoordinaten |
| `validate()` | Preflight und Arbeitsbereichsprüfung |
| `blob()` | Kompilierung in CAM-IR |
| `preopt()` / `optimize()` | Inner-first und Travel-Optimierung |
| `CutCode` | AtomBurn `ToolpathPrimitive[]` |
| `GRBLDriver` | deterministischer GRBL-G-Code-Emitter |
| `Spooler` | sichere Einzelmaschinen-Jobqueue |

Abweichungen sind bewusst:

- AtomBurn speichert intern Millimeter statt MeerK40ts `Tat`-Einheit
  (`65535` pro Zoll).
- AtomBurn benötigt nur X30 Pro und keine allgemeine Treiber-Pluginarchitektur.
- Events werden typisiert statt über globale String-Signale verteilt.
- Preflight, aktive Sitzung und Jobzustand besitzen eine einzige klare
  Eigentümerschaft.

## Besonders geeignete Algorithmen

### Inner-first und Travel

MeerK40t behandelt verschachtelte Konturen, gruppiert räumliche Teile und
optimiert Leerwege unter Beibehaltung der Innen-vor-außen-Abhängigkeiten. Die
zugehörigen Tests decken unter anderem dreistufige Hierarchien, Toleranzen,
leere Gruppen, mehrere Durchgänge und gruppierte Teile ab. Diese Tests sind für
AtomBurn fast wertvoller als eine direkte Codekopie.

### RasterPlotter

Der RasterPlotter unterstützt Standardzeilen, bidirektional/unidirektional,
Overscan, verschiedene Startecken, Greedy, Crossover, Spiral und Diagonal. Für
das MVP werden nur folgende Teile portiert:

1. horizontal bidirektional,
2. Leerpixel überspringen,
3. Overscan,
4. Pixelwert zu Leistung,
5. Start-/Endposition und Distanzstatistik.

Greedy, Spiral, Crossover und Diagonal bleiben spätere optionale Modi.

### Dithering

Die Datei enthält Floyd-Steinberg, Atkinson, Jarvis-Judice-Ninke, Stucki,
Burkes, Sierra, Shiau-Fan und Bayer. Sie nennt zusätzlich die MIT-Quelle
`hitherdither`, deren Hinweis bei einer Übernahme erhalten bleibt.

Nicht blind übernehmen: `dither()` ignoriert den Rückgabewert des gewählten
Kernels. Das ist für die in-place Diffusionsfunktionen unproblematisch, aber die
Bayer-Funktionen erzeugen ein neues Array. Zudem fehlen direkte Dither-Tests.
AtomBurn portiert daher zunächst nur drei Modi und erzeugt eigene Bild-Fixtures.

### Geomstr

`Geomstr` ist fachlich beeindruckend, aber über 340 KB groß, NumPy-basiert und
verwendet komplexe Zahlen sowie MeerK40t-Einheiten. Eine vollständige
TypeScript-Portierung wäre ein eigenes Projekt. Sinnvoll sind:

- Tests und Ergebnisse als Oracle,
- einzelne Algorithmen wie Interpolation, Pfadlänge und Travel-Reihenfolge,
- Clipper2/Paper.js für Standardgeometrie,
- optional ein Python-Sidecar-Spike nur für klar abgegrenzte Operationen.

## Testergebnis im lokalen Snapshot

Mit der gebündelten Python-Laufzeit wurden ohne Installation zusätzlicher
Pakete ausgeführt:

- 33 Tests für PlotPlanner, CutPlan, Inner-first, Travel und Fill: **bestanden**,
- 76 Tests für RasterPlotter und Geomstr: **bestanden**,
- insgesamt 109 ausgewählte Tests: **bestanden**.

Dabei traten NumPy-/Python-Warnungen zu Division durch Null in maskierten
Vektoroperationen und zu einem künftig strengeren `complex`-Rückgabetyp auf;
die Tests blieben grün. Das ist für eine langfristige direkte Python-Abhängigkeit
zu beobachten.

Die GRBL-Golden-, Spooler- und kernelbasierten Fill-Tests starteten nicht bis
zum Prüfgegenstand, weil der allgemeine Test-Bootstrap auch Ruida lädt und in
der vorhandenen Laufzeit `pyserial` fehlt. Es wurden keine Abhängigkeiten in die
globale Laufzeit installiert. Außerdem gibt es im untersuchten Testbaum keine
ausreichenden direkten Tests für `tcp_connection.py`, Kamera und Dither.

## Drei mögliche Integrationsmodelle

### 1. Selektive TypeScript-Portierung — empfohlen

- Architekturideen und Algorithmen in AtomBurn-Typen übertragen,
- Originaldatei und Commit in jedem Port dokumentieren,
- relevante Python-Tests als Vitest-Fixtures neu aufsetzen,
- Ausgaben gegen den unveränderten Snapshot vergleichen.

Vorteil: kleine, typisierte und auf einen Laser zugeschnittene Laufzeit.

### 2. Enger Python-Sidecar — Rückfalloption

Nur für schwer portierbare Geometrie oder OpenCV-Kalibrierung. Kommunikation
über eine kleine versionierte JSON-Pipe; kein Zugriff des Sidecars auf die
Maschine. Der sichere GRBL-Controller bleibt im AtomBurn-Hauptprozess.

Vorteil: schnelle Wiederverwendung. Nachteil: Packaging, zwei Laufzeiten,
Fehler- und Zustandskopplung.

### 3. Vollständiger MeerK40t-Fork — nicht empfohlen

Der Funktionsumfang wäre sofort groß, aber AtomBurn würde Kernel, Pluginmodell,
wxPython, zahlreiche fremde Gerätetreiber und historisch gewachsene Einheiten
mit übernehmen. Eine Reduktion könnte schwieriger werden als ein fokussierter
Client. Maintenance Mode und die oben genannten GRBL-Sicherheitsunterschiede
verstärken dieses Risiko.

## Konkrete Übernahmereihenfolge

1. MeerK40t-TCP-Fälle in einen AtomBurn-`LaserCamTcpTransport`-Testkatalog
   übertragen.
2. GRBL-Fehler-, Alarm-, Settings- und Statusdaten als typisierte Tabellen
   übernehmen und gegen die offizielle GRBL-Dokumentation prüfen.
3. LaserCam-Mockserver für Teilpakete, gebündelte Antworten, Timeout,
   `error`, `ALARM`, Welcome/Reset und Verbindungsabbruch bauen.
4. Operations-/CutCode-Ideen in das AtomBurn-Dokument- und CAM-IR einarbeiten.
5. Rechteck- und verschachtelte-Konturen-Golden-Fälle zwischen MeerK40t und
   AtomBurn vergleichen.
6. Standard-RasterPlotter mit Overscan portieren.
7. Inner-first und Travel-Optimierung anhand der MeerK40t-Tests portieren.
8. Fisheye-/Perspektivkalibrierung für den LaserCam-MJPEG-Stream evaluieren.

## Lizenz und Herkunft

MeerK40t steht unter MIT. Der Lizenztext liegt im [offiziellen Repository](https://github.com/meerk40t/meerk40t/blob/5f68a45bff41d98e4d3fe8b8267857218099afa8/LICENSE). Einzelne
Dateien enthalten zusätzliche Herkunftshinweise, etwa:

- `image/dither.py`: Teile aus `hitherdither`, ebenfalls MIT,
- `svgelements.py`: Ableitungen beziehungsweise Mathematik aus `svg.path` und
  `svgpathtools`.

Bei einer selektiven Übernahme bleiben diese Hinweise in der portierten Datei
und im Inventar erhalten.

## Entscheidung

MeerK40t wird ab jetzt als **Priorität-A-Referenz** behandelt. Es ersetzt
LaserFlow nicht, sondern ergänzt es: LaserFlow hilft beim schlanken
TypeScript-Produkt, MeerK40t liefert die tiefere Laser-/CAM-Erfahrung und eine
große Basis an Algorithmen und Tests.
