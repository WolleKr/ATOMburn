# CAM, Rasterung und G-Code

## Gemeinsamer G-Code-Rahmen

Ein typischer GRBL-Job benötigt einen defensiven Header und Footer. Die genaue
Ausgabe wird aus dem realen Controllerprofil abgeleitet.

Beispiel, nicht ungeprüft am Gerät ausführen:

```gcode
G21         ; Millimeter
G90         ; absolute Koordinaten
M5          ; Laser aus
M4 S0       ; dynamischer Lasermodus, zunächst aus
...
M5
G0 X0 Y0    ; nur wenn Rückkehrposition bewusst konfiguriert ist
```

`S`-Werte werden nicht fest auf 1000 angenommen:

```text
sValue = round(clamp(powerPercent, 0, 100) / 100 * controller.$30)
```

## Line

### Implementierungsstand Sprint 8

ATOMburn besitzt eine eigene neutrale `CamResult`-Zwischenrepräsentation. Sie
enthält vollständig transformierte Millimeterpfade, Operation, Durchgang,
Feedrate, auf den gelesenen `$30`-Wert skalierte Leistung, Bounds,
Framing-Rechteck und eine als Schätzung gekennzeichnete Laufzeit.

Der Sprint-8-Export war zunächst nur für aktivierte Line-/Score-Operationen freigegeben und
verlangt einen positiven `$30`-Wert sowie bestätigtes `$32=1`. Raster-, nicht endliche, leere oder außerhalb der verifizierten 400 × 400 mm liegende Geometrie wird
blockiert. Geschlossene kleinere Konturen werden vor größeren Konturen
ausgegeben. Rechtecke und Ellipsen werden in deterministische Pfade überführt;
importierte Bézierkurven liegen bereits als kontrolliert linearisierte Pfade
vor.

Der Hauptprozess akzeptiert beim Speichern ausschließlich G-Code, den der
ATOMburn-Rückparser gegen erlaubte Befehle, sicheren Header/Footer, Position vor
Leistungsfreigabe und laserlose G0-Fahrten geprüft hat. Sprint 8 besitzt keinen
IPC-Weg zum Versand dieses Codes an eine reale Maschine.

Pipeline:

1. Transformationen in reale Dokumentkoordinaten einrechnen.
2. Kurven mit dokumentierter Toleranz linearisieren oder als G2/G3 ausgeben.
3. Pfade auf Geschlossenheit und Degeneration prüfen.
4. Optional Kerf-Offset berechnen.
5. Innenkonturen vor Außenkonturen sortieren.
6. Leerfahrten und Startpunkte optimieren.
7. Pro Durchgang G-Code erzeugen.

M4 ist ein sicherer allgemeiner Standard, da die Leistung bei Stillstand auf
null fällt. M3 kann für bestimmte Material-/Schnittrezepte auswählbar sein,
muss aber klar als konstante Leistung dargestellt werden.

## Fill

### Implementierungsstand Sprint 10

Eine Fill-Operation behandelt alle ausgewählten geschlossenen Vektorobjekte als
eine deterministische **Even-Odd-Konturgruppe**. Verschachtelte Konturen bilden
Löcher; disjunkte Konturen bleiben getrennte Inseln. Überlappende Konturen
folgen damit bewusst der XOR-Semantik der Even-Odd-Regel und werden nicht als
Boolean-Union interpretiert.

Der implementierte MVP:

- verlangt einen positiven endlichen `lineSpacingMm`,
- setzt die Scanlinien symmetrisch zentriert zwischen die Y-Grenzen,
- ignoriert horizontale Kanten und verwendet halb offene Kantenintervalle,
- sortiert und paart Schnittpunkte nach der Even-Odd-Regel,
- gibt getrennte Segmente alternierend links-rechts/rechts-links aus,
- fährt zwischen Inseln und über Löcher ausschließlich mit `M5` und `G0`,
- wiederholt die vollständige deterministische Segmentfolge pro Durchgang,
- prüft rohe transformierte Bounds vor der Füllberechnung,
- blockiert übergroße Scanline-, Schnitt- und Ausgabebudgets vor unkontrollierter
  CPU- oder Speicherbelegung.

Offene Pfade und Rasterobjekte sind für Fill gesperrt. Rechtecke mit
Eckenradius, Ellipsen, Transformationen, Löcher, Inseln und
Selbstüberschneidungen werden polygonal und deterministisch verarbeitet. Die
G-Code-Quantisierung auf vier Dezimalstellen erfolgt erst nach der geometrischen
Schnittberechnung.

Overscan ist noch nicht Teil des Sprint-10-Vektor-Fills. Er wird erst mit einer
expliziten Beschleunigungs- und Bounds-Regel ergänzt. Vertikale, gewinkelte und
konturparallele Füllungen bleiben spätere Erweiterungen.

### Beaufsichtigte Sprint-10-Grenze

