# DEV-Plan für ATOMburn

## Dokumentstatus

Dieses Dokument ist der verbindliche Entwicklungs- und Testplan. In diesem
Planungsschritt werden ausdrücklich **kein Anwendungscode, kein Startbild und
keine weiteren Upstream-Repositories** erzeugt oder heruntergeladen.

Der Produktname wird immer exakt **ATOMburn** geschrieben. Der bestehende
Arbeitsordner behält vorerst den Namen `AtomBurn`, damit keine Pfade unnötig
gebrochen werden.

## Ziel und feste Produktgrenze

ATOMburn wird eine lokale Windows-Desktop-App für diese Standardverbindung:

```text
Windows-PC -> WLAN -> Mintion LaserCam V2 -> USB -> ATOMSTACK X30 Pro
```

Zusätzlich wird direkter USB-/COM-Port-Zugriff unterstützt für:

- Diagnose vor Ort,
- Ausfall oder Fehlersuche an WLAN beziehungsweise LaserCam,
- Vergleich von TCP- und serieller Kommunikation,
- kontrollierte Tests ohne Netzwerkbrücke.

Direktes USB ist kein zweiter unabhängiger Maschinenmodus. Beide Wege nutzen
dieselbe GRBL-Sitzung, denselben Parser, denselben Streamer und dieselben
Sicherheitsregeln. Es darf immer nur **eine** Steuerverbindung aktiv sein.

ATOMburn bleibt eine persönliche App für den eigenen Rechner und die konkrete
Gerätekette. Store, öffentliche Releases, Nachbartests und allgemeine
Mehrgeräteunterstützung gehören nicht in diesen Plan.

## Arbeitsmodell

Wir nennen die Entwicklungsabschnitte **Sprints**. Ein Sprint ist für dieses
Ein-Personen-/Agentenprojekt auf ungefähr drei bis fünf konzentrierte
Arbeitssitzungen ausgelegt. Die Reihenfolge und Abnahme-Gates sind verbindlich;
die Kalenderdauer ist nur eine Schätzung.

Jeder Sprint hat:

1. einen klaren Funktionsumfang,
2. bewusst ausgeschlossene Arbeiten,
3. vollständig automatisierbare Tests,
4. gegebenenfalls einen getrennten Hardwaretest durch den Nutzer,
5. messbare Abnahmekriterien,
6. einen Testbericht mit Build- und Commit-Bezug.

Ein späterer Sprint darf keinen offenen sicherheitskritischen Fehler eines
früheren Sprints übergehen.

## Drei Test-Gates

### Gate A — vollständig automatisch und ohne reale Maschine

Ein Agent darf diese Tests selbstständig ausführen:

- Unit-, Property-, Fuzz- und Snapshot-Tests,
- GRBL-Simulator und aufgezeichnete Transkripte,
- virtueller TCP- und serieller Transport,
- UI-Komponenten- und Electron-Smoke-Tests,
- Projektformat-, Import-, CAM- und G-Code-Golden-Tests,
- statische Analyse, Typprüfung, Dependency- und Build-Prüfung,
- Paketstart in einer lokalen Testumgebung,
- Ausfalltests gegen Simulatoren.

Gate A muss vor jeder Hardwareprüfung vollständig grün sein.

### Gate B — reale Hardware, aber keine Laseremission

Der Nutzer bestätigt, dass er am Gerät ist, Arbeitsbereich und Not-Aus geprüft
hat und der benannte Test ausgeführt werden darf. Erst dann wird ein genau
beschriebenes Testprotokoll durchgeführt. Erlaubt sind je nach Test:

- Kamera und LaserCam-Webdienst,
- lesende GRBL-Abfragen,
- Homing und kleine Jog-Bewegungen,
- laserloses Framing,
- Checkmodus,
- USB-/WLAN-Diagnose,
- Hold, Resume und Abort ohne aktive Laserleistung.

Ein Agent darf keine Hardwareparameter schreiben, keine Firmware aktualisieren
und keinen unbeschränkten Konsolenbefehl senden.

### Gate C — reale Hardware mit möglicher Laseremission

Gate C wird ausschließlich für einen benannten Testfall geöffnet. Vor jedem
Test bestätigt der Nutzer vor Ort mindestens:

- geeignetes bekanntes Testmaterial,
- freie und nicht reflektierende Arbeitsfläche,
- Fokus, Einhausung, Absaugung und Brandschutz,
- physisch erreichbaren Not-Aus,
- keine Personen im Gefahrenbereich,
- korrekte niedrige Testleistung und erwartete Fahrgrenzen.

Der Agent erzeugt und prüft den Testjob vollständig in Gate A. Der Nutzer sieht
Vorschau, G-Code-Hash, Bounds, Leistung und Dauer und löst den realen Start in
der App selbst aus. Ein Agent startet niemals per Shell oder Rohkonsole `M3`,
`M4`, Fokus-/Fire-Befehle oder einen echten Laserjob.

Nach dem Test liefert der Nutzer Ergebnis, Maße und gegebenenfalls ein Foto;
der Agent wertet Log und Messdaten aus. Jeder reale Fehler wird vor dem Fix zu
einem automatisierten Regressionstest reduziert.

## Geplante Testtechnik

Die konkrete Bibliotheksauswahl wird in Sprint 0 verifiziert. Zielbild:

- Vitest für Unit- und Integrationstests,
- `fast-check` für Property- und Fuzz-Tests,
- ein eigener deterministischer GRBL-1.1-Simulator,
- ein TCP-Störsimulator für Latenz, Teilpakete und Abbrüche,
- ein virtueller serieller Adapter ohne benötigten Windows-Treiber,
- Playwright/Electron für Start-, IPC- und UI-Smoke-Tests,
- visuelle Snapshots für Canvas, Vorschau und Startbild,
- Golden Files für G-Code und CAM-Zwischenrepräsentation,
- feste Fixtures aus eigenen Fällen sowie verhaltensbasierten Vergleichen mit
  MeerK40t und LaserWeb4,
