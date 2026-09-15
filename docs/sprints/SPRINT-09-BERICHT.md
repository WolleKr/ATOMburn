# Sprint-09-Zwischenbericht

## Stand

Sprint 9 ist in Arbeit. Der sicherheitskritische Job-Gate- und
Kamera-Gesundheitskern sowie die fest begrenzten H-LASER-Jobdialoge sind
implementiert. Steuerung und Emission wurden zunächst gegen Simulatoren und
Unit-Tests geprüft; der reale Kamera-Snapshot wurde lesend verifiziert. Eine
reale Emission wurde am 16. August 2026 durch den anwesenden Nutzer in
der geprüften App gestartet und für H-LASER-02 erfolgreich bestätigt; Details
stehen im Abschnitt „Reales Gate-C-Ergebnis“.

## Implementiert

- SHA-256 des G-Codes und unveränderliches Freigabeticket
- Fingerprint über G-Code, Verbindung, Profil, `$30`, `$32` und Leistung
- Start ausschließlich aus bestätigtem `Idle`
- Doppelklick-/Mehrfachstart-Sperre
- Connect-Race-Sperre im Dialog und idempotente Übernahme derselben bereits
  aktiven Maschinenverbindung; sichtbarer Maschinenstatus im Gate-C-Dialog
- verbrauchtes Ticket nach Start, Abort oder Fehler nicht wiederverwendbar
- H-LASER-01 war auf 5 % begrenzt; H-LASER-02 ist als einmaliger,
  unveränderlicher 20-%-Kalibriertest freigegeben
- Fortschritt ausschließlich aus bestätigten Zeilen
- Hold/Resume nur aus den passenden bestätigten Zuständen
- Abort verlangt danach neuen Preflight, Reconnect und Homing
- unabhängige Kameraauswertung für live, stale, frozen und offline
- ausschließlich lokaler, manueller Start im sichtbaren Gate-C-Dialog
- erneutes reales Auslesen von `$30`, `$32` und `Idle` vor der Freigabe
- historischer H-LASER-01-Entwicklungsstand: X30/Y30 bis X40/Y30, 3.000 mm/min, S50; nicht mehr als Produktionspfad vorhanden
- fester zweiter Test: X30/Y35 bis X40/Y35, 600 mm/min, S200,
  ein Durchgang und Startknopf nach dem ersten Versuch dauerhaft gesperrt
- nach erfolgreicher Markierung zusätzlich bestätigtes `M5`, danach `$H`;
  Abschluss erst nach dem finalen Homing
- sichtbarer Startzustand `READY`, `COMMAND SENT`, `COMPLETED` oder `FAILED`;
  dadurch ist eindeutig erkennbar, ob der Startklick den IPC-Pfad erreicht hat
- kein passiver Socket-Idle-Timeout in überwachten Maschinenverbindungen;
  ein stiller GRBL-Kanal ist normal, aktive Befehle behalten ihre Antwortlimits
- direkt sichtbarer Sperrgrund am Startknopf, insbesondere aktueller
  Maschinenstatus statt eines scheinbar nicht reagierenden Buttons
- acht allgemeine physische Bestätigungen, separat visuell bestätigter
  laserloser Zielrahmen und exakte Phrase `H-LASER-02 STARTEN`
- persistentes LaserCam-Bild, Bildalter, Fortschritt, Hold und Stop gemeinsam
- Mintion-JPEG-Snapshots über `/images/snapshot0.jpg`; der proprietäre
  H.264-Livestream der Weboberfläche läuft separat über WebSocket-Port 7681
- ungültige Nicht-UTF-8-Bytes auf dem GRBL-TCP-Kanal führen zu kontrolliertem
  Disconnect und sichtbarem Fehler statt zu einem Main-Process-Absturz
- Telnet-IAC-Sequenzen auf Port 23 werden zustandsbehaftet vor dem GRBL-
  UTF-8-Decoder entfernt, auch über geteilte TCP-Pakete
- beim Schließen des Fensters oder Beenden der App wird eine bestehende
  Maschinenverbindung zentral und idempotent getrennt; Freigaben und
  Verbindungsautorität werden vor dem Transport-Close gelöscht
- keine freie G-Code-Eingabe, kein Remote-, Zeitplan- oder automatischer Start
- H-LASER-02 wird im Controller bytegenau gegen das fest einkompilierte
  Programm geprüft; auch niedrigere oder anderweitig veränderte Varianten
  werden verworfen
- seit Sprint 10 muss der höchste tatsächliche S-Wert zusätzlich exakt dem
  freigegebenen Prozentwert des frisch gelesenen `$30` entsprechen

## Reales Gate-C-Ergebnis

### H-LASER-02 — bestanden (Nutzerbericht vom 16. August 2026)

- Nutzer war am Gerät und startete die Emission selbst im ATOMburn-Dialog.
- Der laserlose Zielrahmen und der Maschinenzustand `Idle` wurden vor dem Start
  bestätigt.
- Angezeigt wurden `$30=1000`, `S200` (20 %) und 600 mm/min.
- Der Laser markierte einen sichtbaren, vom Nutzer mit 10 mm bestätigten Strich.
- Das abschließende Homing wurde ausgeführt.
- Der Nutzer meldete normales Laserverhalten ohne Anomalie.

Dieses Ergebnis bestätigt H-LASER-02 nur für die angezeigte Konfiguration. Es
ist keine allgemeine Freigabe für weitere Leistungen oder Tests. Weitere reale
Tests benötigen jeweils einen neuen Preflight und eine separate Nutzerfreigabe.

## Noch offen

- vollständige UI-Abdeckung für Reload und alle First-Mark-Fehlerpfade
- H-LASER-01 als separater Minimalleistungstest, falls er weiterhin verlangt wird
- H-LASER-03 für Hold, Resume und kontrollierten Software-Abbruch

Gate C wird nicht aus der vorherigen Jogging-/Dry-Run-Freigabe abgeleitet.

## Integriertes Gate A

| Prüfung | Ergebnis |
|---|---|
| Lint und TypeScript | bestanden |
| Unit-/Sicherheits-/Integrations-/UI-Tests | 125/125 bestanden |
| H-LASER-01 und H-LASER-02 gegen Fake-Controller | bestanden |
| Produktionsbuild und beide Electron-Smokes | bestanden |
| UI-Endtests bei 100/150/200 % | 21/21 bestanden |
| Paketgrenze und lokale Markdown-Links | bestanden |

## Reale Vorbereitung für H-LASER-01

- unbehandeltes, helles 4-mm-Sperrholz eingelegt und gesichert
- Abluft läuft
- Air Assist läuft
- Fokus mit der originalen Fokuslehre eingestellt
- Nutzer ist am Laser
- read-only verifiziert: GRBL 1.1h, `$30=1000`, `$32=1`,
  `$130=400`, `$131=400`, `M5`, `S0`, `G21`, `G90`
- LaserCam-Snapshot real verifiziert: HTTP 200, `image/jpeg`, ca. 149 KB
- vor dem Preflight zwingend: laserloser 10×10-mm-Zielrahmen bei X30/Y30
  und dessen visuelle Bestätigung vollständig auf dem Holz
- reales Jogging nach Telnet-Fix vom Nutzer als sauber bestätigt

Diese Vorbereitung führte anschließend zum oben dokumentierten bestandenen H-LASER-02-Lauf. Sie gilt nicht als Freigabe für weitere Tests.
