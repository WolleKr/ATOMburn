# Monday.com-Board-Snapshot – ATOMburn

Stand: 2026-08-25  
Quelle: Monday.com-Board `ATOMburn – Agentische Entwicklung` (Board-ID `5102678196`)  
Zweck: Vollständige lokale Sicherung vor dem Löschen des Monday.com-Plugins beziehungsweise Boards.

## Zusammenfassung

- 27 Elemente insgesamt
- 9 Elemente mit Status `Blockiert` und Teststatus `Offen`
- 6 Elemente mit Status `In Bearbeitung` und offenen Tests beziehungsweise Nutzerabnahmen
- 12 Sprint-Elemente mit Status `Fertig`, Workflow `Fertig` und Teststatus `Bestanden`
- Keine Subitems und keine Board-Tags vorhanden

## Blockiert / offene Issues

### Vector Element nicht mit Maus bewegbar

- Monday-ID: `3178037980`
- Gruppe: Gefundene issues
- Status: Blockiert
- Workflow: nicht gesetzt
- Sprint: nicht gesetzt
- Arbeitstyp: Entwicklung
- Teststatus: Offen
- Details: Man kann eine Vector Form zwar mit der Maus anklicken, aber nicht bewegen. Kein Anklicken und Bewegen oder Ändern der Größe mit der Maus. Nach dem Anklicken mit der Maus sollten Elemente auch mit den Pfeiltasten bewegbar sein.

### Vector Figur sofort hinzugefügt

- Monday-ID: `3178105114`
- Gruppe: Gefundene issues
- Status: Blockiert
- Workflow: nicht gesetzt
- Sprint: nicht gesetzt
- Arbeitstyp: Entwicklung
- Teststatus: Offen
- Details: Wenn man links im Zeichnungsmenü auf eine Form klickt, wird diese sofort an einer Standardposition hinzugefügt. Sie sollte zunächst am Mauszeiger hängen und anschließend mit der Maus abgelegt werden können. Beispiel: Ein Klick auf Kreis fügt einen Kreis zum Mauszeiger hinzu; ein weiterer Klick platziert ihn.

### Importieren von Medien

- Monday-ID: `3178092020`
- Gruppe: Gefundene issues
- Status: Blockiert
- Workflow: nicht gesetzt
- Sprint: nicht gesetzt
- Arbeitstyp: Entwicklung
- Teststatus: Offen
- Details: SVG- oder LBRN2-Dateien konnten nicht geladen werden, weil im Dateidialog ein Filter gesetzt war und nur ATOMburn-Dateien sichtbar waren.

### buttons in der statusleiste

- Monday-ID: `3179019355`
- Gruppe: Offene Tests & Abnahmen
- Status: Blockiert
- Workflow: nicht gesetzt
- Sprint: nicht gesetzt
- Arbeitstyp: Entwicklung
- Teststatus: Offen
- Details: Die Buttons `rotate90°`, `Mirror X`, `Mirror Y` und `duplicate` sollen entfernt werden. Diese Aktionen sollen vollständig mit der Maus möglich sein.

### Zoom per mausrad nicht möglich

- Monday-ID: `3178925753`
- Gruppe: Offene Tests & Abnahmen
- Status: Blockiert
- Workflow: nicht gesetzt
- Sprint: nicht gesetzt
- Arbeitstyp: Entwicklung
- Teststatus: Offen
- Details: Zoomen per Mausrad ergänzen und stufenloses Zoomen bis 1000 % ermöglichen. Zoom unter 100 % funktioniert aktuell nicht und wird nach Einschätzung des Nutzers nicht benötigt.

### beschriftung im raster

- Monday-ID: `3178973824`
- Gruppe: Offene Tests & Abnahmen
- Status: Blockiert
- Workflow: nicht gesetzt
- Sprint: nicht gesetzt
- Arbeitstyp: Nutzerabnahme
- Teststatus: Offen
- Details: Oben links im Raster stehen zwei Texte übereinander. Das ist verwirrend und unschön; die überlappende Beschriftung soll entfernt werden.

### viele Zeichenelemente nicht verfügbar

- Monday-ID: `3178873984`
- Gruppe: Offene Tests & Abnahmen
- Status: Blockiert
- Workflow: nicht gesetzt
- Sprint: nicht gesetzt
- Arbeitstyp: Nutzerabnahme
- Teststatus: Offen
- Details: Viele Zeichenelemente beziehungsweise Funktionen sind nicht verfügbar, darunter Polygon, Array, Edit Nodes, Text und Schneiden. Außerdem fehlen weitere Funktionen aus LaserWeb4. Diese Funktionen sollen ergänzt und nötigenfalls aus LaserWeb2 beziehungsweise dem anderen untersuchten Tool übernommen werden.

### raster Beschriftung fehlt

- Monday-ID: `3178901323`
- Gruppe: Offene Tests & Abnahmen
- Status: Blockiert
- Workflow: nicht gesetzt
- Sprint: nicht gesetzt
- Arbeitstyp: Nutzerabnahme
- Teststatus: Offen
- Details: Das Raster hat keine Beschriftung; dadurch ist X0/Y0 nicht erkennbar. Die Achsen-/Ursprungsbeschriftung soll ansprechend und gut sichtbar ergänzt werden.

