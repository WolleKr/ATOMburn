# Sprint 15 — Interaktiver Dokumenteditor

## Ziel

Sprint 15 schließt die Lücke zwischen den bereits vorhandenen Editorbefehlen
und einer direkten, mauszentrierten Zeichenoberfläche. Die neun aus Monday.com
übernommenen Punkte werden nicht pauschal als Fehler behandelt: Einige sind
echte Defekte, einige nur teilweise umgesetzt und andere neue Funktionen.

Quelle: [lokaler Monday.com-Snapshot](../MONDAY-BOARD-SNAPSHOT-2026-08-25.md).

Sprint 15 wurde am 1. September 2026 gestartet und am selben Tag nach grünem
automatischem Gate abgeschlossen. Umsetzung, Teststand und Hardwaregrenze
stehen im [Sprint-15-Bericht](SPRINT-15-BERICHT.md).

Zusätzliche Quelle: Oberflächenprüfung im verpackten Windows-x64-Build
`0.14.0` am 31. August 2026.

## Analyse der sechzehn Meldungen

| Nr. | Element | Einordnung im aktuellen Stand | Bereits geplant oder vorhanden | Sprint-15-Entscheidung |
|---:|---|---|---|---|
| 1 | Vector Element nicht mit Maus bewegbar | **Echter, reproduzierbarer Funktionsmangel.** Auswahl und Transformationsbefehle existieren, aber Canvas-Drag, Größenanfasser und Pfeiltasten fehlen. | Verschieben und Skalieren waren bereits für Sprint 7 zugesagt; derzeit nur über Schaltflächen bzw. Reducer vorhanden. | P0: direkte Manipulation vollständig nachholen. |
| 2 | Vector Figur sofort hinzugefügt | **Fehlerhafte Bedienlogik.** Das Werkzeug erzeugt die Form gegenwärtig sofort an Standardkoordinaten. | Das Domänenmodell akzeptiert bereits Koordinaten; die Canvas-Interaktion fehlt. | P0: Werkzeug erst aktivieren, Vorschau am Mauszeiger zeigen und per Ziehen/Klick platzieren. |
| 3 | Importieren von Medien | **Historischer Defekt, im aktuellen Code bereits behoben.** Der Importdialog listet SVG/SVGZ, DXF, LBRN/LBRN2, PNG, JPG/JPEG und BMP; die Importer sind vorhanden. | Seit Sprint 7 geplant und im aktuellen Arbeitsstand implementiert. | Kein Neubau; P0-Regressionsprüfung mit echtem Windows-Dateidialog und je einer Datei pro Pflichtformat. |
| 4 | buttons in der statusleiste | **UX-Änderungswunsch, kein Funktionsfehler.** Die Schaltflächen sind derzeit der einzige sichtbare Zugang zu mehreren Transformationen. | Transformationen und Tastenkürzel sind teilweise vorhanden. | P1: erst Mausgriffe und Tastaturzugänge fertigstellen, danach Rotate/Mirror/Duplicate sowie X/Y-/Scale-Schaltflächen aus der Canvas-Leiste entfernen. Funktionen bleiben über Maus, Tastatur und ein kompaktes Kontextmenü erreichbar. |
| 5 | Zoom per mausrad nicht möglich | **Teilweise umgesetzt, Anforderung verfehlt.** Auswahlzoom existiert nur von 50 bis 200 Prozent; Mausradsteuerung fehlt. | Zoom wurde begonnen, aber nicht in der geforderten Form. | P0: Mausradzoom von 100 bis 1000 Prozent, auf den Mauszeiger zentriert; 100 Prozent als Untergrenze. |
| 6 | beschriftung im raster | **Wahrscheinlicher Darstellungsdefekt.** Ursprung und Achsentexte existieren im aktuellen Code, können oben links aber miteinander bzw. mit Maßtexten kollidieren. | Der UI-Backlog aus Sprint 11 nennt ausdrücklich überlagerungsfreie Beschriftungen. | P0: eine einzige Ursprungskomponente und kollisionsfreie Achsen-/Maßtexte; visuelle Regressionstests. |
| 7 | viele Zeichenelemente nicht verfügbar | **Feature-Epic, kein einzelner Fehler.** Polygon, Text, Edit Nodes und Array sind sichtbar, aber bewusst deaktiviert; „Schneiden“ und „weitere“ sind noch nicht präzise spezifiziert. | Grundlegendes Zeichnen war für Sprint 7 geplant; diese erweiterten Autorenwerkzeuge nicht vollständig. | P2: in klar begrenzte Funktionen aufteilen: Polygon, Text, Knotenbearbeitung, rechteckiges/polares Array und Pfad teilen. „Weitere LaserWeb4-Funktionen“ werden nur über eine Capability-Matrix erfasst und nicht ungeprüft kopiert. |
| 8 | raster Beschriftung fehlt | **Teilweise umgesetzt, Abnahme fehlt.** X0/Y0, +X/+Y und einzelne Millimeterwerte werden bereits gerendert; Lesbarkeit, Skalierung und Vollständigkeit sind nicht abgesichert. | Seit Sprint 11 ausdrücklich geplant. | P0 gemeinsam mit Punkt 6: dynamische Teilstriche und Beschriftungen, die bei 100–1000 Prozent lesbar bleiben. |
| 9 | Home nicht sichtbar | **Begriffs- und Darstellungsfehler.** Der aktuelle Marker heißt intern „Machine origin“, zeigt im Text aber „Project origin“. Das kann Maschinen-Home, Werkstücknullpunkt und Projektursprung verwechseln. | Seit Sprint 11 geplant, einschließlich der Forderung, einen Arbeitsversatz nicht als Home auszugeben. | P0: Projektursprung und Maschinen-Home getrennt darstellen. Home nur anzeigen, wenn Homingzustand und Maschinenkoordinaten bekannt sind; sonst klar „Home unbekannt“. |
| 10 | Kamera-Livebild nicht dauerhaft sichtbar | **Fehlende LightBurn-ähnliche Arbeitsansicht.** Das Kamerabild ist derzeit nur im separaten Motion-Dialog beziehungsweise in spezialisierten Kamera-Dialogen sichtbar. | Kamera-Snapshot und überwachte Liveansicht sind vorhanden; eine dauerhaft sichtbare Ansicht im Arbeitsbereich fehlt. | P1: Kamera als dauerhaftes, verschiebbares/ausblendbares Panel oben rechts oder als eigener Kamera-Tab integrieren. |
| 11 | 400 × 400-mm-Arbeitsfläche wird beim Vergrößern des Fensters verzogen | **Bestätigter Darstellungsdefekt.** Der Container erhält unterschiedliche Breite und Höhe; das Dokument-SVG erzwingt zusätzlich `preserveAspectRatio="none"`. Dadurch bleiben die Zahlen 400 × 400 korrekt, aber X und Y werden mit unterschiedlichen Maßstäben dargestellt. | Die Dokumentabmessungen und der SVG-`viewBox` sind korrekt. Es fehlt eine gemeinsame, seitenverhältnistreue Bildschirmtransformation. | P0: quadratische Profile immer quadratisch und andere Profile in ihrem realen Seitenverhältnis darstellen. Die Fläche wird mit dem verfügbaren kleineren Maß zentriert, Zoom und Scrollen dürfen das Verhältnis nicht ändern. |
| 12 | Test- und Maschinenfunktionen überladen die obere Leiste | **Bestätigtes Informationsarchitekturproblem.** `Calibration mark` und `Raster reference test` sind Abnahmewerkzeuge. Simulator ist ein Diagnosewerkzeug. CAM, Device, Motion und Kamerakalibrierung sind dagegen weiterhin Produktivfunktionen. | Sämtliche Funktionen sind direkt und gleichrangig in der Hauptnavigation sichtbar. | P0/P1: Abnahmewerkzeuge nach Abschluss von Sprint 14 aus der normalen Produktionsoberfläche entfernen und nur in einem expliziten Diagnose-/Entwicklermodus verfügbar machen. Simulator nach `Diagnose`; Device und Motion unter `Maschine`; Kamerakalibrierung unter `Kamera/Einstellungen`. CAM als verständliche Produktionsfunktion `Vorschau und Export` erhalten und aus Testdialogen entkoppeln. |
| 13 | Importdialog merkt sich den letzten Ordner nicht zuverlässig | **Fehlende Komfortfunktion.** Der Dialog wird ohne `defaultPath` geöffnet; ein mögliches Erinnern durch Windows ist nicht Teil des Anwendungsvertrags. | Projekt- und Importdialoge besitzen Filter, aber keine persistente Ordnerpräferenz. | P1: zuletzt erfolgreich verwendete Ordner getrennt für Projekt öffnen/speichern, Import und Export in einer lokalen Benutzereinstellung speichern. Nicht mehr vorhandene oder ungültige Pfade fallen auf einen sinnvollen Standardordner zurück. Abbruch verändert die Präferenz nicht. |
| 14 | About zeigt `win32` im x64-Build | **Irreführende Beschriftung, kein falscher Build.** `process.platform` liefert unter 32- und 64-Bit-Windows den Node-Plattformnamen `win32`; die Architektur steht in `process.arch` und ist hier `x64`. | Der Dialog nennt nur Version und den rohen technischen Plattformwert. | P1: den rohen Wert entfernen. About zeigt `Windows · x64`, `WolleKr` als Projektinhaber sowie den klick- und kopierbaren Link `https://github.com/WolleKr/ATOMburn`. Technische Details bleiben zusätzlich im Diagnosepaket. |
| 15 | Fehler sollen direkt als GitHub-Issue vorbereitet werden können | **Neue Diagnose-/Supportfunktion.** Unerwartete Rendererfehler landen nur in einer fatalen Ansicht; viele Aktionsfehler erscheinen lediglich in der Statuszeile oder lokal in einem Panel. | Lokale Logs und Diagnoseexport existieren, aber kein zentraler, überprüfbarer Übergang zu GitHub. | P1: zentrale Fehlerdarstellung für unerwartete und fehlgeschlagene Anwendungsaktionen mit `GitHub-Issue vorbereiten`, `Details kopieren` und `Schließen`. Es wird kein Token gespeichert und nichts automatisch veröffentlicht: Die App öffnet eine vorausgefüllte `issues/new`-URL im Standardbrowser, wo der Nutzer Inhalt und Anmeldung kontrolliert. Erwartete Eingabehinweise bleiben inline und erzeugen keine Dialogflut. |
| 16 | Aktiver Rasterjob zeigt gleichzeitig Controller `Idle` und Job `running` | **Durch das reale `H-RASTER-BW-01`-Log bestätigter Zustandsfehler.** Während 0–164/182 bestätigten Zeilen blieb der letzte Controllerstatus `Idle`. Im Rasterdialog sind dadurch die Softwareaktionen `Hold` und `Stop job` fälschlich deaktiviert, obwohl der Job läuft. Der Job selbst endete korrekt mit 182/182 und wurde visuell bestanden. | Der Streamer fragt den abschließenden Controllerstatus erst nach `M5` ab; der lokale Jobzustand wird unabhängig korrekt fortgeschrieben. Die UI bindet ihre Aktionsfreigabe jedoch nur an den veralteten GRBL-Zustand. | P0 vor jedem weiteren Emissionstest: Live-Job- und Controllerzustand konsistent modellieren. Bei lokal aktivem Job müssen Hold und Abort erreichbar bleiben; der Main-Prozess validiert die aktive Jobsitzung und bestätigt den resultierenden GRBL-Zustand. Kein erfundener `Run`-Status. Automatische Simulator-/Zustandstests genügen; der bestandene Rasterjob wird nicht wiederholt. |

