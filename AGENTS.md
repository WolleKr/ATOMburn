# Arbeitsregeln für Agenten im ATOMburn-Projekt

## Verbindliche Grundlagen

- Produktname: **ATOMburn**.
- Kanonischer Entwicklungsplan: `docs/16-DEV-PLAN.md`.
- Sicherheitsregeln: `docs/10-SICHERHEIT.md`.
- Kommunikationsgrundlagen: `docs/04-GRBL-KOMMUNIKATION.md`.
- Standardpfad: Windows-PC -> WLAN -> Mintion LaserCam V2 -> USB ->
  ATOMSTACK X30 Pro.
- Direkter USB-/COM-Zugriff ist Diagnose- und Notfalltestweg, kein Grund für
  eine zweite Maschinenlogik.
- Das Produkt ist ausschließlich für die lokale persönliche Nutzung geplant.
- Operatives Projekttracking liegt im Jira-Projekt `SCRUM`; die verbindliche
  Zuordnung und Synchronisationsregel steht in `docs/JIRA-PROJEKTTRACKING.md`.
- Jira-Status und Repository-Dokumentation müssen übereinstimmen oder eine
  erklärte Abweichung enthalten. Physische Tests schließt ausschließlich der
  Nutzer nach eigener Beobachtung ab.

## Sprintdisziplin

1. Arbeite nur am aktuell freigegebenen Sprint und dessen Abnahmekriterien.
2. Lies vor Änderungen den DEV-Plan und alle direkt betroffenen Dokumente.
3. Prüfe den Arbeitsbaum und bewahre vorhandene Nutzeränderungen.
4. Beginne testgetrieben, wenn das Verhalten automatisierbar ist.
5. Halte Änderungen klein, nachvollziehbar und innerhalb des Sprintumfangs.
6. Führe relevante Tests und danach das vollständige Gate A aus.
7. Lege einen Testbericht mit Befehlen, Ergebnissen und offenen Risiken ab.
8. Behaupte keinen Abschluss bei übersprungenen oder fehlerhaften Tests.

## Hardware- und Lasersicherheit

- Ohne ausdrückliche Freigabe des Nutzers keine Verbindung zu realer Hardware,
  keine Bewegung und keine Hardwarekonfiguration.
- Gate B erlaubt nur das exakt benannte laserlose Protokoll.
- Gate C gilt nur für den exakt benannten Emissionstest und muss pro Test erneut
  bestätigt werden.
- Ein Agent startet niemals über Shell, Skript oder Rohkonsole einen echten
  Laserjob und sendet niemals eigenständig `M3`, `M4` oder Fokus-/Fire-Befehle.
- Der Nutzer startet Emission in der geprüften App selbst und bleibt am Gerät.
- Jeder Emissionstest auf derselben Testplatte erhält einen zuvor unbenutzten
  Bereich. Vor Planung eines neuen Hardwaretests ist
  `docs/HARDWARE-TEST-FLAECHEN.md` zu prüfen und der neue Bereich dort zu
  reservieren; ein bereits gestarteter oder erfolgreich verwendeter Bereich
  wird nicht erneut belegt.
- Keine Firmwareupdates oder `$`-Konfigurationsschreibvorgänge ohne separate,
  ausdrückliche Aufgabe und Sicherung der Ausgangswerte.
- Kein Auto-Resume nach TCP-, WLAN-, USB-, Bridge-, Controller- oder App-Fehler.
- Keine Umgehung von Interlocks, Not-Aus oder anderen Schutzmaßnahmen.
- Ein Software-Stop wird niemals als physischer Not-Aus bezeichnet.

## Automatische Tests

- Sicherheitskritische Logik benötigt Positiv-, Negativ-, Zustands- und
  Ausfalltests.
- Parser und Streamer werden mit zufälliger Paketteilung, Bündelung, Latenz,
  Reset, Alarm, Timeout und Abbruch geprüft.
- CAM benötigt Golden Files, Bounds-/Finite-Value-Prüfung und deterministische
  Ausgabe.
- Jeder reale Fehler erhält vor Abschluss des Fixes einen automatisierten
  Regressionstest.
- Hardwaretests ersetzen niemals Simulator-, Unit- oder Integrationstests.
- Testberichte dürfen keine Passwörter, Tokens, Cookies oder privaten
  Kamerabilder enthalten.

## Upstream-Quellen

- MeerK40t und LaserWeb4 werden nur über offizielle Links in
  `docs/REFERENCES.md` referenziert.
- Upstream-Checkouts, Anwendungen und Archive dürfen nicht in diesem
  Repository liegen oder mit der App ausgeliefert werden.
- Keine automatische Codeübernahme. Zuerst Quelle, Commit/Release, Lizenz,
  Diff, Relevanz und Kompatibilität prüfen.
- Jede echte Code- oder Asset-Übernahme nennt Projekt, Datei, Commit, Lizenz und
  lokale Änderung in `THIRD_PARTY_NOTICES.md` oder einer Provenienznotiz.
- Produktionscode darf nicht zur Laufzeit aus Upstream-Checkouts importieren.
- Reguläre Packages werden über Manifest und Lockfile bezogen, nicht durch
  Kopieren von `node_modules`.

## Architekturgrenzen

- UI/Renderer besitzt keinen direkten Socket-, Serial-, Datei- oder
  Shellzugriff.
- Nur der Desktop-Hauptprozess hält TCP-, MJPEG-, Serial- und Dateirechte.
- IPC ist klein, explizit typisiert und validiert.
- TCP und USB implementieren dieselbe `ByteTransport`-Schnittstelle.
- Editorobjekte erzeugen nicht direkt G-Code; der Weg führt über eine neutrale
  CAM-Zwischenrepräsentation und Preflight.
- Die normale Rohkonsole bleibt read-only.

## Startbild

- Die verbindliche `AT` + Laserstrahl + `OM`-Komposition steht im DEV-Plan.
- Der Laserstrahl ersetzt visuell das `|`; kein zusätzliches Pipe-Zeichen.
- Exakte Buchstaben werden als Vektortypografie gesetzt, nicht dem
  Bildgenerator überlassen.
- Bildgenerierung beginnt erst im dafür vorgesehenen Sprint 1.

## Stop-Bedingungen

Stoppe und melde den Zustand, wenn:

- ein sicherheitskritischer Test fehlschlägt,
- reale Hardware anders antwortet als das gespeicherte Profil,
- der Nutzer nicht vor Ort ist oder das Hardware-Gate nicht bestätigt hat,
- Arbeitsfläche, Ursprung, `$30`, `$32` oder Firmware nicht sicher bestimmt
  sind,
- eine geplante Aktion Nutzerdateien oder Fremdänderungen überschreiben würde,
- Herkunft oder Lizenz eines zu übernehmenden Fremdteils unklar ist.