- reproduzierbarer Release-Build mit SHA-256.

Testartefakte landen später nach Sprint und Build getrennt unter:

```text
artifacts/test-reports/sprint-XX/<build-id>/
  summary.md
  junit.xml
  coverage/
  screenshots/
  transcripts/
  hashes.txt
```

Passwörter, Cookies, vollständige private Designs und Kamerabilder werden nicht
automatisch in Diagnoseartefakte aufgenommen.

## Referenzquellen

MeerK40t und LaserWeb4 dienen als Inspiration und Verhaltensreferenz. Sie
werden ausschließlich über die offiziellen Links in `docs/REFERENCES.md`
dokumentiert. Upstream-Checkouts, Apps und Archive liegen nicht im AtomBurn-
Repository und werden nicht mit der App ausgeliefert.

Eine echte Übernahme erfordert vorab eine Herkunftsnotiz, Lizenzprüfung,
Abhängigkeitsprüfung, passende Notices und ATOMburn-Regressionstests.

Vorgesehene Referenzbereiche:

| Quelle | Inspiration/Prüfzweck |
|---|---|
| MeerK40t | GRBL-Verhalten, TCP, Spooler, CutPlan/CutCode, RasterPlotter, Pfadoptimierung, Kamera- und Kalibrierkonzepte |
| LaserWeb4 | Dokument-/Operationsworkflow, Jobvorbereitung, Geräte-UX, GRBL-Streaming und Trennung zwischen Oberfläche und Maschinenserver |

## Startbild und visuelle Identität

Das Startbild wird in Sprint 1 erstellt, nicht in der Planungsphase.

### Verbindliche Bildidee

- dunkler graphitfarbener Hintergrund,
- feine technische Konstruktionszeichnungen, Maßlinien, Koordinatenraster und
  schematische Mechanikteile im Hintergrund,
- links die großen Buchstaben `AT`, rechts `OM`,
- dazwischen **kein gezeichnetes Pipe-Zeichen**, sondern ein senkrechter,
  leuchtender Laserstrahl: `AT` + Laser + `OM`,
- der Strahl kommt von oben aus einem angedeuteten Laserkopf,
- er trifft unten auf eine Werkstückoberfläche und graviert gerade eine feine
  Linie beziehungsweise erzeugt einen kleinen kontrollierten Glühpunkt,
- technische, präzise und hochwertige Anmutung; kein Comic und keine
  aggressive Waffenästhetik,
- Rot-/Orangeglut als Akzent, Stahl-/Blaupausentöne für die Zeichnungen,
- gute Lesbarkeit auch bei verkleinerter Darstellung.

### Herstellungsweg

Damit `AT` und `OM` garantiert korrekt sind, erzeugt ein Bildmodell nur
Hintergrund, Laserkopf, Strahlwirkung und Werkstück. Typografie, exakte
Positionierung und gegebenenfalls der Strahlkern werden anschließend als
Vektorebene zusammengesetzt. Das verhindert typische falsche Buchstaben in
generierten Rasterbildern.

Geplante Assets:

- Splash-Master 1600 × 900 Pixel,
- 2×-Variante für hochauflösende Displays,
- reduzierte quadratische 1024 × 1024 App-Icon-Komposition,
- Windows-Icongrößen aus dem Master,
- transparente Wortmarke für About-/Titelbereiche,
- Quellen-/Generierungsnotiz und Farb-/Schriftdefinition.

Automatische Abnahme:

- Pixel-/Layout-Snapshots bei 100 %, 150 % und 200 % Skalierung,
- exakte OCR-/DOM-Prüfung der Vektortypografie `AT` und `OM`,
- keine abgeschnittenen Elemente in 16:9 und kleinen Startfenstern,
- Kontrast- und Lesbarkeitstest,
- Splash verschwindet zuverlässig bei App-Bereitschaft und blockiert keinen
  Fehlerdialog.

Nutzerabnahme: Motiv, Lichtwirkung und technische Zeichnungen werden visuell
freigegeben. Varianten werden erst nach diesem Urteil verworfen.

## Sprintübersicht und Meilensteine

| Sprint | Schwerpunkt | Zeitbox | Ergebnis/Meilenstein |
|---|---|---:|---|
| 0 | Regeln, Quellen, Testfundament | 3–5 Sitzungen | reproduzierbare Arbeitsbasis |
| 1 | Desktop-Skelett und `AT|OM`-Startbild | 3–5 Sitzungen | startfähige, noch maschinenlose App |
| 2 | Domänenmodell und Projektformat | 3–5 Sitzungen | Projekte deterministisch speicherbar |
| 3 | GRBL-Kern und Simulator | 4–6 Sitzungen | **M1: vollständig offline testbarer Maschinenkern** |
| 4 | LaserCam TCP und MJPEG | 4–6 Sitzungen | Standardverbindung lesend validiert |
| 5 | direkter USB-Diagnoseweg | 3–5 Sitzungen | beide Transporte vergleichbar |
| 6 | sichere Maschinensteuerung ohne Emission | 4–6 Sitzungen | **M2: Bewegung und Fehlerbehandlung validiert** |
| 7 | Dokumenteditor und Import | 5–8 Sitzungen | Grafikworkflow ohne CAM |
| 8 | Line-CAM, G-Code und Vorschau | 5–8 Sitzungen | vollständiger Dry Run |
| 9 | erster beaufsichtigter Markiertest | 3–5 Sitzungen | **M3: erster realer End-to-End-Job** |
| 10 | Vektor-Fill und Mehrfachdurchgänge | 4–7 Sitzungen | Flächengravur und Konturen |
| 11 | Rasterbilder und Dithering | 5–8 Sitzungen | **M4: persönliches Funktions-MVP** |
| 12 | Kameraausrichtung und Kalibrierung | 5–8 Sitzungen | Werkstückpositionierung per Bild |
| 13 | Ausfälle, Performance und Langzeittest | 4–7 Sitzungen | stabiler Release Candidate |
| 14 | persönliches Release 1.0 | 3–5 Sitzungen | **M5: lokal installierbare Alltagsversion** |