## Umsetzungsreihenfolge

### Arbeitspaket 1 — Koordinaten- und Interaktionsgrundlage (P0)

- Eine zentrale Umrechnung zwischen Bildschirmkoordinaten, Zoom/Scroll und
  Dokumentmillimetern einführen.
- Pointer-Capture für Ziehen und Zeichnen verwenden; ein Abbruch per `Escape`
  darf keine halbe Änderung in der Historie hinterlassen.
- Während eines Drags nur eine Vorschau führen und beim Loslassen genau einen
  Undo-Schritt erzeugen.
- Gesperrte oder unsichtbare Ebenen bleiben unveränderbar.
- Pfeiltasten verschieben die Auswahl um 1 mm, `Shift` + Pfeil um 10 mm und
  `Alt` + Pfeil um 0,1 mm. Eingabefelder dürfen diese Kürzel nicht abfangen.

### Arbeitspaket 2 — Auswahl, Bewegen und Skalieren (P0)

- Auswahlrahmen mit acht Größenanfassern und einem Drehgriff anzeigen.
- Ziehen innerhalb der Auswahl verschiebt ein oder mehrere Objekte gemeinsam.
- Eckgriffe skalieren proportional; `Shift` hebt die Proportionsbindung auf.
- Seitenmittelpunkte skalieren nur auf einer Achse.
- Drehung und Spiegelung werden per Griff beziehungsweise Kontextmenü
  angeboten; numerische Werte bleiben im Inspector möglich.
