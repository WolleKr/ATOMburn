# Sprint-10-Zwischenbericht

## Stand

Die Softwareimplementierung für Sprint 10 ist abgeschlossen. Alle neuen
Sprint-10- und produktbezogenen Regressionstests bestehen. Die realen Gates
`H-FILL-DRY-01`, `H-FILL-01` und `H-PASS-01` wurden durch den jeweils anwesenden
Nutzer in der App gestartet und technisch abgeschlossen. Sprint 10 wird dennoch
noch nicht als vollständig abgenommen bezeichnet: Neben den unten genannten
Gate-A-Blockern bleibt ein einmaliger Controller-Timeout aus einem abgebrochenen
Checkmodus-Lauf als zu reproduzierende Regression offen.

## Implementiert

- Projektformat V3 mit diskriminierten Line-, Fill- und Image-Operationen
- deterministische Migration von V1/V2; bestehende V2-Fills erhalten 0,1 mm
- Fill-Editor für Geschwindigkeit, Leistung, Zeilenabstand und Durchgänge
- transformierte Rechtecke einschließlich Eckenradius, Ellipsen und Pfade
- symmetrisch zentrierte horizontale Even-Odd-Scanlines
- Löcher, getrennte Inseln und Selbstüberschneidungen
- bidirektionale Reihenfolge ohne eingeschaltete Fahrt über Löcher
- vollständige Wiederholung der Werkzeugwege je Durchgang
- tatsächliche Containment-Tiefe für Innenkonturen vor Außenkonturen
- konservative Nearest-Entry-Optimierung, offene Pfadrichtungswahl und
  zyklischer Startpunkt für geschlossene Pfade ohne Windungsumkehr
- rohe Transformations-/Bounds-Prüfung vor Scanline-Erzeugung
- feste Budgets für Scanlines, Schnittprüfungen, Pfade, G-Code-Zeilen,
  Feedrate, Dauer und reale Testgröße
- Golden File `tests/fixtures/cam/fill-hole-10mm.gc`
- Rückparser prüft für jeden Gravurabschnitt neue Positionierung, expliziten
  Feed, maximale reale S-Leistung und sicheren Header/Footer
- JobGuard koppelt den höchsten tatsächlichen S-Wert jetzt rechnerisch an den
  frisch gelesenen `$30`-Wert; die vorher nur semantische Prozentangabe reicht
  nicht mehr
- eigener beaufsichtigter Fill-Dialog mit Kamera, Homing, bestätigtem GRBL-Checkmodus, laserlosem Framing,
  Liveprofil, SHA-256, geführtem Ein-Knopf-Ablauf, One-Shot, Hold, Resume und Stop
- der dokumentierte GRBL-Reset beim Verlassen von `$C` wird als erwartete
  Synchronisation behandelt; danach ist erneutes, nutzergestartetes Homing vor
  Framing und Emission zwingend
- getrennte reale Grenzen: exakt 600 mm/min und 15 %, 0,05–1 mm Abstand,
  maximal 10 × 10 mm, maximal 180 Sekunden, ein oder zwei Durchgänge
- `$30`, `$32`, `$130` und `$131` werden vor Freigabe und Start neu gelesen;
  G-Code und Fingerprint werden vor Start neu erzeugt und verglichen; auch die
  verifizierte Arbeitsfläche ist an das Ticket gebunden
- `H-LASER-02` bleibt bytegenau getrennt und wurde nicht zu einem freien
  Emissionskanal erweitert
- `ensure:electron` repariert fehlende Electron-Binärdateien vor Preview und
  Electron-Smokes mit dem offiziellen Electron-Installer

## Automatische Ergebnisse

| Prüfung | Ergebnis |
|---|---|
| Sprint-10-/zugehörige UI-Tests | 42/42 bestanden |
| alle produktbezogenen Unit-/Integrations-/UI-Tests ohne Repository-Sauberkeitstest | 163/163 bestanden |
| ESLint | bestanden |
| TypeScript | bestanden |
| Produktionsbuild | bestanden |
| Reporter-Vertrag | bestanden |
| Paketgrenze | bestanden, 70 Dateien, keine Upstream-Quellen |
| lokale Markdown-Links | bestanden |

Die Tests decken Rechteck-Goldens, Löcher, Inseln, Selbstüberschneidungen,
Transformationen, gerundete Rechtecke, mehrere Durchgänge, Bounds,
Ressourcenlimits, zufällige Rechteck-Loch-Fälle, ein 200-Konturen-Budget,
Fehler/Alarm/Disconnect, Leistungskopplung, Projektmigration und die lokale
manuelle UI-Startgrenze ab.

## Gate-A-Blocker der aktuellen Umgebung

Das vollständige `pnpm gate:a` kann in diesem Arbeitsbaum nicht grün behauptet
werden:

1. Der bereits vor Sprint 10 veränderte Nutzer-Checkout
   `third_party/sources/laserweb4` lässt den unveränderten
   Repository-Sauberkeitstest fehlschlagen. Diese Fremdänderung wurde gemäß
   Arbeitsregel nicht zurückgesetzt oder verändert.