### Home nicht sichbar

- Monday-ID: `3179028542`
- Gruppe: Offene Tests & Abnahmen
- Status: Blockiert
- Workflow: nicht gesetzt
- Sprint: nicht gesetzt
- Arbeitstyp: Entwicklung
- Teststatus: Offen
- Details: Laser Home soll sichtbar im Raster markiert sein, damit erkennbar ist, wo der Laser beginnt beziehungsweise nach einem Homing am Ende eines Laservorgangs endet.

## Offene Tests und Nutzerabnahmen

### Test S12 – Kameraausrichtung und Kalibrierung

- Monday-ID: `3177930192`
- Gruppe: Offene Tests & Abnahmen
- Status: In Bearbeitung
- Workflow: Tests offen
- Sprint: Sprint 12
- Arbeitstyp: Physical Test
- Teststatus: Offen
- Details: Kamera montieren und ausrichten; Framing/Kalibrierung am vorgesehenen Gerät ausführen; Messwerte und Toleranzen dokumentieren. Nachweis: Datum, Build/Commit, Gerät/Profil, exakte Schritte, Messwerte, Ergebnis und Screenshots. Gate C erst nach ausdrücklicher persönlicher Freigabe; keine Laseremission durch den Agenten.

### Test S13 – Hardware-Langzeittest und Recovery

- Monday-ID: `3177929948`
- Gruppe: Offene Tests & Abnahmen
- Status: In Bearbeitung
- Workflow: Tests offen
- Sprint: Sprint 13
- Arbeitstyp: Physical Test
- Teststatus: Offen
- Details: Schlafen/Aufwachen, Netzwerkverlust und USB-Verlust simulieren; Recovery mit einem Referenzjob prüfen. Nachweis: Start/Ende, Build/Commit, Gerät, Beobachtungen, Fehlermeldungen, Neustarts und Ergebnis. Keine reale Laseremission durch den Agenten.

### Abnahme S14 – Persönliches Release 1.0

- Monday-ID: `3177930052`
- Gruppe: Offene Tests & Abnahmen
- Status: In Bearbeitung
- Workflow: Nutzerabnahme
- Sprint: Sprint 14
- Arbeitstyp: Nutzerabnahme
- Teststatus: Offen
- Details: Installation, Startbild, Referenzjobs, Kamera, USB/WLAN sowie Hold/Abort prüfen. Nachweis: Build/Commit, Gerät/Profil, Ergebnis je Prüfschritt, Screenshots und Risiken. Abschluss mit persönlicher Ship-/No-Ship-Entscheidung; reale Emission nur nach eigener ausdrücklicher Freigabe.

### Sprint 12 – Kameraausrichtung und Kalibrierung

- Monday-ID: `3177930050`
- Gruppe: Sprints 12–14 · Tests offen
- Status: In Bearbeitung
- Workflow: Tests offen
- Sprint: Sprint 12
- Arbeitstyp: Entwicklung
- Teststatus: Offen
- Details: Entwicklungsumfang abgeschlossen. Offen: Kamera-/Framing-/Kalibrierungstests an der vorgesehenen Hardware sowie Messnachweise.

### Sprint 13 – Ausfälle, Performance und Langzeittest

- Monday-ID: `3177930051`
- Gruppe: Sprints 12–14 · Tests offen
- Status: In Bearbeitung
- Workflow: Tests offen
- Sprint: Sprint 13
- Arbeitstyp: Entwicklung
- Teststatus: Offen
- Details: Entwicklungsumfang abgeschlossen. Offen: Fehlerverhalten, Performance, Hardware-Langzeittest und Recovery-Nachweise.

### Sprint 14 – Persönliches Release 1.0

- Monday-ID: `3177944054`
- Gruppe: Sprints 12–14 · Tests offen
- Status: In Bearbeitung
- Workflow: Tests offen
- Sprint: Sprint 14
- Arbeitstyp: Entwicklung
- Teststatus: Offen
- Details: Release-Vorbereitung, Installation und Referenzjobs. Offen: persönliche Abnahme und noch offene Gates/Tests.

## Fertig und bestanden

### Sprint 00 – Regeln, Quellen und Testfundament

- Monday-ID: `3177930120`
- Gruppe: Sprints 00–11 · Fertig
- Status: Fertig
- Workflow: Fertig
- Sprint: Sprint 00
- Arbeitstyp: Entwicklung
- Teststatus: Bestanden
- Details: Reproduzierbare Basis: Projektregeln, Quellen, Testfundament und lokale Gates. Hardware bleibt außen vor.

### Sprint 01 – Desktop-Skelett und ATOM-Startbild

- Monday-ID: `3177929756`
- Gruppe: Sprints 00–11 · Fertig
- Status: Fertig
- Workflow: Fertig
- Sprint: Sprint 01
- Arbeitstyp: Entwicklung
- Teststatus: Bestanden
- Details: Startfähige Desktop-App mit ATOM-Startbild und belastbarem Anwendungsskelett; visuelle Nutzerabnahme separat.

