# Sprint-04-Testbericht

## Ergebnis

LaserCam-TCP, MJPEG-Parser, Kamera-Proxy, lokales Geräteprofil und getrennte
Kamera-/Bridge-/GRBL-Zustände sind implementiert. Eine Read-only-
Hardwarediagnose ist vorbereitet, aber bis zur vollständigen Gate-B-Freigabe
nicht gegen die GRBL-Bridge ausgeführt.

## Automatische Tests

| Prüfung | Ergebnis |
|---|---|
| Fake-LaserCam, Teilpakete und TCP-Abbruch | bestanden |
| MJPEG-Teilframes und ungültige Frames | bestanden |
| Kameraausfall unabhängig von GRBL | bestanden |
| Zugangsdaten nicht in Fehlern/Profil | bestanden |
| Read-only-Allowlist `$I`, `$$`, `$G`, `?` | bestanden |
| Produktionsbuild und UI-Matrix | bestanden |

## Echter Gerätetest

- Weboberfläche `http://192.168.178.71/`: erreichbar, Titel `BeagleEngrave`
- MJPEG: HTTP 200, gültiger Multipart-Stream, rund 4 MB in fünf Sekunden
- keine Anmeldung, keine Schaltfläche und kein GRBL-Befehl ausgelöst
- `H-TCP-01`: bestanden nach vollständiger Gate-B-Bestätigung
- TCP-Port 23, `/dev/ttyUSB0`, 115200 Baud und GRBL 1.1h bestätigt
- `$I`, `$$`, `$G`: vollständig; Status: `Idle`, `WPos 0,0,0`, `FS 0,0`
- LaserCam-spezifischer Befund: `?` benötigt einen TCP-Zeilenabschluss

## Sicherheitsentscheidung

Keine Portsuche, kein Auto-Reconnect eines Jobs und kein Auto-Resume. Der
Dialog enthält keine Bewegungs-, Homing-, Unlock- oder Emissionsbefehle.