Der reale Fill-Pfad ist vom freien Export getrennt und akzeptiert für die ersten
Gates ausschließlich genau eine aktivierte Fill-Operation mit 600 mm/min,
15 Prozent, 0,05 bis 1 mm Zeilenabstand, höchstens 10 × 10 mm, maximal 180
Sekunden sowie genau einen (`H-FILL-01`) oder zwei (`H-PASS-01`) Durchgänge.
Vor jedem Start werden `$30`, `$32`, `$130` und `$131` neu gelesen, der G-Code
neu erzeugt und gegen das unveränderliche Ticket geprüft. Homing und laserloses
Framing müssen im selben Dialog ausgeführt werden. Der Nutzer startet jeden
Test selbst mit der exakten Testphrase; es gibt keinen automatischen oder
ferngesteuerten Start.

## Image

Pipeline:

1. Bild laden und Farbprofil berücksichtigen.
2. Zuschneiden/Transformieren auf Zielgröße.
3. Helligkeit, Kontrast und Gamma anwenden.
4. Auf reale Pixelauflösung anhand Zeilenabstand skalieren.
5. Threshold, Dither oder Graustufe anwenden.
6. Transparente Pixel als Laser aus behandeln.
7. Zeilen in Runs gleicher beziehungsweise ähnlicher Leistung komprimieren.
8. Overscan und bidirektionale Richtung hinzufügen.

Zusammenhang:

```text
DPI = 25.4 / lineIntervalMm
```

Ein kleinerer Zeilenabstand ist nicht automatisch besser. Überlappende Punkte
verlängern Jobs und können Material unnötig erhitzen.

## Dithering

Frühe Strategien:

- Threshold für echte Schwarzweißgrafik,
- Bayer/Ordered für regelmäßige Flächen,
- Floyd-Steinberg für Fotos,
- Graustufe durch variable `S`-Werte.

Atkinson, Jarvis und Stucki können später als austauschbare Pixelstrategien
folgen. Testbilder und Golden Files müssen eine Änderung der Algorithmen
sichtbar machen.

## Overscan

Beim Richtungswechsel erreicht der Kopf nicht sofort die Sollgeschwindigkeit.
Ohne Overscan werden Ränder dunkler. Die App verlängert deshalb Rasterzeilen bei
ausgeschaltetem Laser.

Overscan gehört zwingend in die Bounds-Prüfung. Ein Bild, das geometrisch in die
400-mm-Breite passt, kann mit Overscan trotzdem außerhalb liegen.

Eine spätere physikalische Berechnung kann aus Geschwindigkeit und gelesener
Beschleunigung eine Mindeststrecke abschätzen:

```text
distance = velocity^2 / (2 * acceleration)
```

Im MVP kann zusätzlich ein konservativer, konfigurierbarer Prozentwert genutzt
werden.

## Pfadoptimierung

Reihenfolge der frühen Optimierungen:

1. explizite Operationsreihenfolge,
2. Gravieren/Markieren vor Durchschneiden,
3. Innenkonturen vor Außenkonturen,
4. nächster Pfad beziehungsweise nächster Endpunkt,
5. optimale Pfadrichtung,
6. doppelte, deckungsgleiche Linien erkennen.

Optimierung darf Geometrie nicht unbemerkt verändern. Original- und optimierte
Pfadlänge sowie entfernte Duplikate werden in der Vorschau ausgewiesen.

## Zeitabschätzung

Eine erste Schätzung summiert Bewegungsstrecke geteilt durch Feed. Eine bessere
Simulation berücksichtigt:

- maximale Achsgeschwindigkeit,
- Beschleunigung und Abbremsung,
- Richtungswechsel,
- G0-Geschwindigkeit,
- mehrere Durchgänge,
- Pausen durch Moduswechsel.

Die UI muss eine Schätzung als solche kennzeichnen.

## Preflight

Vor G-Code-Export und erneut vor Start prüfen:

- alle Werte endlich und im erlaubten Bereich,
- Arbeitsfläche einschließlich Overscan,
- Leistungsskala stimmt mit `$30` überein,
- `$32=1` beziehungsweise bewusster kompatibler Modus,
- keine unbekannten oder verbotenen G-/M-Codes,
- Laser im Header und Footer sicher aus,
- keine Bewegung vor festgelegtem Koordinatenmodus,
- Job besitzt tatsächlich auszugebende Geometrie,
- geschätzte Laufzeit und maximale Leistung werden bestätigt.

## G-Code-Checkmodus

GRBLs `$C`-Checkmodus kann G-Code parsen, ohne Motoren auszuführen. Der
Hardware-Spike soll prüfen, ob er auf dem X30-Pro-Controller erwartungsgemäß
funktioniert. Checkmodus ist eine zusätzliche Prüfung, kein Ersatz für unsere
eigene Begrenzungsanalyse.
