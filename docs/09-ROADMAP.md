# Roadmap

> Historische Grobplanung. Für Reihenfolge, Sprint-Gates, automatische Tests,
> Nutzer-Hardwaretests und Agentenregeln gilt verbindlich der
> [DEV-Plan für ATOMburn](16-DEV-PLAN.md).

## Phase 0: Hardware-Spike

Ziel: LaserCam-/GRBL-Kommunikationsrisiko beseitigen, noch ohne Editor.

- LaserCam-IP, Firmware und aktuellen TCP-Port erfassen
- MJPEG-Endpoint anzeigen und Snapshot speichern
- TCP-Bridge verbinden und X30 Pro dahinter identifizieren
- Welcome, `$I`, `$$`, `$G` und `?` lesen und protokollieren
- Statusparser mit aufgezeichnetem Transcript testen
- Home und kleine Jog-Bewegungen bei ausgeschaltetem Laser
- laserloses Rechteck-Framing
- GRBL-Checkmodus testen
- winzige, manuell geprüfte G-Code-Datei gepuffert streamen
- Hold, Resume und Abbruch testen
- WLAN-Unterbrechung, TCP-Abbruch, LaserCam-Neustart, USB zwischen Bridge und
  Controller sowie Controller-Reset getrennt testen
- parallelen Zugriff durch LightBurn/BeagleEngrave erkennen und verständlich
  melden
- direkten USB-Zugriff nur als Diagnosefallback testen
- MeerK40ts TCP-Verhalten und GRBL-Transkripte als Vergleich heranziehen
- eigenen LaserCam-TCP-Mock für `ok`, `error`, `ALARM`, Reset, Teilpakete und
  Verbindungsabbruch bauen

Abnahmekriterium: keine ungeklärten Zustands- oder Pufferfehler.

## Phase 1: Headless CAM

- versioniertes Maschinenprofil
- CAM-Zwischenrepräsentation
- SVG-Pfade importieren
- Line-G-Code erzeugen
- Bounds-/Finite-Value-Prüfung
- G-Code-Parser und 2D-Vorschau
- `.gc` speichern
- Snapshot-Tests
- MeerK40t-Golden-Fälle für Rechteck, verschachtelte Konturen und Pfadreihenfolge
  in AtomBurn-Fixtures übersetzen

Abnahmekriterium: mehrere bekannte SVG-Fixtures erzeugen deterministischen,
checkbaren und maßhaltigen G-Code.

## Phase 2: Minimaler Desktop-Workflow

- Arbeitsfläche
- Auswahl und Transformation
- Operationsliste
- Geschwindigkeit, Leistung und Durchgänge
- Verbindungspanel und Maschinenstatus
- integriertes MJPEG-Livebild und Snapshot
- Preview, Frame und Start
- Pause, Resume, Stop
- eigenes Projektformat

Abnahmekriterium: SVG bis fertiges Teststück ohne andere Software.

## Phase 3: Fill und Raster

- Scanline Fill mit Löchern
- PNG/JPEG
- Threshold und Floyd-Steinberg
- variable Graustufenleistung
- Zeilenabstand/DPI
- bidirektionales Scannen
- Overscan plus Bounds-Prüfung
- Laufzeitschätzung

Abnahmekriterium: gefüllte Vektoren und Fotos ohne sichtbare Pufferpausen oder
unbeabsichtigte dunkle Ränder.

## Phase 4: Produktivität

- Materialrezepte
- Materialtest und Intervalltest
- Innenkonturen zuerst
- Leerfahrten reduzieren
- doppelte Linien finden
- Text-zu-Pfad
- DXF-Import
- Boolesche Operationen und Kerf
- MeerK40t-Optimierungstests als portierte Paritätstests verwenden

## Phase 5: optionale Erweiterungen

- VTracer
- SVGnest
- vollständige Kamerakalibrierung und Werkstückausrichtung
- Rotary
- Erweiterungsrahmenprofil
- Print-and-Cut

## Reihenfolge der technischen Entscheidungen

1. LaserFlow-Module über LaserCam-TCP gegen X30 Pro testen.
2. Electron-Packaging mit TCP, MJPEG und seriellem Diagnosefallback testen.
3. TypeScript beibehalten oder auf .NET/Rayforge wechseln.
4. Editor-/Geometriebibliothek auswählen.
5. Projektformat einfrieren, sobald Line/Fill/Image stabil sind.

## Nicht verhandelbare Gates

- Kein echter Laserjob ohne Preflight.
- Kein Firmware-Schreiben im MVP.
- Keine automatische Wiederaufnahme nach WLAN-, TCP-, Bridge- oder Portverlust.
- Kein Release ohne Tests für Hold, Abort, Reset und Bounds.
- Keine Fremdcodeübernahme ohne Inventareintrag und Lizenzdatei.
