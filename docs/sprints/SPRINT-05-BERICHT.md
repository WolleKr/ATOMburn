# Sprint-05-Testbericht

## Ergebnis

Direkter Windows-USB-Zugriff ist über `serialport` 13.0.0 implementiert. TCP und
USB verwenden denselben GRBL-Parser sowie dieselbe Read-only-Diagnose und sind
gegenseitig gesperrt.

## Automatische Tests

| Prüfung | Ergebnis |
|---|---|
| virtueller COM-Port, Öffnen und Schließen | bestanden |
| belegter Port und USB-Abzug | bestanden |
| TCP-/Serial-Transcripts über denselben Parser | bestanden |
| kein stiller TCP-/USB-Fallback | bestanden |
| natives Modul im Electron-Prozess | bestanden; ein Port lesend sichtbar |
| Gate A gesamt | 53/53 Tests und 18/18 UI-Endtests bestanden |

## Echter Gerätetest

Nur `COM1` als ACPI-Standardanschluss sichtbar; er wurde nicht geöffnet und ist
kein nachgewiesener Lasercontroller. `H-USB-01` bleibt ausstehend, bis die
LaserCam sicher vom Controller getrennt und der Controller direkt mit dem PC
verbunden wurde.

## Sicherheitsentscheidung

Der USB-Pfad ist Diagnose-Fallback, kein automatischer Ersatz. Auch hier sind
nur `$I`, `$$`, `$G` und das rohe Echtzeitbyte `?` möglich. Bewegung und Emission folgen frühestens
in Sprint 6 mit einem neuen Hardware-Gate.
