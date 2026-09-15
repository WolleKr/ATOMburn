# Funktionsparität — LaserWeb4, MeerK40t und ATOMburn

Der Vergleich bezieht sich auf die für ATOMburn freigegebene X30-Pro-/LaserCam-
Arbeitsfläche. Eine vollständige Kopie der Mehrgeräte-GUIs und Treiber ist nicht
Ziel des Projekts.

| Bereich | LaserWeb4/MeerK40t | ATOMburn | Status |
|---|---|---|---|
| SVG/DXF/G-Code-Import | vorhanden | vorhanden | abgedeckt |
| Canvas-Authoring: Rechteck, Ellipse, Linie, Auswahl, Delete, Copy/Paste | vorhanden | vorhanden | offline abgedeckt |
| Zoombares Arbeitsraster mit X0/Y0 und mm-Maßen | vorhanden | vorhanden | offline abgedeckt |
| Line-/Vector-CAM | vorhanden | vorhanden | abgedeckt |
| Fill mit Preflight und mehreren Durchläufen | vorhanden | vorhanden | abgedeckt |
| Raster-CAM, Dithering, Overscan | vorhanden | vorhanden | abgedeckt |
| GRBL TCP/USB-Sitzung | vorhanden | vorhanden | abgedeckt; Hardware offen |
| Job-Guard, Hold/Abort, Alarm-/Recovery-Grenzen | teilweise unterschiedlich | ATOMburn-spezifisch | sicherheitsseitig eigenständig |
| MJPEG-Kamera, Snapshot und Kalibrierung | vorhanden | vorhanden | offline abgedeckt; Kamera-Gate offen |
| Diagnoseexport und Redaction | vorhanden/teilweise | vorhanden | offline abgedeckt |
| deterministische Projektpersistenz | vorhanden | vorhanden | abgedeckt |
| K40/Ruida/TinyG/Marlin-Ökosystem | vorhanden | nicht Ziel | bewusst offen |
| Rotary, Materialtestgitter, Tracing/Nesting | teilweise vorhanden | nicht vollständig | späterer Scope |
| wxPython-/historische LaserWeb-GUI-Funktionen | vorhanden | nicht übernommen | bewusst nicht portiert |
| echte Windows-Installation und Geräteabnahme | erforderlich | nicht offline prüfbar | Gate B/C offen |

Die Quellen bleiben Referenzen. Es wurden keine LaserWeb4-Dateien verändert oder
AGPL-Code in ATOMburn übernommen. MeerK40t bleibt Testorakel und Referenz.