- Mehrfachauswahl verwendet gemeinsame Bounds und bewahrt relative Abstände.

### Arbeitspaket 3 — Platzierungswerkzeuge (P0/P2)

- Rechteck und Ellipse werden per Ziehen von Start- bis Endpunkt erzeugt.
- Linie wird per Start- und Endklick beziehungsweise Ziehen erzeugt.
- Polygon sammelt Punkte bis Doppelklick/Enter und wird mit `Escape`
  verworfen.
- Werkzeugwechsel allein verändert das Projekt nicht.
- Neu erzeugte Geometrie wird ausgewählt und erzeugt genau einen Undo-Schritt.

### Arbeitspaket 4 — Zoom, Raster, Ursprung und Home (P0)

- Mausradzoom in kleinen stufenlosen Schritten, begrenzt auf 100–1000 Prozent;
  der Dokumentpunkt unter dem Mauszeiger bleibt stabil.
- Scrollen/Pan bleibt bei vergrößerter Arbeitsfläche möglich; Zoom ändert keine
  Millimetergeometrie.
- Rasterteilung abhängig vom Zoom wählen, ohne überlappende Texte.
- Eine eindeutige Legende für `Projekt X0/Y0` und `Maschinen-Home` verwenden.
- Maschinen-Home aus dem Maschinenstatus ableiten und nie aus dem Projektprofil
  erfinden. Ohne erfolgreiches Homing wird nur der unbekannte Zustand gezeigt.

