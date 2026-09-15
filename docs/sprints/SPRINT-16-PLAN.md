# Sprint 16 — Automatische Erkennung der Bett-Kalibriermarken

## Ziel

ATOMburn erkennt die fünf Referenzmarken der 400 × 400-mm-Kalibrierkarte
automatisch im entzerrten Kamerabild, ordnet sie den bekannten
Maschinenkoordinaten zu und setzt daraus zunächst **editierbare Vorschläge**.
Der Nutzer kontrolliert die Fadenkreuze und darf jeden Punkt manuell
korrigieren. Automatische Erkennung speichert keine Kalibrierung und löst
weder Bewegung noch Laseremission aus.

Die vorausgesetzte Hardwareabnahme aus Sprint 12 wurde am 31.08.2026 durch den
Nutzer als vollständig erfolgreich bestätigt. Die gespeicherte Fünfpunkt-
Kalibrierung liegt vor; Sprint 16 darf nach Abschluss von Sprint 15 beginnen.

## Kalibrierziel

- Die bisherige 400 × 400-mm-Karte erhält fünf maschinenlesbare, eindeutig
  unterscheidbare Marken an X/Y 40/40, 360/40, 360/360, 40/360 und 200/200 mm.
- Bevorzugte Variante: vier lageeindeutige ArUco- oder AprilTag-Marken plus
  eine eigene Mittelpunktmarke. Die konkrete Markerfamilie wird anhand der im
  Produktionsbuild zuverlässig verfügbaren OpenCV-Funktionen festgelegt.
- Jede Marke enthält zusätzlich das bisherige sichtbare Fadenkreuz, damit eine
  manuelle Korrektur auch bei gescheiterter automatischer Erkennung möglich
  bleibt.
- PDF-Seiten, Schnittkanten, 100-mm-Kontrolllinien und Montageanordnung bleiben
  maßhaltig. Drucken erfolgt weiterhin bei 100 % / tatsächlicher Größe.

## Erkennungsablauf

1. Frischen Kamerasnapshot laden und mit der gespeicherten Linsenkalibrierung
   entzerren.
2. Nur die festgelegte Markerfamilie und erlaubten IDs suchen.
3. Markerzentrum beziehungsweise definierten Fadenkreuz-Schnittpunkt mit
   Subpixel-Genauigkeit bestimmen.
4. IDs eindeutig den fünf Maschinenkoordinaten zuordnen; keine Zuordnung allein
   anhand zufälliger Links-/Rechtslage vornehmen.
5. Plausibilität prüfen: fünf eindeutige IDs, konvexe Eckreihenfolge,
   Mittelpunkt innerhalb des Vierecks, passende Größenverhältnisse und keine
   entartete Perspektivtransformation.
6. Reprojektionsfehler und Erkennungsqualität berechnen.
7. Gefundene Punkte als anders gekennzeichnete **automatische Vorschläge**
   anzeigen. Jeder Punkt bleibt per Zoom und Mausklick korrigierbar.
8. Erst nach Nutzerbestätigung und bestehender Fehlergrenze darf die
   Bettkalibrierung gespeichert werden.

## Bedienoberfläche

- Schaltfläche „Detect five bed marks“ nur bei vorhandenem Snapshot und
  gültiger Linsenkalibrierung aktivieren; Tooltip nennt andernfalls die
  fehlende Voraussetzung.
- Während der Analyse einen eindeutigen Status anzeigen und Mehrfachklicks
  sperren.
- Ergebnis als `5/5 detected`, Teilfund oder verständlichen Fehler ausgeben.
- Automatisch gesetzte und manuell korrigierte Punkte optisch unterscheiden.
- Qualitätsanzeige je Punkt sowie Gesamt-RMS/Maximum anbieten, ohne unklare
  Prozentwerte als Genauigkeitsgarantie darzustellen.
- „Accept detected points“ übernimmt nur plausible Vorschläge. „Discard“ lässt
  die zuletzt gespeicherte Kalibrierung unverändert.
- Manuelles Setzen bleibt vollständiger Fallback und darf nie von der
  automatischen Funktion abhängig sein.

## Sicherheits- und Datenregeln

- Bildanalyse bleibt lokal und sendet keine Bilder an externe Dienste.
- Erkennung autorisiert keine Maschinenbewegung und keine Laseremission.
- Ein unvollständiger, mehrdeutiger oder geometrisch unplausibler Fund wird
  nicht automatisch ergänzt oder gespeichert.
- Snapshot-ID, Kamera-ID, Linsenkalibrierungs-ID, Bildauflösung,
  Erkennungsalgorithmus/-version und manuelle Änderungen werden mit der
  Kalibrierung nachvollziehbar gespeichert.
- Ein neuer Snapshot macht noch nicht bestätigte Vorschläge sichtbar veraltet.
- Änderungen an Kamera, Fokus, Auflösung oder Arbeitshöhe folgen weiterhin der
  vorhandenen Invalidierungslogik aus Sprint 12.

## Automatische Tests (Gate A)

### Erkennungs-Fixtures

- Exakte frontale Karte: alle fünf IDs und Zentren innerhalb der festgelegten
  Pixeltoleranz.
