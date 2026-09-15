# Sichere Maschinensteuerung ohne Emission

## Unterstützte Aktionen

- Homing mit `$H`
- bewusstes Unlock mit `$X`, ausschließlich aus `Alarm`
- GRBL-Checkmodus mit `$C`
- relative Jogs bis maximal 10 mm und 1000 mm/min
- geschlossenes Diagnose-Frame bis maximal 50 × 50 mm
- Hold, Resume und Software-Stop

Jog und Frame beginnen defensiv mit `M5`. Der Hauptprozess blockiert `M3`,
`M4`, positive `S`-Werte, nicht endliche Zahlen, negative Zielkoordinaten und
Ziele außerhalb von 400 × 400 mm. Die normale Konsole zeigt nur das Transcript
und besitzt kein Eingabefeld.

Der reale X30 Pro meldet nach Homing wegen `$27=1` den sicheren Pull-off
`WPos 1,1` statt `0,0`. ATOMburn verwendet deshalb 1 mm als minimale X-/Y-
Koordinate und fährt nicht zurück auf die ausgelösten Endschalter.

## Zustandsgrenzen

| Aktion | Erlaubter GRBL-Zustand |
|---|---|
| Home | `Idle`, `Alarm` |
| Unlock | `Alarm` nach physischer Kontrolle |
| Checkmodus | `Idle`, `Check` |
| Jog/Frame | `Idle` mit bekannter Position |
| Hold | `Run`, `Jog` |
| Resume | `Hold` |
| Stop | `Run`, `Jog`, `Hold` |

Software-Stop sendet fest Hold und anschließend Soft-Reset. Danach wird die
Sitzung ungültig; Reconnect und erneutes Homing sind erforderlich. Es gibt kein
Auto-Resume.

## Hardwaretest-Protokoll

Der kanonische Wiederholungstest wird mit `ATOMburn-Bewegungstest.cmd`
gestartet. Die CMD verlangt die exakte Freigabephrase, bevor der interne
Low-Level-Prozess überhaupt geöffnet wird. Der direkte Aufruf von
`scripts/hardware-motion-test.mjs` ist gesperrt. Jeder Lauf homt, fährt das
laserlose 40-mm-Sichtquadrat und schreibt automatisches Ergebnis, Transcript
und getrennte visuelle Nutzerentscheidung nach
`artifacts/hardware-acceptance/`. Nur beide bestandenen Ergebnisse ergeben
einen Pass.

Alle Tests verwendeten TCP-Port 23, `M5`, kleine Bewegungen und
Statusabfragen. Ergebnisse:

1. `H-MOVE-01`: bestanden; `1,1 → 2,1 → 2,2 → 1,2 → 1,1`.
2. Sichtprüfung: bestandenes 40 × 40-mm-Quadrat von `1,1` bis `41,41`.
3. `H-FRAME-01`: bestandenes 10 × 10-mm-Frame ab `1,1`.
4. `H-CTRL-01`: Hold bei rund `1,975`, Resume als `Run`, Stop über Hold/Reset,
   danach erfolgreiches Homing.
5. `H-LOSS-01`: Die bereits angenommene 3-mm-Jog-Bewegung lief nach TCP-
   Trennung bis zum Ziel `4,1` weiter. Reconnect und Homing waren erfolgreich.

Das in `Pn:P` gemeldete Probe-Signal blieb in allen Tests aktiv, verursachte
aber keine Störung. Es wird nicht als Endschalter interpretiert oder verändert.

Während `Run` und `Hold` liefert die LaserCam auf die zeilenabgeschlossene
Statusabfrage den Status, aber nicht zuverlässig ein zusätzliches `ok`.
ATOMburn wertet deshalb den Status selbst als maßgebliche Antwort. Bereits von
GRBL angenommene Bewegung kann nach Netzwerkverlust weiterlaufen; die App warnt
explizit und behauptet niemals, ein TCP-Abbruch sei ein physischer Stopp.

## Livebild im Motion-Dialog

Der Motion-Dialog zeigt das LaserCam-Bild direkt neben Hold und Stop. Nach einer
bewusst freigegebenen echten Verbindung startet die Ansicht automatisch;
manuelles Starten und Stoppen ist ebenfalls möglich. Der aktuelle MVP liest
über den gekapselten Hauptprozess ungefähr zwei Bilder pro Sekunde. Zugangsdaten
und die HTTP-Verbindung bleiben außerhalb des Renderers.

Kamerastatus und GRBL-Zustand bleiben unabhängig. Ein fehlendes oder altes Bild
stoppt keine Bewegung automatisch und wird niemals als Beweis für einen sicheren
Maschinenzustand gewertet. In Sprint 9 folgt eine persistente MJPEG-Sitzung mit
Framerate-, Bildalter- und Freeze-Erkennung; Sprint 12 ergänzt Kalibrierung und
Geometrie-Overlay.