### Arbeitspaket 5 — Import-Regressionsschutz (P0)

- Dateidialogfilter für alle Pflichtformate automatisiert prüfen.
- SVG, LBRN2 und ein Rasterbild zusätzlich in einem verpackten Windows-Build
  manuell importieren.
- Nicht unterstützte Inhalte bleiben sichtbar diagnostiziert; ein Import darf
  bestehende Projektobjekte nicht löschen.

### Arbeitspaket 6 — Erweiterte Autorenwerkzeuge (P2)

- Text als eigenes editierbares Objekt mit Schrift, Größe und Ausrichtung
  modellieren; vor CAM/Export wird eine reproduzierbare Pfadkonvertierung
  verlangt.
- Edit Nodes zunächst auf Pfade begrenzen: Knoten auswählen, verschieben,
  hinzufügen und löschen; Kurvenhandles folgen erst, wenn das Projektmodell sie
  verlustfrei speichern kann.
- Array als nicht-destruktive Vorschau mit anschließendem deterministischem
  Duplizieren umsetzen: rechteckig und polar, mit Anzahl und Abstand/Winkel.
- „Schneiden“ für Sprint 15 als **Pfad an einem gewählten Punkt teilen**
  definieren. Boolesche Flächenoperationen und Trimmen mehrerer sich
  überschneidender Konturen sind nicht Teil dieses Sprints.
- Für LaserWeb4 wird nur eine Verhaltens-/Capability-Matrix erstellt. Code wird
  nur nach Lizenz- und Herkunftsprüfung übernommen.

### Arbeitspaket 7 — Oberfläche bereinigen (P1)

- Transformationsschaltflächen erst entfernen, nachdem die entsprechende
  Maus-/Tastaturfunktion automatisiert getestet ist.
- In der unteren Leiste bleiben Zoom, Auswahlstatus und grundlegende
  Zwischenablageaktionen; Duplicate ist über `Ctrl+D`, Löschen über `Delete`
  und Kopieren/Einfügen über die üblichen Kürzel verfügbar.
- Kontextmenü und Tooltips zeigen die verbleibenden Zugänge, damit keine
  Funktion durch die Bereinigung unsichtbar wird.

### Arbeitspaket 8 — Kamera-Arbeitsansicht (P1)

- Eine dauerhaft erreichbare Kameraansicht im Hauptarbeitsbereich ergänzen:
  standardmäßig als Panel oben rechts, alternativ als eigener Tab innerhalb
  der rechten Arbeitsbereichs-/Inspector-Region.
- Die Ansicht zeigt den aktuellen LaserCam-Status, Bildalter und einen klaren
  Offline-/Fehlerzustand; ein veraltetes Bild darf nicht als live erscheinen.
