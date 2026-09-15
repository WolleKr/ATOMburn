# Sprint 11 Bericht — Raster CAM

## Implementierter Umfang

- `prepareRaster` liefert deterministische, bidirektionale Rasterzeilen.
- `buildRasterCam` und das optionale `rasterSources`-Argument von `buildLineCam` planen Rasterbilder aus expliziten `GrayImage`-Quellen.
- Objekt-Transformationen, Rastermodus, Intervall, DPI, Leistungs-Skalierung und sichere Maschinen-Grenzen werden angewendet.
- G-Code unterstützt variable Rasterleistung pro Punkt. Bestehende Vektor-Ausgabe sowie sichere Header/Footer bleiben unverändert.
- Fehlende Bildquellen blockieren CAM ausdrücklich. Decoder und Quellenbeschaffung bleiben außerhalb des Renderers.
- Projekt-Saves starten Recovery-, Temp- und Backup-Vorbereitung parallel und committen erst nach allen dauerhaften Writes.

## Automatisierte Ergebnisse

- Fokustests für Sprint 2, Sprint 8 und Sprint 11: bestanden.
- `pnpm typecheck`: bestanden.

## Einschränkungen

Die Quellen sind bereits dekodierte `GrayImage`-Daten; ein Bilddecoder ist nicht Teil dieser Änderung. Es gab keine Hardware-Abnahme und keinen Gate-B- oder Gate-C-Abschluss. Laser-, Hardware- und E2E-Gates wurden nicht ausgeführt.
