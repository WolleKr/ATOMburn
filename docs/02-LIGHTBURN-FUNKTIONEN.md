# LightBurn-Funktionsanalyse

LightBurn kombiniert Editor, Bildverarbeitung, Laser-CAM, Simulation,
Materialverwaltung und Maschinensteuerung. AtomBurn muss diese Kategorien
verstehen, aber nicht vollständig kopieren.

## Dateiverwaltung

LightBurn unterstützt unter anderem AI, SVG, DXF, PDF, PLT/HPGL, PNG, JPEG,
BMP, GIF und TIFF. Projekte enthalten Geometrie, Bilder, Ebenen und
Lasereinstellungen. Maschinenfertige Dateien werden für GRBL als G-Code
gespeichert.

### AtomBurn-Entscheidung

- MVP: SVG, PNG, JPEG und eigenes Projektformat
- bald danach: DXF
- später: PDF
- AI/PLT/GIF/TIFF nur bei konkretem Bedarf
- fremde LightBurn-Projektdateien sind kein Ziel des MVP

## 2D-Editor

LightBurn bietet Formen, Linien, Text, Knotenbearbeitung, Gruppierung,
Ausrichtung, Verteilung, Spiegelung, Arrays, Offsets, Boolesche Operationen,
Trimmen, Pfadschluss, Fillets und Nesting.

### AtomBurn-Entscheidung

Zuerst soll AtomBurn ein sehr guter Job-Editor und kein vollständiges CAD sein.
Importierte Dateien müssen zuverlässig transformierbar sein. Rechteck, Kreis,
Linie und Text-zu-Pfad folgen erst, wenn der Maschinenpfad stabil ist.

## Cuts und Layers

Objekte werden farbigen Ebenen beziehungsweise Operationen zugewiesen. Wichtige
Modi sind:

- Line: Pfadkontur abfahren
- Fill: geschlossene Formen durch parallele Linien füllen
- Offset Fill: konturparallele Füllung
- Image: pixelbasierte Rastergravur

Gemeinsame Einstellungen umfassen Geschwindigkeit, Leistung, Durchgänge,
Ausgabe an/aus und Air Assist. Fortgeschrittene Optionen sind Kerf, Tabs,
Perforation sowie Lead-in/Lead-out.

### AtomBurn-Entscheidung

MVP enthält Line, Fill und Image. Offset Fill, Kerf und Tabs kommen später.
Operationen werden unabhängig von Darstellungsfarben modelliert; Farbe ist nur
eine UI-Hilfe und kein Primärschlüssel.

## Bildverarbeitung

LightBurn besitzt Helligkeit, Kontrast, Gamma, Schärfung, Crop/Mask und mehrere
Rasterverfahren:

- Threshold
- Ordered/Bayer
- Atkinson
- Floyd-Steinberg beziehungsweise Dither
- Stucki
- Jarvis
- Newsprint/Halftone
- Grayscale mit variabler Leistung

Außerdem gibt es Zeilenabstand/DPI, bidirektionales Scannen, Scanwinkel,
Negativdarstellung, Dot-Width-Korrektur und Overscan.

### AtomBurn-Entscheidung

MVP: Threshold, Floyd-Steinberg, Graustufe, Zeilenabstand, bidirektionales
Scannen und berechneter Overscan. Weitere Dither-Verfahren sind isolierte,
leicht ergänzbare Strategien.

## Planung und Vorschau

LightBurn zeigt Schneidbewegungen, Leerfahrten, Reihenfolge und geschätzte
Laufzeit. Der Planer kann unter anderem:

- Ebenenreihenfolge beachten,
- Innenkonturen zuerst schneiden,
- Leerfahrten reduzieren,
- besten Startpunkt und Richtung wählen,
- doppelte Linien entfernen.

### AtomBurn-Entscheidung

MVP zeigt den tatsächlich erzeugten G-Code, Grenzen und ungefähre Laufzeit.
Innenkonturen zuerst und ein deterministischer Nearest-Neighbor-Planer folgen
früh. Jede Optimierung muss abschaltbar und per Snapshot testbar sein.

## Positionierung und Kontrolle

LightBurn unterstützt absolute Koordinaten, aktuelle Position und Benutzer-
Ursprung, Jogging, Homing, Framing, Jobstart, Pause, Stop, Konsole und
Maschineneinstellungen.

### AtomBurn-Entscheidung

Zunächst absolute Koordinaten bei funktionierendem Homing und Current Position
als bewusste Alternative. Benutzerursprung folgt nach Tests. Die App zeigt
Maschinenkoordinaten und Arbeitskoordinaten eindeutig getrennt.

## Bibliotheken und Tests

LightBurn verwaltet Materialrezepte und erzeugt Material-, Fokus- und
Intervalltests.

### AtomBurn-Entscheidung

Materialrezepte gehören in das frühe Produkt. Material- und Intervalltest sind
wichtiger als eine große Formbibliothek und werden nach dem MVP gebaut.

## Fortgeschrittene Funktionen

Camera, Rotary, Print-and-Cut, Repeat Marking, Feeder, variable Texte,
Barcodes, Galvo-Kalibrierung und Zylinderkorrektur sind dokumentiert, für den
persönlichen X30-Pro-Einsatz aber vorerst nicht nötig.

## Quellen

- [LightBurn: Tools & Features](https://docs.lightburnsoftware.com/2.0/Reference/)
- [LightBurn: File Management](https://docs.lightburnsoftware.com/latest/Reference/FileManagement/)
- [LightBurn: Image Mode](https://docs.lightburnsoftware.com/latest/Reference/CutSettingsEditor/ImageMode/)
- [LightBurn: Preview](https://docs.lightburnsoftware.com/latest/Reference/Preview/)
- [LightBurn: Optimization Settings](https://docs.lightburnsoftware.com/1.7/Reference/OptimizationSettings/)
- [LightBurn: Cuts/Layers](https://docs.lightburnsoftware.com/latest/Reference/CutsLayersWindow/)