- Kamera öffnen, schließen, pausieren und erneut laden dürfen keinen GRBL-
  oder Maschinenzustand verändern.
- Die Ansicht darf den Canvas nicht unbedienbar machen und muss bei 100 %,
  150 % und 200 % UI-Skalierung sowie bei kleinen Fenstergrößen lesbar bleiben.
- Bestehende Motion-, Kamera-Kalibrierungs- und überwachte Dialoge verwenden
  dieselbe Kamera-Darstellung beziehungsweise denselben Statusvertrag; keine
  parallelen Polling-Schleifen für dieselbe Ansicht einführen.
- Die Kamera bleibt reine Überwachung und ersetzt weder Aufsicht noch den
  physischen Not-Aus.

### Arbeitspaket 9 — Maßstabstreue Arbeitsfläche (P0)

- Eine einzige Viewport-Berechnung aus verfügbarer Breite, verfügbarer Höhe und
  Profilabmessungen verwenden. Für 400 × 400 mm muss die gerenderte Fläche bei
  jeder Fenstergröße innerhalb der Rundung exakt gleich breit und hoch sein.
- Das SVG seitenverhältnistreu rendern; `preserveAspectRatio="none"` ist für das
  Dokument unzulässig. Rasterbilder dürfen nur gemäß ihrer eigenen
  Objektgeometrie skaliert werden.
- Arbeitsfläche und Lineale zentrieren. Freier Raum darf wachsen, aber nicht
  der X- oder Y-Maßstab unabhängig voneinander.
- Zoom und Scrollposition auf derselben Koordinatentransformation aufbauen,
  damit Pointer-Platzierung, Auswahl und Kameraüberlagerung deckungsgleich
  bleiben.

### Arbeitspaket 10 — Produktionsnavigation und About (P0/P1)

- Die Hauptleiste auf Projektaktionen und die täglichen Arbeitsabläufe
  reduzieren; bei schmalen Fenstern ein zugängliches Überlaufmenü verwenden.
- Sprint-/Gate-spezifische Schaltflächen nicht mehr im Produktionsmodus
  anzeigen. Diagnosefunktionen bleiben über einen klar benannten Diagnosemodus
  erreichbar, ohne Code für spätere Regressionsprüfungen zu verlieren.
- CAM-Vorschau und G-Code-Export als zusammenhängenden Produktionsablauf
  erhalten; die Hardware-Abnahmestarts davon trennen.
- About zeigt Version, `Windows · x64`, Projektinhaber `WolleKr` und die
  Repository-Adresse. Externe Links werden ausschließlich über einen
  Main-Process-Aufruf mit fester HTTPS-Allowlist geöffnet; beliebige Renderer-
  URLs bleiben gesperrt.

### Arbeitspaket 11 — Letzte Benutzerordner (P1)

- Eine kleine, versionierte Einstellungsdatei unter Electron `userData`
  einführen; Projektinhalte und Zugangsdaten gehören dort nicht hinein.
- `lastProjectDirectory`, `lastImportDirectory` und `lastExportDirectory`
  getrennt führen und erst nach einer erfolgreichen Auswahl aktualisieren.
- Pfade vor Verwendung normalisieren und auf Existenz prüfen. Eine fehlende,
  beschädigte oder veraltete Einstellung darf keinen Dateidialog verhindern.

### Arbeitspaket 12 — Fehlerdialog und GitHub-Übergabe (P1)

- Eine zentrale, typisierte Fehlerrepräsentation für Rendererfehler sowie
  fehlgeschlagene Datei-, Import-, Export-, Kamera- und Maschinenaktionen
  einführen. Erwartete Validierungsfehler bleiben am Eingabefeld.
- Der Dialog zeigt eine verständliche Kurzmeldung und bietet `GitHub-Issue
  vorbereiten`, `Details kopieren` und `Schließen`. Wiederholte identische
  Fehler werden zusammengefasst; ein Fehler im Fehlerdialog darf keinen
  weiteren Dialog öffnen.
- Die Issue-URL ist fest auf
  `https://github.com/WolleKr/ATOMburn/issues/new` begrenzt und enthält einen
  vorausgefüllten Titel sowie einen kompakten, URL-kodierten Text. Bei zu langen
  Daten, fehlender Browseröffnung oder Offlinezustand wird stattdessen der
  bereinigte Text in die Zwischenablage kopiert.