- Perspektive, Rotation 0/90/180/270 Grad sowie zulässige Spiegeloptionen:
  weiterhin korrekte ID- und Maschinenpunktzuordnung.
- Reale Sprint-12-Kamerabilder mit Linsenverzeichnung, Reflexionen,
  Helligkeitsunterschieden und leichter Unschärfe.
- Unterschiedliche Positionen und Größen der vollständig sichtbaren Karte.
- Regression gegen gespeicherte Bilder; erwartete Koordinaten und
  Qualitätswerte werden versioniert.

### Negativ- und Grenzfälle

- Nur 0–4 Marken sichtbar: kein automatisches Übernehmen.
- Verdeckte, beschädigte oder doppelte ID: eindeutige Diagnose, kein Raten.
- Fremde Kreuze, Kartonkanten, Klebeband und Reflexionen dürfen nicht als Marke
  gelten.
- Falsche Markerfamilie oder falsche IDs werden abgelehnt.
- Mittelpunkt außerhalb des Eckvierecks, vertauschte Geometrie, extreme
  Perspektive oder numerisch instabile Homographie werden abgelehnt.
- Fehlende/inkompatible Linsenkalibrierung, abweichende Kamera-ID oder
  Bildauflösung blockieren die Analyse verständlich.
- Leeres, defektes oder übergroßes Bild führt zu begrenztem Fehler statt
  Absturz, Endlosschleife oder übermäßigem Speicherverbrauch.

### Geometrie und Genauigkeit

- Automatisch erkannte Punkte durchlaufen dieselbe Transformations- und
  Kontrollfehlerberechnung wie manuell gesetzte Punkte.
- Maschinenkoordinaten bleiben exakt 40/40, 360/40, 360/360, 40/360 und
  200/200 mm; nur Bildkoordinaten werden erkannt.
- Subpixelwerte werden intern nicht vorzeitig gerundet; UI-Rundung verändert
  die gespeicherte Berechnung nicht.
- Mittelpunkt bleibt unabhängiger Kontrollpunkt und wird nicht zum Fitten der
  vier Eckpunkte missbraucht.
- Festgelegte Abnahme: auf Referenzbildern höchstens 1 px mittlerer
  Erkennungsfehler und nach Bettfit weiterhin höchstens 5 mm Kontrollmaximum;
  Zielwert auf guten realen Bildern ist höchstens 1 mm.

### Zustands- und UI-Tests

- Aktivierungsbedingungen und Tooltips für Snapshot/Linsenkalibrierung.
- Busy-Sperre, Erfolg, Teilfund, Fehler, Verwerfen und erneute Analyse.
- Vorschläge verändern weder gespeicherte Kalibrierung noch bestehende Punkte,
  bevor der Nutzer sie übernimmt.
- Ein manuell korrigierter Punkt behält seine Korrektur; erneute automatische
  Erkennung verlangt vor dem Überschreiben eine ausdrückliche Entscheidung.
- Zoom, Scrollen und Fadenkreuzposition bleiben pixelgenau synchron.
- Tastatur-/Screenreader-Namen unterscheiden automatische Vorschläge,
  bestätigte und manuell korrigierte Punkte.

### PDF- und Buildtests

- Marker-IDs, Positionen und physische Abstände des erzeugten PDFs werden aus
  der Generatorquelle geprüft.
- Gerenderte PDF-Seiten werden visuell auf Beschnitt, Montagefehler und
  unlesbare Marker geprüft.
- Produktionsbuild enthält Detector/WASM und PDF vollständig; CSP benötigt
  keine zusätzliche Netzwerk- oder unsichere Skriptfreigabe.
- Bestehende Sprint-12-Tests für Linsenkalibrierung, manuelle Bettpunkte,
  Speicherung und überwachten Laser-X-Test bleiben grün.

## Nutzerabnahme (Gate B, ohne Laser)

1. Neue 400 × 400-mm-Karte bei 100 % drucken, Kontrolllinien messen und Karte
   montieren.
2. Snapshot aufnehmen und automatische Erkennung starten.
3. Alle fünf Vorschläge bei 250–400 % Zoom visuell prüfen.
4. Einen Punkt absichtlich manuell korrigieren und Persistenz der Korrektur
   prüfen.
5. Karte teilweise verdecken und sicherstellen, dass keine automatische
   Übernahme angeboten wird.
6. Gute Karte erneut erkennen, Punkte bestätigen und Kontroll-RMS/-Maximum
   protokollieren.

Der bestehende überwachte Laser-/Kamera-Test bleibt ein separates Gate C und
wird durch die automatische Bilderkennung weder gestartet noch freigegeben.

## Fertig, wenn

- fünf eindeutige Marken auf den vereinbarten realen Kamera-Fixtures zuverlässig
  erkannt und korrekt zugeordnet werden,
- jeder automatische Vorschlag vor dem Speichern sichtbar kontrolliert und
  manuell korrigiert werden kann,
- alle Negativfälle ohne Raten oder automatische Speicherung enden,
- PDF-, Geometrie-, UI-, Persistenz-, CSP- und Produktionsbuildtests grün sind,
- der Nutzer Gate B mit protokollierten Messwerten abgenommen hat und
- sämtliche Sprint-12-Sicherheitsgrenzen unverändert bestehen bleiben.