## Sprint 0 — Regeln, Quellen und Testfundament

### Bauen

- endgültige Workspace-Struktur anlegen,
- `AGENTS.md` als verbindliche Arbeitsregel aktivieren,
- Build-, Lint-, Typprüf- und Testbefehle festlegen,
- Testberichtformat und Build-ID definieren,
- eigene, kleine GRBL-Transkript-Fixtures anlegen,
- offizielle MeerK40t- und LaserWeb4-Referenzen in `docs/REFERENCES.md`
  dokumentieren,
- Upstream-Updatebericht als externe Referenz planen beziehungsweise skripten,
- keine Fremdanwendung in ATOMburn einbauen.

### Vollautomatische Tests durch Agenten

- sauberer Checkout kann ohne globale geheime Abhängigkeiten geprüft werden,
- alle Plan-/Inventardateien referenzieren existente Pfade,
- Lizenzdateien und Commit-Hashes sind vorhanden,
- Upstream-Quellen gelangen nicht in ein leeres Probe-Produktpaket,
- Testreport wird auch bei absichtlich fehlschlagendem Test korrekt erzeugt.

### Nutzertest

Kein Hardwaretest. Der Nutzer bestätigt nur Produktgrenze, Name und Sprintfolge.

### Fertig, wenn

Eine einzige dokumentierte Befehlsfolge kann später alle Gate-A-Tests starten,
und beide Referenzprojekte sind unverändert und reproduzierbar inventarisiert.

## Sprint 1 — Desktop-Skelett und Startbild

### Bauen

- Electron-/TypeScript-/React-Grundgerüst,
- strikte Trennung von Main-, Preload- und Renderer-Prozess,
- validierte minimale IPC-Brücke ohne Maschinenbefehle,
- Start-, Haupt-, Fehler- und About-Ansicht,
- Startbild und Icon nach der festgelegten `AT|OM`-Bildidee,
- Appname überall exakt `ATOMburn`,
- noch keine Netzwerk-, Kamera- oder serielle Verbindung.

### Vollautomatische Tests durch Agenten

- App startet und beendet sich ohne Fehler,
- Renderer besitzt keinen direkten Node-/Shell-Zugriff,
- IPC lehnt unbekannte Nachrichten ab,
- Startbild-Snapshots und Skalierungstests,
- Fensterzustand, Crashdialog und fehlende Assets,
- Produktionsbuild enthält keine Upstream-Repositories.

### Nutzertest

Visuelle Freigabe von Startbild, Icon, Lesbarkeit und Startverhalten.

### Fertig, wenn

Ein reproduzierbarer Windows-Build ohne Maschinenzugriff startet und die
visuelle Identität freigegeben ist.

## Sprint 2 — Domänenmodell und Projektformat

### Bauen

- Dokument-, Objekt-, Layer- und Operationsmodell,
- Einheiten ausschließlich in Millimetern,
- X30-Pro-Maschinenprofil mit am realen Controller verifizierten 400 × 400 mm
  Standardwert,
- Verbindungsprofile `lasercam-tcp` und `serial-usb`,
- versioniertes `.atomburn`-Projektformat mit Migrationen,
- atomare Speicherung, Wiederherstellung und beschädigte-Datei-Fehlerpfade,
- keine CAM- oder Maschinensteuerung.

### Vollautomatische Tests durch Agenten

- Schema-/Roundtrip- und Migrations-Golden-Tests,
- Einheiten- und Transformations-Properties,
- beschädigte, riesige und unvollständige Projektdateien,
- keine absoluten Pfade oder Zugangsdaten im Projekt,
- reproduzierbarer Projektinhalt bei gleicher Eingabe.

### Nutzertest

Projekte anlegen, speichern, umbenennen, erneut öffnen und bewusst einen
Wiederherstellungsfall prüfen; keine Hardware.

### Fertig, wenn

Kein Projektverlust bei normalem Speichern, App-Abbruch oder fehlerhafter Datei
nachweisbar ist.

## Sprint 3 — GRBL-Kern und Simulator

### Bauen

- `ByteTransport`-Schnittstelle,
- inkrementeller Line-Decoder,
- GRBL-1.1-Status-, Welcome-, `ok`-, `error`- und `ALARM`-Parser,
- Maschinenzustandsautomat,
- gepufferter Streamer mit konservativer Pufferbuchhaltung,
- Echtzeitkanal für Status/Hold/Resume/Reset streng getrennt vom Zeilenstrom,
- deterministischer Fake-Controller mit Störprofilen,
- keine reale Verbindung.

### Vollautomatische Tests durch Agenten

- zufällige TCP-/Serial-Paketteilung und Bündelung,
- tausende zufällige Antwortreihenfolgen mit festen Seeds,
- Reset, Alarm, Fehler, Timeout, Pufferüberlauf und Abbruch,
- kein Senden weiterer Jobzeilen nach Fehlerzustand,
- niemals Auto-Resume nach Reconnect,
- Vergleich ausgewählter GRBL-Verhaltensfälle mit MeerK40t und LaserWeb4,
- Mutations- oder gezielte Negativtests der sicherheitskritischen Übergänge.

### Nutzertest

Interaktive Simulatoransicht bedienen: Connect, Job, Hold, Resume, Alarm,
Kabelverlust und Reset; keine Hardware.

### Fertig, wenn

Alle Zustandsübergänge deterministisch sind und jede simulierte Störung mit
einem erklärbaren, sicheren Endzustand endet.

## Sprint 4 — LaserCam-TCP und MJPEG

### Bauen

- Host/IP und TCP-Port im lokalen Profil,
- TCP-Transport zur LaserCam-Bridge,
- reconnectbarer Diagnosekanal, aber kein Job-Auto-Resume,
- getrennte Zustände für LaserCam, GRBL und Kamera,
- MJPEG-Anzeige und Snapshot,
- nur lesende GRBL-Diagnose im ersten Hardwarestand,
- exklusive Verbindung und verständliche Konfliktmeldung.

