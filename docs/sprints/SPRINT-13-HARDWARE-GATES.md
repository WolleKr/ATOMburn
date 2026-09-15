# Sprint 13 — vorbereitete Hardware-Gates

## Status und Grenze

Diese Tests sind vorbereitet, aber noch nicht ausgeführt. Sie sind ausschließlich
Gate B: keine Laseremission, kein `M3`, kein `M4` und kein positiver `S`-Wert.
Jeder Lauf benötigt eine neue Bestätigung durch die anwesende Person. ATOMburn
setzt nach Sleep/Wake, Netzwerkwechsel, USB-Verlust, Reset, Alarm oder Timeout
niemals einen Job automatisch fort.

Vor jedem Test:

1. Person bleibt am Gerät; der gesamte Bewegungsbereich ist frei.
2. Physischer Not-Aus ist erreichbar; andere GRBL-Programme sind geschlossen.
3. Laseremission ist aus; Kamera und Software-Stop gelten nicht als Not-Aus.
4. Vollständiges Gate A und der fokussierte Stabilitätstest sind grün.

## H-STABILITY-LONG-01 — längere laserlose Bewegung mit Kamera

1. Die portable Version `output/ATOMburn-0.13.0-win-x64/ATOMburn.exe` starten.
2. In **Device** nur das LaserCam-Livebild öffnen; dort keine GRBL-Diagnose
   gleichzeitig starten.
3. `ATOMburn-Bewegungstest.cmd` zehnmal einzeln ausführen. Jeder Lauf verlangt
   erneut `BEWEGUNGSTEST FREIGEBEN`, führt `M5`, Homing und genau ein
   40 × 40-mm-Quadrat mit 300 mm/min aus und verlangt die Sichtbestätigung.
4. Bildalter, Bewegungsruhe, Rückkehr zum Ursprung und jeden Fehler notieren.

Bestanden, wenn alle zehn Läufe bestätigt sind, kein Verbindungs-/Listenerleck
sichtbar wird und keine unerwartete Bewegung oder Emission auftritt.

## H-SLEEP-IDLE-01 — Sleep/Wake ohne laufende Bewegung

1. In **Motion** Gate B bestätigen, LaserCam TCP wählen, verbinden und homen.
2. Sicherstellen, dass der Zustand `Idle` ist und kein Job beziehungsweise Jog
   läuft. Erst dann Windows in den Energiesparmodus versetzen.
3. Nach dem Aufwachen prüfen: Sitzung ist verworfen, kein Job wurde fortgesetzt,
   Maschinenaktionen bleiben bis zur ausdrücklichen Neuverbindung gesperrt.
4. Neu verbinden, Zustand lesen, bewusst homen und wieder trennen.

## H-LOSS-WLAN-01 — WLAN-Verlust bei laserloser Bewegung

1. `ATOMburn-Bewegungstest.cmd` freigeben und während einer Quadratseite die
   WLAN-Verbindung des PCs einmal trennen. Akzeptierte Bewegung kann noch bis
   zum Endpunkt laufen; am physischen Stop bleiben.
2. Prüfen: Test meldet Verbindungsverlust, startet nichts neu und wiederholt
   keine Zeile automatisch.
3. WLAN wiederherstellen, in ATOMburn neu verbinden, Zustand lesen und bewusst
   homen. Den fehlgeschlagenen Lauf nicht automatisch wiederholen.

## H-LOSS-USB-01 — USB-Verlust bei laserloser Bewegung

1. In **Motion** Gate B bestätigen, **Direct USB** und den nachgewiesenen
   ATOMSTACK-COM-Port wählen, verbinden und homen.
2. Ein 40 × 40-mm-Framing starten und während einer Seite genau diese
   USB-Verbindung trennen. Keine andere USB-Verbindung berühren.
3. Prüfen: Sitzung wird verworfen, kein TCP-Fallback erfolgt, kein Job wird
   fortgesetzt und weitere Aktionen bleiben gesperrt.
4. USB wiederherstellen, denselben Port ausdrücklich neu wählen, Zustand lesen,
   bewusst homen und trennen.

## Rückmeldung

Für jeden Test werden Test-ID, Uhrzeit, Verbindungsart, Ergebnis, sichtbare
Abweichung und Diagnosepaket-Dateiname festgehalten. Private Kamerabilder und
Zugangsdaten gehören nicht in den Bericht.
