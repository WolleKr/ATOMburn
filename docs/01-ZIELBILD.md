# Zielbild und Abgrenzung

## Produktidee

AtomBurn soll den vollständigen persönlichen Arbeitsablauf abdecken:

1. Grafik importieren oder einfache Geometrie erstellen.
2. Objekte auf der realen Arbeitsfläche platzieren.
3. Objekte Laseroperationen zuweisen.
4. Werkzeugpfad und Reihenfolge prüfen.
5. Arbeitsbereich am Gerät abfahren (Framing).
6. Job über die Mintion LaserCam V2 im lokalen WLAN senden oder als `.gc` für
   die TF-Karte speichern.
7. Livebild, Status, Fortschritt, Pause und Abbruch in AtomBurn kontrollieren.

## Kernprinzipien

- **Eine Gerätekette:** nur Mintion LaserCam V2 als WLAN-Bridge zu einem
  ATOMSTACK X30 Pro; direkter USB-Zugriff dient als Diagnose-Fallback.
- **Windows zuerst:** keine Plattformabstraktion im MVP.
- **Offline und lokal:** kein Konto und kein Cloud-Zwang.
- **Vorhersagbar:** gleiche Eingabe und Einstellungen erzeugen gleichen G-Code.
- **Sicherer Standard:** Laser aus, bis eine ausdrücklich erlaubte Bewegung
  beginnt; keine automatische Wiederaufnahme nach Verbindungsabbruch.
- **Projektdatei statt versteckter Zustände:** alle jobrelevanten Einstellungen
  werden mit dem Projekt gespeichert.
- **Testbarkeit:** CAM und G-Code-Erzeugung funktionieren ohne angeschlossenen
  Laser und liefern vergleichbare Snapshots.

## MVP

### Dokument und Editor

- verifizierte GRBL-Arbeitsfläche 400 x 400 mm (`$130=400`, `$131=400`)
- SVG/SVGZ, DXF und LightBurn `.lbrn`/`.lbrn2` importieren
- PNG, JPEG und BMP importieren
- bis Release 1.0 zusätzlich PDF-Vektor und HPGL/PLT; AI/EPS über eine lokal
  geprüfte Konvertierung, sofern Geometrie und Maßstab zuverlässig bleiben
- Auswahl, Verschieben, Skalieren, Drehen, Spiegeln, Duplizieren
- Gruppierung und Ausrichtung
- Ebenen beziehungsweise Operationen
- Undo/Redo
- Speichern und Öffnen eines eigenen Projektformats

### Laseroperationen

- Line: Kontur schneiden oder markieren
- Fill: geschlossene Vektoren zeilenweise füllen
- Image: Rasterbild gravieren
- Geschwindigkeit in mm/min
- Leistung in Prozent, intern über den gelesenen GRBL-Wert `$30` skaliert
- Anzahl Durchgänge
- Reihenfolge der Operationen
- optional Air Assist je Operation, falls die vorhandene Hardware steuerbar ist

### Maschinensteuerung

- LaserCam-IP beziehungsweise Hostname und konfigurierbarer TCP-Port
- TCP-Verbindung zur GRBL-Bridge; optional direkter COM-Port für Diagnose
- Verbinden/Trennen
- GRBL-Identifikation und Konfigurationslesung
- Position und Maschinenzustand
- Home, Unlock und Jog
- Framing ohne Laser als Standard
- G-Code-Prüflauf
- Start, Feed Hold, Resume, sicherer Abbruch
- Konsolen- und Diagnoseprotokoll
- Export als `.gc`/`.nc`

### LaserCam

- integriertes MJPEG-Livebild ohne SplitCam
- getrennte Zustände für Kamera, TCP-Bridge und GRBL-Controller
- Snapshot für Positionierung und Diagnose
- Warnung bei Standardkennwort und konkurrierender Steueranwendung
- keine automatische Jobfortsetzung nach WLAN-, TCP- oder Bridge-Abbruch

## Nicht im MVP

- Ruida, Trocen, Marlin, Smoothieware, Galvo oder andere Laser
- proprietäre BeagleEngrave-Cloud-/App-Funktionen
- Rotary oder motorisierte Z-Achse
- proprietäre oder beschädigte AI/EPS-Funktionen, die lokal nicht zuverlässig
  in eine sichere neutrale Geometrie konvertiert werden können
- vollwertiges CAD oder Illustrator-Ersatz
- automatisches Nesting
- Print-and-Cut
- Cloud-Synchronisation
- Start über Internet oder Cloud; lokales WLAN ist erlaubt, der Job bleibt
  beaufsichtigungspflichtig

## Spätere Möglichkeiten

- weitere CAD-/Plotterformate jenseits DXF, PDF und HPGL/PLT
- Text mit Konvertierung in Pfade
- Knotenbearbeitung und Bézier-Werkzeuge
- Boolesche Operationen und Kerf-Offset
- Bildnachzeichnung über VTracer
- Material-, Leistungs-, Intervall- und Fokus-Testmuster
- automatisches Nesting über SVGnest
- vollständige Linsen-/Kamerakalibrierung und Werkstückausrichtung
- Rotary-Modus durch Ersetzung der Y-Achse
- Wiederaufnahme eines Jobs ab einem bewusst gewählten Werkzeugpfadsegment
- Erweiterungsrahmen 400 x 850 mm als zweites X30-Pro-Profil

## Erfolgskriterien des ersten Releases

- Ein einfaches SVG kann maßhaltig importiert und platziert werden.
- AtomBurn liest das konkrete Gerät, statt kritische Werte zu erraten.
- Der G-Code besteht einen GRBL-Checklauf ohne Fehler.
- Framing bleibt innerhalb des Arbeitsbereichs einschließlich Overscan.
- Ein Testquadrat kann mit erwarteter Größe und Leistung markiert werden.
- Ein gefülltes Rechteck und ein Rasterbild laufen ohne Pufferunterbrechungen.
- Pause und Abbruch schalten den Laser nachvollziehbar ab.
- WLAN-/TCP-/USB-Verlust führt zu einem sicheren Fehlerzustand und nie zu
  Auto-Resume.