### Vollautomatische Tests durch Agenten

- Fake-LaserCam mit Latenz, Teilpaketen, Reboot und Portfehlern,
- MJPEG-Parser mit beschädigten/fehlenden Frames,
- Kameraausfall verändert den GRBL-Parser nicht,
- TCP-Ausfall verwirft die Sitzung,
- Zugangsdaten erscheinen nicht in Logs,
- UI und Zustandsanzeigen gegen alle simulierten Fälle.

### Nutzertest — Gate B

`H-TCP-01`: Kamera öffnen, TCP verbinden, Welcome, `$I`, `$$`, `$G` und `?`
lesen, anschließend sauber trennen. Keine Bewegungs- oder Laserbefehle.

### Fertig, wenn

Die Standardverbindung zur echten Gerätekette lesend stabil ist und ein
Abbruch nie als weiterhin verbunden angezeigt wird.

## Sprint 5 — direkter USB-Diagnoseweg

### Bauen

- COM-Port-Auflistung mit verfügbaren Metadaten,
- serieller `ByteTransport`,
- gleiche Maschinen- und Parserlogik wie über TCP,
- Schutz gegen gleichzeitiges TCP und USB,
- Portwechsel-/USB-Abzug-Fehler,
- Vergleichsdiagnose zwischen TCP- und USB-Transcript.

### Vollautomatische Tests durch Agenten

- virtueller serieller Adapter,
- Öffnen/Schließen, belegter Port, USB-Abzug und Controllerreset,
- identische Parserergebnisse für dieselben Bytes über TCP und Serial,
- Native-Module passen zum Electron-Build,
- kein stilles Zurückfallen von TCP auf USB während eines Jobs.

### Nutzertest — Gate B

`H-USB-01`: PC direkt mit dem ausgeschalteten beziehungsweise sicher
vorbereiteten Controller verbinden, Port auswählen, nur `$I`, `$$`, `$G`, `?`
lesen und mit `H-TCP-01` vergleichen. Danach USB trennen und LaserCam wieder in
den Standardpfad setzen.

### Fertig, wenn

TCP und USB dieselben Controllerdaten liefern oder jede Abweichung erklärt und
dokumentiert ist.

## Sprint 6 — sichere Maschinensteuerung ohne Emission

### Bauen

- Home, Unlock, Jog, laserloses Frame, Checkmodus,
- Hold, Resume und sicherer Software-Abbruch,
- Preflight-Grundgerüst und Arbeitsbereichsgrenzen,
- sichtbare Zustands- und Alarmtexte,
- Read-only-Rohkonsole im Normalmodus,
- Protokoll mit gesendeten und empfangenen Zeilen.

### Vollautomatische Tests durch Agenten

- jede Aktion gegen jeden unzulässigen Maschinenzustand,
- Bounds/NaN/Infinity/Fuzzing,
- kein `M3`, `M4` oder positiver `S`-Wert beim Joggen und Framing,
- Alarm/Reset/Transportverlust während jeder Aktion,
- Abbruchreihenfolge und gesperrtes Auto-Resume,
- UI-Pause/Stop bleibt bei langen Simulatorjobs erreichbar.

### Nutzertest — Gate B

- `H-MOVE-01`: Homing und vier kleine Jogs mit bestätigter Richtung,
- `H-FRAME-01`: kleines Rechteck vollständig laserlos abfahren,
- `H-CTRL-01`: Hold, Resume und Abort ohne Laseremission,
- `H-LOSS-01`: Verbindungsverlust nur während einer laserlosen Testbewegung.

### Fertig, wenn

Richtungen, Ursprung und Arbeitsbereich am echten X30 Pro bestätigt sind und
jede Störung ohne Emission und ohne automatische Fortsetzung endet.

## Sprint 7 — Dokumenteditor und Import

### Bauen

- Arbeitsfläche, Auswahl und Mehrfachauswahl,
- Verschieben, Skalieren, Drehen, Spiegeln und Duplizieren,
- Ebenen-/Operationsliste,
- Undo/Redo,
- Import-Grundpipeline in eine neutrale, millimeterbasierte Geometrie,
- SVG/SVGZ-Import und Sanitizing,
- DXF-Import mit Ebenen und Einheitenbehandlung,
- LightBurn-Projektimport `.lbrn`/`.lbrn2` für unterstützte Geometrie,
- PNG/JPEG-Import als platzierbares Objekt,
- Formatdiagnose mit verständlicher Liste nicht unterstützter Elemente,
- noch kein ausführbarer Laserjob.

### Vollautomatische Tests durch Agenten

- Geometrie- und Undo/Redo-Properties,
- verschachtelte SVG-Transformationen,
- DXF-R12/R14-Geometrie, Einheiten, Blöcke und beschädigte Entities,
- LBRN/LBRN2-Gruppen, Ebenen, Transformationen und unbekannte Knoten,
- Script-, Entity-, externe URL- und Pathologie-Fixtures,
- große und beschädigte Rasterbilder,
- Canvas-/Auswahl-Snapshots bei mehreren DPI-Skalierungen,
- Projekt-Roundtrip mit allen Objektarten.

### Nutzertest

Drei echte Designs importieren und platzieren; Bedienung, Maße und Undo/Redo
bewerten. Keine Hardware nötig.

### Fertig, wenn

Die persönlichen SVG- und LBRN2-Referenzdesigns sowie definierte DXF-Fixtures
maßhaltig importiert, bearbeitet und wieder geöffnet werden können.

### Formatstaffel bis Release 1.0

- verpflichtend: SVG/SVGZ, DXF, LBRN/LBRN2, PNG, JPEG und BMP,
- anschließend: PDF mit Vektorinhalten sowie HPGL/PLT,
- Kompatibilitätsimport: AI/EPS, soweit eine geprüfte lokale
  Konvertierungsbibliothek beziehungsweise Inkscape ohne Cloud-Abhängigkeit
  zuverlässig nach SVG/PDF normalisieren kann,