2. Die aktuelle Linux-Agentenumgebung verwendet Node 22 statt der geforderten
   Node-24-Laufzeit.
3. Electron- und Playwright-Smokes können hier wegen der fehlenden
   Systembibliothek `libnspr4.so` nicht starten. Der Windows-Electron-Smoke
   erwartet außerdem bewusst `electron.exe`. Build und jsdom-UI-Tests sind
   davon unabhängig erfolgreich.

## Bewusst in einen späteren Sprint verschoben

- sichtbarer `Home`-/`X0,Y0`-Punkt im Arbeitsbereich,
- X-/Y-Beschriftungen mit Millimeterwerten am Raster.

Die vollständigen Anforderungen stehen im offenen UI-Backlog des
[`DEV-PLAN`](../16-DEV-PLAN.md). Diese Punkte ändern die Sprint-10-Abnahme nicht.

## Reale Gates

Die Durchführung ist in [`SPRINT-10-HARDWARE-GATES.md`](SPRINT-10-HARDWARE-GATES.md)
als geführter Workflow dokumentiert.

### Erfolgreiche reale Läufe

- `H-FILL-DRY-01` (15:05–15:06 Uhr): technisch bestanden. Checkmodus 58/58 Zeilen ohne
  angeforderte Bewegung oder Emission, dokumentierter Check-Reset, erneutes
  Homing und laserloses 5×5-mm-Framing abgeschlossen.
- `H-FILL-01`: Controllerlauf technisch bestanden. Preflight 30,30 → 35,35 mm,
  600 mm/min, 15 % (`S150` bei `$30=1000`), 0,5 mm Abstand, ein Durchgang,
  SHA-256 `fb06713669d51e38d7c6f9c5d1e91dc0e2af38a7b7be976c2da9ab3b5606022b`.
  Alle 58 Zeilen bestätigt; Endstatus `Idle` bei X30,000/Y34,750. Der Nutzer
  bestätigte die Füllung als visuell korrekt, gleichmäßig und innerhalb des Rahmens.
- `H-PASS-01` (21:56–21:57 Uhr): technisch bestanden. Preflight 30,30 → 35,35 mm,
  600 mm/min, 15 % (`S150` bei `$30=1000`), 0,5 mm Abstand, zwei Durchgänge,
  108 Zeilen, geschätzte Dauer 10,561 s und SHA-256
  `275e7a6d25fdd8c9d044bb8458a8d66291057eca5897827509ffdeb6aec5c939`.
  Der Checkmodus bestätigte 108/108 Zeilen ohne Bewegung oder Emission; erneutes
  Homing und laserloses 5×5-mm-Framing wurden abgeschlossen. Der Emissionslauf
  bestätigte 108/108 Zeilen und endete `Idle` bei X30,000/Y34,750. Der Nutzer
  bestätigte den Brennvorgang visuell als erfolgreich und gleichmäßig. Die
  Gravur blieb vollständig innerhalb des 5×5-mm-Rahmens; zwischen den beiden
  Durchgängen waren weder ein Versatz noch eine doppelte Kante sichtbar.

### Offene reale Anomalie

Vor dem erfolgreichen `H-PASS-01`-Lauf wurde versehentlich erneut
`h-fill-01.atomburn` geöffnet. Dessen Checkmodus-Lauf stoppte nach 38/58
bestätigten Zeilen mit `Controller response timed out`. Der Nutzer bestätigte,
dass dabei keine Bewegung und keine Emission auftrat und die Maschine danach
sicher `Idle` beziehungsweise getrennt war. Der unmittelbar spätere
`H-PASS-01`-Check verarbeitete 108/108 Zeilen erfolgreich; der frühere Timeout
ist damit nicht erklärt und muss vor der vollständigen Sprintabnahme als
simulierbarer Timeout-/Cleanup-Regressionsfall gesichert werden.

Die deterministischen Projektdateien liegen unter
`tests/fixtures/projects/h-fill-01.atomburn` und
`tests/fixtures/projects/h-pass-01.atomburn`.

- `H-FILL-DRY-01`: dasselbe kleine Fill-Projekt zunächst nur homen und
  laserlos framen; Checkmodus-Ausführung bleibt separat zu bestätigen.
- `H-FILL-01`: höchstens 10 × 10 mm, ein Durchgang, 600 mm/min, 15 %; der
  Nutzer startet selbst über den abschließenden, eindeutig beschrifteten Workflow-Klick.
- `H-PASS-01`: dasselbe begrenzte Projekt mit genau zwei Durchgängen und eigener
  neuer Bereitschaftsbestätigung sowie eigenem abschließenden Workflow-Klick.

Jeder Lauf stoppt bei Alarm, Door/Limit, Verbindungsverlust, unerwarteter
Bewegung, Flamme, ungewöhnlichem Rauch oder fehlender direkter Aufsicht. Es gibt
keinen Auto-Resume- oder Agentenstart.
