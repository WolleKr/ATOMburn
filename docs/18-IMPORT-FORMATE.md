# Importformate und Referenzdateien

## Rolle des `.atomburn`-Formats

`.atomburn` ist das native Projektformat, kein Grafikformat. Importierte
Grafiken werden in ein neutrales internes Modell in Millimetern überführt und
zusammen mit Ebenen, Operationen und Projekteinstellungen gespeichert.

## Status nach Sprint 7

| Format | Ziel | Referenz |
|---|---|---|
| SVG/SVGZ | **implementiert:** Pfade, Linien, Polygone, Rechtecke, Ellipsen, Gruppen, Transformationen, Maßeinheiten und Sanitizing; Bögen werden noch vereinfacht | MeerK40t und LaserWeb4 |
| DXF | **implementiert:** LINE, POLYLINE/LWPOLYLINE, CIRCLE, ARC, ELLIPSE, SPLINE, Ebenen, Blöcke/INSERT und `$INSUNITS` | MeerK40t und LaserWeb4 |
| LBRN/LBRN2 | **implementiert:** Pfad, Rechteck, Ellipse, Gruppe, Ebenen, Transformationen und Text-BackupPath; unbekannte Shapes werden gemeldet | MeerK40t-LBRN-Loader |
| PNG/JPEG/BMP | **implementiert:** eingebettetes Rasterobjekt mit DPI-Auswertung beziehungsweise dokumentierter 96-DPI-Annahme | beide Referenzprojekte |
| PDF-Vektor | lokale Extraktion ohne aktive Inhalte | spätere Bibliotheksprüfung |
| HPGL/PLT | Plotterpfade in neutrale Geometrie | spätere Bibliotheksprüfung |
| AI/EPS | lokale, kontrollierte Normalisierung nach SVG/PDF | optionaler Kompatibilitätsweg |
| GCODE/GC/NC | vorhandener Job, nicht editierbare Vektorgrafik | LaserWeb4 |

„Unterstützt“ bedeutet nicht nur, dass eine Datei geöffnet wird. Maßstab,
Transformationen, Kurven, Ebenen, Textbehandlung und nicht unterstützte
Elemente müssen deterministisch geprüft und verständlich gemeldet werden.

## Persönliche Fixtures

Unter `tests/data_to_load/` liegen derzeit eine SVG- und vier LBRN2-Dateien.
Sie bleiben unverändert, unversioniert und wurden in Sprint 7 lokal vollständig
importiert, als `.atomburn` serialisiert und wieder geöffnet. Für
DXF, PDF-Vektor, HPGL/PLT und AI/EPS werden später kleine, bewusst lizenzfreie
Fixtures mit bekannten Abmessungen benötigt.

Der Import erzeugt ausschließlich neutrale Dokumentgeometrie in Millimetern.
Er erzeugt keinen G-Code und startet keinen Laserjob. Nicht unterstützte oder
beschädigte Elemente erscheinen als sichtbare Diagnose statt stillschweigend
einen möglicherweise falschen Job zu erzeugen.