- G-Code (`.gcode`, `.gc`, `.nc`) wird getrennt als bereits erzeugter Job
  behandelt und nicht als editierbare Vektorgrafik ausgegeben.

## Sprint 8 — Line-CAM, G-Code und Vorschau

### Bauen

- neutrale CAM-Zwischenrepräsentation,
- Line-/Score-Operation,
- Geschwindigkeit, Leistung, Durchgänge und Reihenfolge,
- sichere GRBL-G-Code-Ausgabe,
- Simulation, Vorschau und Laufzeitschätzung,
- Framing-Geometrie und vollständiger Preflight,
- Export `.gc`/`.nc`, aber realer Jobstart bleibt bis Sprint 9 gesperrt.

### Vollautomatische Tests durch Agenten

- Golden Files für Linie, Rechteck, Kreis, Bézier und verschachtelte Konturen,
- Header/Footer immer mit sicherem Laserzustand,
- G0 ohne Laserleistung,
- `$30`-Skalierung und `$32`-Vorbedingung,
- Bounds einschließlich Overscan und Transformationen,
- identische Eingabe erzeugt byte-identischen G-Code,
- Parser liest den eigenen G-Code zurück,
- Vergleich der Werkzeugpfade mit kleinen MeerK40t-/LaserWeb-Referenzfällen.

### Nutzertest — Gate B

`H-DRY-01`: exportierten 10-mm-Quadratjob im GRBL-Checkmodus und danach als
laserloses Framing über LaserCam ausführen; Vorschau und reale Fahrgrenzen
vergleichen.

### Fertig, wenn

Der erste Job vollständig von Import bis Dry Run läuft, ohne Laserleistung
aktivieren zu können.

## Sprint 9 — erster beaufsichtigter Markiertest

### Bauen

- bewusste Startfreigabe mit Preflight-Zusammenfassung,
- Jobfortschritt anhand bestätigter Zeilen,
- Start nur aus `Idle`,
- Hold, Resume und Abort im echten Job,
- unveränderlicher G-Code-Hash zwischen Freigabe und Versand,
- kein Remote-/Zeitplanstart.
- persistente MJPEG-Sitzung im Jobdialog mit Framerate, Bildalter und
  Freeze-/Ausfallwarnung,
- Livebild, Fortschritt, Hold und Stop bleiben gemeinsam sichtbar; ein
  Kameraausfall verändert den GRBL-Zustand nicht.
- `H-VISUAL-SQUARE40-01` bleibt der feste laserlose Regressionstest mit
  Freigabephrase, maschinellem Transcript und separater Sichtbestätigung.
- Eine agentengestützte Kameraauswertung verwendet nur pro Lauf ausdrücklich
  freigegebene temporäre Frames; keine Kamerabilder gelangen in Git oder gelten
  ohne Bestätigung der anwesenden Person als Sicherheitsnachweis.

### Vollautomatische Tests durch Agenten

- kompletter End-to-End-Job gegen Simulator in allen Fehlerphasen,
- Doppelklick-/Mehrfachstart und Fensterneuladen,
- Verbindungswechsel nach Preflight blockiert Start,
- geändertes `$30`, `$32`, Profil oder G-Code blockiert Start,
- Leistung oberhalb des Testlimits wird für den Ersttest abgelehnt,
- Log und Fortschritt stimmen mit bestätigtem Stream überein.

### Nutzertest — Gate C

- `H-LASER-01`: ein sehr kurzer Strich mit minimal geeigneter Leistung,
- `H-LASER-02`: 10-mm-Quadrat markieren und in X/Y messen,
- `H-LASER-03`: Hold und kontrollierter Software-Abbruch an einem kleinen,
  sicheren Testjob; physischer Not-Aus bleibt nur für einen realen Notfall
  beziehungsweise das Herstellerverfahren vorgesehen.

Der Nutzer startet jeden Test selbst und meldet Maße, sichtbares Ergebnis und
Log-ID zurück.

### Fertig, wenn

Position, Maßstab, Leistungszuordnung und Abbruchverhalten am realen Material
nachgewiesen sind und Abweichungen automatisierte Regressionstests besitzen.

## Sprint 10 — Vektor-Fill und Mehrfachdurchgänge

### Bauen

- Scanline-Fill für geschlossene Pfade und Löcher,
- Intervall/Zeilenabstand,
- bidirektionale Reihenfolge,
- mehrere Durchgänge,
- Innenkonturen vor Außenkonturen,
- Travel-Optimierung mit konservativen Regeln.

### Vollautomatische Tests durch Agenten

- Formen mit Löchern, Selbstüberschneidungen und Grenzfällen,
- keine Füllung außerhalb der Form,
- deterministische Reihenfolge,
- Vergleich gegen ausgewählte MeerK40t-CutPlan-/Fill-Fälle,
- Performancebudget für große Pfadmengen,
- Simulation aller Durchgänge und Abbruchpunkte.

### Nutzertest — Gates B und C

- `H-FILL-DRY-01`: laserloser/Checkmodus-Dry-Run,
- `H-FILL-01`: kleines gefülltes Rechteck auf Testmaterial,
- `H-PASS-01`: zwei kleine Durchgänge, Ergebnis und Versatz prüfen.

### Fertig, wenn

Fill-Grenzen, Zeilenabstand und Durchgangswiederholung sichtbar korrekt sind.

## Sprint 11 — Rasterbilder und Dithering

### Bauen

- PNG/JPEG-Pipeline,
- Threshold, Graustufe und mindestens Floyd-Steinberg,
- DPI/Intervall und Größenkontrolle,
- bidirektionales Raster und Overscan,
- Rastervorschau und Zeitschätzung,
- Speicher- und Abbruchverhalten für große Bilder,
- den offenen UI-Backlog für Home-/Ursprungsmarker, Achsen- und
  Rasterbeschriftung vollständig abarbeiten,