- Der Browser übernimmt GitHub-Anmeldung und Absenden. Die App verwendet weder
  GitHub-API noch Token und veröffentlicht nie ohne sichtbare Nutzeraktion.
- Fehlerdetails enthalten Version, Windows-/Architekturanzeige, Zeitpunkt,
  betroffenen Vorgang und bereinigten Stack/Log-Auszug. Zugangsdaten,
  Projektinhalt, Kamerabilder, Tokens und absolute lokale Benutzerpfade werden
  ausgeschlossen.

### Arbeitspaket 13 — Aktive Jobsteuerung und Statuswahrheit (P0)

- Jobzustand (`running`, `held`, `completed`, `failed`, `aborted`) und zuletzt
  bestätigten GRBL-Zustand getrennt benennen und anzeigen. `Idle · Job running`
  darf nicht mehr ohne Erklärung erscheinen.
- Während einer aktiven, exklusiven Jobsitzung bleiben Hold und Abort
  erreichbar, auch wenn seit Jobstart noch kein neuer GRBL-Statusbericht
  eingetroffen ist. Resume bleibt ausschließlich nach bestätigtem `Hold`
  verfügbar.
- Der Main-Prozess autorisiert Hold/Abort anhand der aktiven Jobsitzung und
  verifiziert anschließend per Statusabfrage den Controllerzustand. Ein lokaler
  Jobstatus darf niemals als angeblicher GRBL-`Run`-Beweis ausgegeben werden.
- Weitere reale Emissionstests bleiben bis zum grünen automatischen P0-Test
  gesperrt. `H-RASTER-BW-01` wird nicht wiederholt; ein später erforderlicher
  neuer Hardwaretest erhält eine unbenutzte Fläche gemäß
  `docs/HARDWARE-TEST-FLAECHEN.md`.

## Automatische Abnahme (Gate A)

- Pointer-Tests für Einzel- und Mehrfachauswahl, Drag, Resize, Rotation,
  Werkzeugplatzierung und Abbruch.
- Reducer-Tests: Jede abgeschlossene Geste ist genau ein Undo-/Redo-Schritt;
  Zwischenzustände gelangen nicht in die Projektdatei.
- Tastaturtests für Pfeiltasten, Modifikatoren, `Delete`, `Ctrl+D`, Undo/Redo
  und den Schutz aktiver Eingabefelder.
- Zoomtests für 100, Zwischenwerte und 1000 Prozent sowie unveränderte
  Dokumentkoordinaten unter dem Mauszeiger.
- Renderingtests für 400 × 400 mm und abweichende Profile: keine überlagerten
  Ursprung-, Achsen-, Maß- oder Home-Texte.
- Home-Tests für nicht verbunden, verbunden aber nicht gehomt und erfolgreich
  gehomt.
- Importtests für Filter, Pflichtformate, Abbruch und verständliche Diagnose.
- Roundtrip-Tests für neue Polygon-/Text-/Array-/Pfadänderungen.
- Kamera-UI-Tests für Öffnen, Schließen, Offline, Fehler, veraltetes Bild und
  erneutes Laden; dabei darf sich der Maschinenstatus nicht ändern.
- Layout-/Screenshot-Tests der Kameraansicht bei 100 %, 150 % und 200 % sowie
  im schmalen Fenster; Panel/Tab darf Canvas und Inspector nicht überdecken.
- Viewport-Tests für quadratische und nicht quadratische Profile bei mehreren
  Fenstergrößen: identischer X-/Y-Maßstab, korrektes Seitenverhältnis und keine
  Koordinatenverschiebung durch Resize, Zoom oder Scrollen.
- Navigationstests für Produktions- und Diagnosemodus sowie Tastaturzugang und
  Überlaufmenü im schmalen Fenster.
- Einstellungs-/Dateidialogtests für erfolgreichen Import, Abbruch, gelöschten
  letzten Ordner und beschädigte Einstellungsdatei.
- App-Info-Tests unterscheiden Betriebssystem und Architektur; der x64-Build
  darf nicht mehr als Plattform `win32` präsentieren.
- Fehlerdialogtests für Sanitizing, Deduplizierung, URL-Kodierung,
  Längenbegrenzung, Offline-/Clipboard-Fallback und exakte externe URL-Allowlist.
  Kein Test darf ein Issue absenden.
