# Sprint 12 Bericht — Kameraausrichtung und Kalibrierung

## Implementierter Offline-Umfang

- Arbeitsbereich und Projektprofil auf die real verifizierten Controllerwerte `$130=400`/`$131=400` vereinheitlicht; 410 × 400-mm-Altdaten werden sicher migriert.
- Druckbares A4-Ziel mit asymmetrischem 4 × 11-Kreisraster, 100-mm-Kontrolllinie und vier Seitenmarken erzeugt.
- Mehrbild-Linsenkalibrierung ab acht unterschiedlichen Aufnahmen mit WASM-Solver, Reprojektionsgrenze und getrennter persistenter Linsenkalibrierung ergänzt.
- Pure Kalibrierungsdomäne mit fünf Bettpunkten, Projektivtransformation nach Linsenentzerrung, Finite-Value-Prüfung und reprojizierbarer Fehlerbasis.
- Deterministische Transformationsmetadaten für Rotation, Spiegelung, Skalierung und Offset.
- Versionierte, validierte und stabile JSON-Repräsentation sowie Zustände für fehlend, ungültig, veraltet und inkompatibel.
- Der Dialog führt jetzt zuerst durch die Linsenkalibrierung und danach durch eine direkte Kamera-zu-Laser-Ausrichtung. Eine präzise Positionierung der gedruckten 400 × 400-mm-Karte am Maschinenursprung ist nicht mehr Voraussetzung.
- `H-CAM-MARK-01` markiert nach emissionsfreiem Framing fünf 4-mm-X bei 40/40, 360/40, 360/360, 40/360 und 200/200 mm. Geschwindigkeit (100–3000 mm/min) und Leistung (1–30 %) sind vor dem Hash/Preflight wählbar; Profilprüfung, Einmalstart, M5/S0 und abschließendes Homing bleiben erhalten.
- Nach erfolgreichem Markieren wird nur die alte Bettausrichtung invalidiert. Ein frischer Snapshot ordnet die vier Eckmarken der Projektivtransformation zu; die Mittelmarke bleibt unabhängiger Kontrollpunkt.
- Der frühere Bestätigungsstring und acht einzelne Kontrollkästchen wurden im bestandenen Kalibrierungstest durch eine kompakte aktuelle Beaufsichtigungsbestätigung plus separate Framing-Bestätigung ersetzt.

## Automatisierte Tests

Fokustests für Zielerkennung, Linsenmodell, Speicherung, Bettkalibrierung, parametriertes Fünf-X-Programm, Controller, Logging und Gate-C-Dialog bestanden. Der jeweils aktuelle vollständige Gate-A-Lauf ist vor dem Hardwaretest erneut auszuführen.

## Hardwareabnahme abgeschlossen

Reale Teilabnahme am 26.08.2026: Linsenkalibrierung, manueller Fünfpunkt-Fit (0,403 mm Kontrollfehler), 3000-mm/min-Framing und der überwachte Vier-X-Vorläufertest liefen erfolgreich. Die Fotos zeigten einen systematischen Versatz, weil die gedruckte Karte nicht nachweislich exakt auf Maschinen-X0/Y0 lag; das Verfahren wurde deshalb auf Laser-zuerst umgestellt.

Der Nutzer bestätigte am 31.08.2026, dass anschließend auch der vollständige
**Fünf-X-Laser-zuerst-Ablauf** erfolgreich abgeschlossen wurde: fünf Marken an
den festgelegten Maschinenkoordinaten, frischer Snapshot, vier Eckpunkte plus
Mittelpunkt, gespeicherte Bettkalibrierung und unabhängiger Deckungstest.

Die gespeicherten lokalen Kalibrierungsdaten belegen eine am 27.08.2026
erzeugte, zur Linsenkalibrierung passende Fünfpunkt-Ausrichtung für die Kamera
`192.168.178.71`. Enthalten sind exakt die Maschinenpunkte 40/40, 360/40,
360/360, 40/360 und 200/200 mm sowie acht Linsenansichten mit 0,332 px RMS.
Der unabhängige physische Deckungstest ist eine Nutzerbeobachtung und erscheint
nicht als eigener Eintrag im bisherigen App-Log. Sprint 12 ist damit
abgenommen; die Eingangsvoraussetzung für Sprint 16 ist erfüllt.