- den offenen technischen Performance-Backlog P0 bis P3 vollständig
  verhaltensgleich abarbeiten; der Sprint-10-Checkmodus-Timeout ist dabei ein
  blockierender Regressionstest vor weiterer Hardwareabnahme.

### Vollautomatische Tests durch Agenten

- 1-Bit, Verlauf, Transparenz, Foto und beschädigte Bilder,
- Pixel-/Dither-Golden-Files,
- RasterPlotter-Vergleich mit ausgewählten MeerK40t-Fixtures,
- Overscan-Bounds und maximaler Speicher,
- lange Streams mit Störungen und kontrolliertem Abbruch,
- keine Änderung des Ergebnisses durch UI-Skalierung.

### Nutzertest — Gates B und C

- `H-RASTER-DRY-01`: kleines Testbild im Checkmodus,
- `H-RASTER-BW-01`: Schwarzweiß-Testkarte,
- `H-RASTER-GRAY-01`: kleiner Graustufenverlauf,
- Ergebnis mit Vorschau, Maß und gleichmäßiger Bewegung vergleichen.

### Fertig, wenn

Line, Fill und Image den persönlichen Kernworkflow zuverlässig abdecken.

## Sprint 12 — Kameraausrichtung und Kalibrierung

### Bauen

- Kamerasnapshot als Hintergrund,
- Rotation/Spiegelung und exakte 400 × 400-mm-Bettausrichtung,
- druckbares asymmetrisches 4 × 11-Kreisraster, Mehrbild-Linsenkalibrierung,
  Verzerrungskorrektur und getrennt gespeicherte Linsen-/Bettkalibrierung,
- Overlay aus Dokument, Framing und Kamerabild,
- deutliche Unsicherheits-/Alterungsanzeige,
- Kamera dient nie als alleinige Sicherheitsgrenze.

### Vollautomatische Tests durch Agenten

- synthetische Kalibrierbilder mit bekannten Parametern,
- Reprojektion und Fehlermaß,
- gespeicherte/alte/inkompatible Kalibrierung,
- fehlende Frames während Overlay,
- Snapshot-Tests für Spiegelung, Rotation und DPI.

### Nutzertest — Gates B und C

- `H-CAL-01`: Kalibrierziel aufnehmen und Reprojektionsfehler dokumentieren,
- `H-CAM-FRAME-01`: laserloses Framing über Bildposition vergleichen,
- `H-CAM-MARK-01`: nach laserlosem Vollflächen-Framing vier feste 4 × 4-mm-X
  bei 40/40, 360/40, 360/360 und 40/360 mm mit maximal 10 % Leistung
  markieren, neu aufnehmen und den realen Kamera-/Laserfehler messen. Dieser
  Test bleibt phrase-gated, einmalig und ausschließlich nutzergestartet.

### Fertig, wenn

Der reale Positionierfehler erfasst, angezeigt und innerhalb eines vom Nutzer
akzeptierten Toleranzwerts liegt.

## Sprint 13 — Ausfälle, Performance und Langzeittest

### Bauen

- robuste Sitzungswiederherstellung ohne Jobwiederaufnahme,
- Logexport und Diagnosepaket,
- Speicher-/CPU-Optimierung,
- große Projekt- und Jobtests,
- sichere Behandlung von App-Absturz, Sleep/Wake und Netzwerkwechsel,
- reproduzierbarer Release Candidate.

### Vollautomatische Tests durch Agenten

- 100 wiederholte Simulatorjobs ohne Zustandsleck,
- stundenlanger beschleunigter virtueller Stream,
- Fault-Injection an jedem Streamzustand,
- Speicher-, Handle- und Listener-Leak-Prüfung,
- beschädigte Einstellungen und volle/gesperrte Datenträger-Simulation,
- Upgrade-/Downgrade-Migrationsfälle,
- kompletter Testlauf aus sauberem Checkout.

### Nutzertest — Gate B, optional Gate C

- lange laserlose Testbewegung und Kameraüberwachung,
- Sleep/Wake nur ohne laufenden Job,
- USB- und WLAN-Verlust nur bei laserlosem Test,
- anschließend ein bereits bewährter kleiner Referenzjob unter Aufsicht.

### Fertig, wenn

Keine offene sicherheitskritische Abweichung, kein reproduzierbares Ressourcenleck
und keine ungeklärte Session-Fortsetzung bestehen.

## Sprint 14 — persönliches Release 1.0

### Bauen

- lokale Windows-Installation beziehungsweise portable persönliche Variante,
- finale Hilfe, Sicherheitscheckliste und Diagnoseanleitung,
- Versionsanzeige und Build-Commit,
- Backup-/Restore-Anleitung,
- vollständiges Dependency- und Quelleninventar,
- Release-Manifest und SHA-256,
- keine Store- oder Weitergabefunktionen.

### Vollautomatische Tests durch Agenten

- kompletter Gate-A-Lauf aus sauberem Checkout,
- Release-Build zweimal erzeugen und reproduzierbare Inhalte vergleichen,
- Install/Start/Uninstall beziehungsweise Portable-Start,
- alle drei Jobarten im Simulator,
- Abhängigkeiten, Lizenzen, Secrets und unbeabsichtigte Upstream-Dateien prüfen,
- finale Sicherheitsinvarianten als blockierendes Release-Gate.

### Nutzerabnahme — Gates B und C

- Standardverbindung über LaserCam,
- direkter USB-Diagnoseweg,
- ein bekanntes Line-, Fill- und Raster-Referenzprojekt,
- Kameraausrichtung,
- Hold/Abort und Diagnoseexport,
- schriftliche persönliche Freigabe dieses Builds.

### Fertig, wenn

Der exakt geprüfte Build alle persönlichen Referenzjobs wiederholbar ausführt
und sämtliche Logs, Maße, Hashes und offenen Einschränkungen dokumentiert sind.

## Offener UI-Backlog für einen späteren Sprint

Diese Punkte gehörten ausdrücklich nicht mehr zum Umfang von Sprint 10. Der
Nutzer hat sie am 16. August 2026 vollständig Sprint 11 zugeordnet:

