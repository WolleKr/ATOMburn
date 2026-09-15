# Sprint-06-Testbericht

## Stand

Sprint 6 ist implementiert, vollständig automatisch geprüft und nach separater
Gate-B-Freigabe am echten ATOMSTACK X30 Pro über die LaserCam getestet.

## Implementiert

- typisierte Aktionen ohne freie G-Code-Konsole
- Home, Unlock, Checkmodus, Jog und laserloses Frame
- Hold, Resume und Stop mit fester Hold-Reset-Reihenfolge
- 400 × 400-mm-Preflight und kleine Diagnosegrenzen
- getrennte Simulator- und reale TCP-Sitzung
- sechsfaches Motion-Gate in UI und Hauptprozess
- Read-only-Transcript und sichtbare Zustände
- wiederholbarer `H-VISUAL-SQUARE40-01`-Starter mit interaktivem Gate B,
  festem Homing-/40-mm-Protokoll und separater Sichtabnahme

## Automatische Ergebnisse

| Prüfung | Ergebnis |
|---|---|
| Unit-/Sicherheits-/Integrationstests | 71/71 bestanden |
| Bounds-/NaN-/Infinity-Prüfung | bestanden |
| 2.000 deterministische Bewegungs-Properties | bestanden |
| kein `M3`, `M4` oder positiver `S`-Wert | bestanden |
| Alarm, Reset, Transportverlust und Abort | bestanden |
| Hold → Reset, danach kein Auto-Resume | bestanden |
| UI-Endtests bei 100/150/200 % | 21/21 bestanden |

## Reale Tests

- `H-MOVE-01`: bestanden; vier 1-mm-Jogs, Rückkehr auf `1,1`
- 40 × 40-mm-Sichtquadrat: bestanden und vom Nutzer visuell bestätigt
- `H-FRAME-01`: bestanden; geschlossenes 10 × 10-mm-Frame
- `H-CTRL-01`: bestanden; Hold, Resume, Hold/Reset und Re-Homing
- `H-LOSS-01`: bestanden; Bewegung lief nach TCP-Verlust bis zum angenommenen
  3-mm-Ziel weiter, danach Reconnect und Re-Homing

Zu keinem Zeitpunkt wurde `M3`, `M4` oder positive Laserleistung gesendet. Alle
Statusmeldungen zeigten Spindel/Laser `0`.

## Reale Befunde

- Homing endet wegen `$27=1` bei `WPos 1,1`, nicht `0,0`.
- `Pn:P` blieb aktiv, ohne die XY-Bewegung zu stören.
- `$J`-Hold beendet den Jog kontrolliert und geht auf `Idle`; Resume ist dann
  nicht anwendbar.
- Eine normale laserlose `G1`-Bewegung unterstützt Hold und Resume wie geplant.
- Während `Run`/`Hold` darf die LaserCam-Statusantwort nicht von einem
  zusätzlichen TCP-`ok` abhängig gemacht werden.
- TCP-Verlust stoppt bereits angenommene Bewegung nicht physisch.

## Live-Monitoring-Erweiterung

- LaserCam-Bild direkt im Motion-Dialog integriert
- automatischer Kamerastart erst nach bewusst freigegebener Realverbindung
- manueller Start/Stop der Kamera ohne Änderung des GRBL-Zustands
- Hold und Stop unmittelbar neben dem Bild
- Kamerafehler bleibt unabhängig von Maschinensteuerung
- deutlicher Hinweis, dass Kamera und Software-Stop keinen physischen Not-Aus
  ersetzen

## Wiederholbare Folgeabnahme

`ATOMburn-Bewegungstest.cmd` ist der kanonische Einstieg für spätere
Richtungs-/Bewegungsprüfungen. Ohne exakte Freigabe startet kein Hardwareprozess.
Nach dem technischen Lauf entscheidet die Nutzer-Sichtprüfung separat über Pass
oder Fail; JSON und GRBL-Transcript bleiben lokal unter
`artifacts/hardware-acceptance/`. Der Low-Level-Test ist gegen versehentlichen
Direktstart gesperrt.