### Sprint 02 – Domänenmodell und Projektformat

- Monday-ID: `3177943927`
- Gruppe: Sprints 00–11 · Fertig
- Status: Fertig
- Workflow: Fertig
- Sprint: Sprint 02
- Arbeitstyp: Entwicklung
- Teststatus: Bestanden
- Details: Domänenmodell und Projektformat einschließlich lokalem Speichern, Laden und Wiederherstellung.

### Sprint 03 – GRBL-Kern und Simulator

- Monday-ID: `3177899873`
- Gruppe: Sprints 00–11 · Fertig
- Status: Fertig
- Workflow: Fertig
- Sprint: Sprint 03
- Arbeitstyp: Entwicklung
- Teststatus: Bestanden
- Details: Parser, Zustandsmaschine, Streamer und Fehlerprofile im Simulator; reproduzierbare Kernlogik.

### Sprint 04 – LaserCam-TCP und MJPEG

- Monday-ID: `3177929817`
- Gruppe: Sprints 00–11 · Fertig
- Status: Fertig
- Workflow: Fertig
- Sprint: Sprint 04
- Arbeitstyp: Entwicklung
- Teststatus: Bestanden
- Details: TCP-Kommunikation und MJPEG-Diagnostik; reale Hardwareprüfung nur als separates Gate, ohne Emission.

### Sprint 05 – Direkter USB-Diagnoseweg

- Monday-ID: `3177929980`
- Gruppe: Sprints 00–11 · Fertig
- Status: Fertig
- Workflow: Fertig
- Sprint: Sprint 05
- Arbeitstyp: Entwicklung
- Teststatus: Bestanden
- Details: Direkter USB-Diagnosepfad; lokale Prüfung und USB-Diagnostik ohne Laseremission.

### Sprint 06 – Sichere Maschinensteuerung ohne Emission

- Monday-ID: `3177899872`
- Gruppe: Sprints 00–11 · Fertig
- Status: Fertig
- Workflow: Fertig
- Sprint: Sprint 06
- Arbeitstyp: Entwicklung
- Teststatus: Bestanden
- Details: Homing, Jog, Hold und Abort; physische kontrollierte Prüfung ohne Emission.

### Sprint 07 – Dokumenteditor und Import

- Monday-ID: `3177930058`
- Gruppe: Sprints 00–11 · Fertig
- Status: Fertig
- Workflow: Fertig
- Sprint: Sprint 07
- Arbeitstyp: Entwicklung
- Teststatus: Bestanden
- Details: Dokumenteditor, Import und definierte Fehlerpfade; lokale und Nutzerprüfung.

### Sprint 08 – Line-CAM, G-Code und Vorschau

- Monday-ID: `3177899753`
- Gruppe: Sprints 00–11 · Fertig
- Status: Fertig
- Workflow: Fertig
- Sprint: Sprint 08
- Arbeitstyp: Entwicklung
- Teststatus: Bestanden
- Details: Dry Run, Bounds, Golden Files und Preflight einschließlich Vorschau.

### Sprint 09 – Erster beaufsichtigter Markiertest

- Monday-ID: `3177930191`
- Gruppe: Sprints 00–11 · Fertig
- Status: Fertig
- Workflow: Fertig
- Sprint: Sprint 09
- Arbeitstyp: Entwicklung
- Teststatus: Bestanden
- Details: Vollständiges Gate A; Gate C nur nach ausdrücklicher Nutzerfreigabe für einen benannten Referenzjob.

### Sprint 10 – Vektor-Fill und Mehrfachdurchgänge

- Monday-ID: `3177929981`
- Gruppe: Sprints 00–11 · Fertig
- Status: Fertig
- Workflow: Fertig
- Sprint: Sprint 10
- Arbeitstyp: Entwicklung
- Teststatus: Bestanden
- Details: Vektor-Fill und Mehrfachdurchgänge; physische Prüfung nur über ausdrücklich freigegebenes Gate C.

### Sprint 11 – Rasterbilder und Dithering

- Monday-ID: `3177930119`
- Gruppe: Sprints 00–11 · Fertig
- Status: Fertig
- Workflow: Fertig
- Sprint: Sprint 11
- Arbeitstyp: Entwicklung
- Teststatus: Bestanden
- Details: Rasterbilder und Dithering; physische Prüfung nur über ausdrücklich freigegebenes Gate C.

## Board-Struktur und mögliche Tag-Werte

- Workflow: Ideen, Geplant, In Entwicklung, Review, Tests offen, Nutzerabnahme, Fertig
- Sprint: Sprint 00 bis Sprint 14
- Arbeitstyp: Entwicklung, Manual Test, Physical Test, Nutzerabnahme
- Teststatus: Nicht relevant, Offen, Bestanden, Fehlgeschlagen, Blockiert
- Status: In Bearbeitung, Fertig, Blockiert

Die Board-weite Tag-Liste war leer. Die oben aufgeführten Einordnungen stammen aus Status-, Dropdown- und Gruppenspalten.