- sichtbarer **Home-/Ursprungsmarker** im Arbeitsbereich an `X0,Y0`, eindeutig
  mit `Home` und/oder `X0,Y0` beschriftet,
- Achsen- beziehungsweise Rasterbeschriftungen mit nachvollziehbaren
  Millimeterwerten für X und Y,
- lesbare Darstellung bei Zoom und Pan ohne überlagerte oder abgeschnittene
  Beschriftungen,
- eindeutige Übereinstimmung zwischen dargestelltem Ursprung, Maschinenprofil,
  Homing-Konvention und tatsächlich verwendeten Koordinaten; ein Arbeitsversatz
  darf nicht fälschlich als Maschinen-Home erscheinen,
- automatisierte Rendering-/Interaktionstests für Ursprung, Achsenrichtung,
  Rasterwerte, Zoomstufen und unterschiedliche Arbeitsflächengrößen.

## Offener technischer Performance-Backlog

Die folgende technische Schuld stammt aus dem React-/Vite-Performance-Audit
vom 16. August 2026. Sie verändert keinen fachlichen Umfang von Sprint 10.
Der Nutzer hat diesen Backlog am 16. August 2026 vollständig Sprint 11
zugeordnet. Die Reihenfolge P0 bis P3 bleibt verbindlich; die Rasterfunktion
wird erst auf einer gegen die P0-/P1-Regressionsrisiken abgesicherten Basis
freigegeben.

Für alle Punkte gilt verbindlich: Projektformat, CAM-/G-Code-Ausgabe,
Maschinenzustände, Sicherheits-Gates, Fehlermeldungen und sichtbares Verhalten
bleiben unverändert. Vor einer Optimierung werden charakterisierende Tests
beziehungsweise Golden Files ergänzt. Danach müssen die betroffenen Tests und
das vollständige Gate A grün sein; reale Hardware ist für diese Arbeiten nicht
erforderlich.

### P0 — zuerst beheben

- **Optionale Renderer-Funktionen aus dem Start-Chunk lösen**
  (`bundle-dynamic-imports`, `bundle-conditional`): Die statischen Imports in
  `apps/desktop/src/renderer/src/App.tsx` für CAM-Vorschau, Simulator,
  Connectivity, Maschinensteuerung, First Mark und Supervised Fill durch
  `React.lazy`/dynamische Imports und eine passende `Suspense`-Grenze ersetzen.
  Shell, Canvas, Inspector, ToolRail und Splash bleiben eager. Optional darf auf
  Hover/Fokus nur vorgeladen werden. Dialoginhalt, Fokusführung und
  Fehlerbehandlung dürfen sich nicht ändern. Das Audit fand im vorhandenen
  Build nur einen Renderer-JS-Chunk mit 837.670 Byte (etwa 150.893 Byte gzip);
  nach einem frischen Build unter der vorgeschriebenen Node-Version sind
  Start- und Feature-Chunks erneut zu messen.
- **Unabhängige sichere Dateischreibvorgänge parallelisieren**
  (`async-parallel`): In `apps/desktop/src/main/project-store.ts` Recovery- und
  Temp-Schreibvorgang sowie den bestmöglichen Backup-Copy nach `mkdir`
  gemeinsam starten. Der atomare Rename und das Entfernen der Recovery-Datei
  bleiben strikt hinter dieser Barriere. Vorher Ausfalltests für fehlende
  Primärdatei, gesperrten Datenträger und jeden Schreib-/Rename-Fehler ergänzen;
  Wiederherstellungsreihenfolge und Dateiinhalte müssen identisch bleiben.

### P1 — hohe Wirkung

- **Zod aus dem initialen Workspace-Abhängigkeitsgraphen entfernen:**
  `App.tsx -> editor/editor-state.ts -> domain/project.ts` lädt derzeit wegen
  `applyTransform` auch sämtliche Zod-Projektschemas. Reine Typen,
  `Transform` und Geometriefunktionen in ein Zod-freies Modul verschieben;
  Schema-Parsing bleibt an den bisherigen Lade-/Validierungsgrenzen. Das
  vorhandene Bundle enthält ungefähr 107 KB zusammenhängenden Zod-Code
  (isoliert etwa 19 KB gzip). Projektvalidierung und Fehlermeldungen müssen per
  Äquivalenztest unverändert bleiben.
- **CAM-Vorschau vom dringenden React-Renderpfad trennen:**
  `CamPreviewDialog.tsx` erzeugt CAM, vollständigen G-Code, SVG-Pfade und den
  geschlossenen G-Code-Detailinhalt synchron. Die Berechnung in einen Worker
  oder eine gleichwertige abbrechbare Hintergrundgrenze verschieben, stale
  Ergebnisse verwerfen und den G-Code-Text erst beim Öffnen der Details
  mounten. Die Vorschau darf intern Canvas beziehungsweise zusammengefasste
  Pfade verwenden, muss aber für normale Projekte visuell äquivalent bleiben.
  Export-Geometrie, Zeilenreihenfolge, Bounds, Laufzeit und Bytes der Golden
  Files bleiben exakt identisch. Große Fill-Fälle bis zu den bestehenden
  Ressourcenlimits benötigen einen Responsiveness-/Abbruchtest.
- **IPC-Polling serialisieren und deduplizieren:** Die festen Intervalle in
  `ConnectivityPanel.tsx`, `MachinePanel.tsx`, `FirstMarkDialog.tsx` und
  `SupervisedFillDialog.tsx` dürfen keine zweite Kamera-/Snapshot-Anfrage
  starten, solange die vorige läuft. Einen gemeinsamen Hook oder eine kleine
  Polling-Abstraktion mit In-flight-Sperre, Generation-ID und sauberem Cleanup
  verwenden. Keine Statusänderung darf verloren gehen; alte Antworten dürfen
  neuere Zustände nicht überschreiben. Maschinenbefehle und Safety Gates werden
  nicht in diese Abstraktion verlagert.

### P2 — Render- und Algorithmusarbeit reduzieren