- Controller-/UI-Zustandstests für einen aktiven Job bei zuletzt bestätigtem
  `Idle`: Hold und Abort sind erreichbar, Hold wird bestätigt, Resume ist erst
  danach möglich, Abort stoppt weitere Jobzeilen und erzwingt frischen
  Reconnect/Homing. Die Anzeige unterscheidet lokalen Job- und GRBL-Zustand.
- Bestehende CAM- und G-Code-Golden-Tests bleiben unverändert grün.

## Nutzerabnahme

1. Ein Rechteck, eine Ellipse und eine Linie ausschließlich mit der Maus
   platzieren, bewegen, skalieren und drehen.
2. Dasselbe Objekt mit Pfeiltasten fein verschieben und per Undo/Redo prüfen.
3. Von 100 bis 1000 Prozent zoomen; der Punkt unter dem Mauszeiger darf nicht
   wegspringen und alle Rastertexte müssen lesbar bleiben.
4. SVG, LBRN2 und PNG/JPEG über den Windows-Dateidialog auswählen und
   importieren.
5. Projektursprung und Maschinen-Home vor und nach einem sicheren Homing klar
   unterscheiden.
6. Polygon, Text, Knotenbearbeitung, Array und Pfadteilung an einem kleinen
   Testmotiv prüfen.
7. Kameraansicht oben rechts beziehungsweise im Kamera-Tab öffnen, schließen
   und erneut laden; Bildstatus und Bildalter prüfen, während die
   Maschinenverbindung unverändert bleibt.
8. Das Fenster breit, hoch, maximiert und wieder kleiner ziehen: Die
   400 × 400-mm-Fläche bleibt sichtbar quadratisch, und ein Objekt verändert
   weder Form noch Position in Millimetern.
9. Die bereinigte Hauptnavigation prüfen: keine Sprint-/Abnahmeknöpfe im
   Produktionsmodus; Maschine, Kamera, Vorschau/Export und Diagnose bleiben an
   den vereinbarten Stellen erreichbar.
10. Zwei Importe aus verschiedenen Ordnern durchführen, die App neu starten und
    prüfen, dass der zweite Ordner wieder geöffnet wird. Danach den Ordner
    umbenennen oder entfernen und den sicheren Fallback prüfen.
11. About prüfen: Version, `Windows · x64`, `WolleKr` und Repository-Link. Link
    einmal öffnen und einmal kopieren.
12. Einen vorgesehenen Testfehler auslösen, den vorausgefüllten GitHub-Entwurf
    prüfen und abbrechen. Es darf kein Issue ohne den abschließenden Klick auf
    der GitHub-Webseite entstehen; persönliche Pfade und Projektdaten dürfen im
    Entwurf nicht enthalten sein.

Für Sprint 15 ist keine Laseremission erforderlich. Ein realer Home-Test gehört
zu Gate B und wird separat mit ausgeschaltetem Laser durchgeführt.

## Fertig, wenn

- die Punkte 1, 2, 5, 6, 8 und 9 ohne offene P0-Abweichung abgenommen sind,
- Punkt 3 im Produktionsbuild als Regression geschlossen ist,
- Punkt 4 ohne Funktionsverlust umgesetzt ist,
- die für Punkt 7 ausdrücklich begrenzten Werkzeuge funktionieren und das
  unbestimmte „weitere“ als priorisierbare Capability-Matrix dokumentiert ist,
- die Kamera im Hauptarbeitsbereich dauerhaft erreichbar ist, ihre Zustände
  verständlich anzeigt und unabhängig von Maschinenaktionen funktioniert,
- die Arbeitsfläche bei jeder Fenstergröße maßstabstreu bleibt,
- die Produktionsnavigation keine Sprint-/Gate-Schaltflächen mehr enthält,
  aber CAM-, Maschinen-, Kamera- und Diagnosefunktionen weiterhin erreichbar
  sind,
- Import-/Projekt-/Exportdialoge ihre letzten gültigen Ordner erinnern,
- About Betriebssystem und Architektur korrekt sowie Projektinhaber und
  Repository angibt,
- ein bereinigter GitHub-Issue-Entwurf ohne Token aus jedem relevanten
  Fehlerdialog vorbereitet, aber niemals automatisch abgesendet werden kann,
- ein laufender Job nicht mehr zusammenhanglos als Controller `Idle` erscheint
  und Hold/Abort während einer aktiven Jobsitzung zuverlässig erreichbar sind,
- Gate A vollständig grün ist und der Nutzer die mauszentrierte Bedienung
  freigegeben hat.