- **Workspace gegen fachfremde Re-Renders isolieren:** `CanvasStage` und
  `Inspector` memoizieren beziehungsweise Workspace-, Status-, Splash- und
  Dialogzustände so trennen, dass unveränderte Editor-Props keinen erneuten
  Dokumentrender auslösen. React-Profiler-Tests oder Renderzähler sichern die
  Verbesserung, bestehende UI-Tests die Verhaltensgleichheit.
- **Objektgeometrie bei reinen Auswahländerungen wiederverwenden:**
  `ObjectShape` memoizieren, stabile Auswahl-Callbacks einsetzen und
  unveränderte `points`-Strings nicht erneut berechnen. Bei Auswahlwechseln
  sollen nur tatsächlich anders markierte Objekte neu rendern; SVG-Ausgabe und
  Auswahlsemantik bleiben identisch.
- **Containment-Planung ohne wiederholte Geometriearbeit:** In
  `cam/line-cam.ts` Bounds einmal pro Kandidat berechnen, bei eindeutigem
  `outside` früh abbrechen und temporäre State-Arrays vermeiden. Optional erst
  nach Messung einen räumlichen Index ergänzen. Vorher/nachher müssen CAM-IR,
  Pfadreihenfolge und G-Code-Golden-Files bytegleich sein.
- **Layerzählung linearisieren:** In `Inspector.tsx` Objektzahlen je Layer in
  einem Durchlauf als memoizierte `Map<layerId, count>` bilden, statt pro Layer
  erneut alle Objekte zu filtern. Sichtbare Zählwerte bleiben identisch.

### P3 — kleine, messbare Bereinigungen

- In `ConnectivityPanel.tsx` den ausgewählten Port pro Render nur einmal
  bestimmen.
- In `App.tsx` Warning-/Error-Diagnostics in einem Durchlauf zählen.
- In `CanvasStage.tsx` sichtbare und gesperrte Layer in einem gemeinsamen,
  memoisierten Durchlauf ableiten.
- In `cam/line-cam.ts` Maximum-/Planungsschritte ohne wiederholte
  `map`-Allokationen durchführen.
- Diese Mikrooptimierungen nur zusammen mit Profiling oder als Teil einer
  ohnehin betroffenen Änderung umsetzen; Lesbarkeit hat Vorrang.

### Audit- und Abnahmehinweis

Der Audit war eine statische Prüfung des aktuellen Arbeitsbaums plus Auswertung
des vorhandenen Renderer-Artefakts. Ein frischer Build war in der
Prüfumgebung nicht möglich: `package.json` verlangt Node `>=24`, verfügbar war
Node 22, und die lokale `electron-vite`-Installation war unvollständig. Vor
Beginn dieses Backlogs ist deshalb zuerst die dokumentierte Node-24-Umgebung
herzustellen und eine reproduzierbare Ausgangsmessung für Chunkgrößen,
CAM-Latenz, Renderzahlen und parallele IPC-Aufrufe abzulegen.

## Agentenprozess pro Sprint

Jeder ausführende Agent arbeitet später in dieser Reihenfolge:

1. `AGENTS.md`, diesen DEV-Plan und die für den Sprint genannten Sicherheits-
   und Architekturdateien vollständig lesen.
2. Aktuellen Sprint, In-Scope-Dateien und Abnahmekriterien nennen.
3. Arbeitsbaum und vorhandene Nutzeränderungen prüfen; nichts Fremdes
   überschreiben.
4. Zuerst einen fehlschlagenden oder neuen automatisierten Test erstellen,
   soweit die Aufgabe testbar ist.
5. Kleinste zusammenhängende Implementierung vornehmen.
6. relevante Tests und danach den vollständigen Gate-A-Lauf ausführen.
7. Sicherheits- und Regressionsprüfung durchführen.
8. Testbericht mit Befehlen, Ergebnissen, Build/Commit, offenen Risiken und
   nächstem Hardwaretest ablegen.
9. Bei Gate B/C stoppen, das genaue Protokoll zeigen und auf die ausdrückliche
   Nutzerfreigabe warten.
10. Nach Hardwaretest Messwerte und Transcript auswerten und jeden Fehler zuerst
    automatisiert reproduzierbar machen.

Ein Agent erklärt einen Sprint nicht für abgeschlossen, wenn Tests ausgelassen,
Hardwarewerte geraten, Warnungen unterdrückt oder Abnahmekriterien nur teilweise
erreicht wurden.

## Definition of Ready

Ein Sprint darf beginnen, wenn:

- der vorherige Sprint abgeschlossen oder der unabhängige Teil klar abgegrenzt
  ist,
- Eingaben, Fixtures und erwartete Ergebnisse bekannt sind,
- keine ungeklärte Sicherheitsannahme für die geplante Arbeit nötig ist,
- bei Hardwaretests das genaue Gerät, Profil und Testprotokoll benannt sind.

## Definition of Done

Ein Sprint ist fertig, wenn:

- alle vorgesehenen Funktionen implementiert und dokumentiert sind,
- alle neuen und bestehenden Gate-A-Tests grün sind,
- relevante Negativ- und Ausfallfälle geprüft sind,
- Codeabdeckung nicht durch Ausschlüsse künstlich verbessert wurde,
- kein Secret und kein ungeprüfter Fremdcode eingecheckt wurde,
- Testbericht und reproduzierbare Fixtures vorliegen,
- erforderliche Gate-B-/Gate-C-Tests durch den Nutzer bestanden sind,
- neue reale Fehler einen Regressionstest besitzen,
- offene Einschränkungen ausdrücklich dokumentiert sind.

## Änderungsregel für diesen Plan

Neue Funktionen werden nur einem späteren Sprint hinzugefügt oder tauschen mit
ausdrücklicher Entscheidung eine bestehende Aufgabe aus. Sicherheits-Gates,
kein Auto-Resume und die Nutzerfreigabe vor Laseremission dürfen nicht aus
Zeitgründen abgeschwächt werden.
