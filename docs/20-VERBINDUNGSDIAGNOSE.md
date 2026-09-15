# Verbindungsdiagnose in ATOMburn

## Zweck und Grenze

Der Dialog `Device` implementiert Sprint 4 und 5. Er hält Kamera, TCP-Bridge
und GRBL-Zustand getrennt. Beim Start der App wird weder ein Socket noch ein
COM-Port geöffnet. Bewegung, Homing, Unlock, Konfigurationsschreiben, freie
Konsole, Jobstreaming und Laseremission sind in diesem Dialog nicht vorhanden.

## Standardpfad LaserCam

- lokales Profil: Host `192.168.178.71`, TCP-Port zunächst `23`
- Kamera: `/ipcam/mjpeg.cgi`
- Liveansicht: der Hauptprozess liest pro Aktualisierung genau einen
  JPEG-Frame und beendet die HTTP-Verbindung danach
- Snapshot: derselbe gekapselte Frameabruf ohne GRBL-Verbindung
- optionale Kamera-Zugangsdaten bleiben nur im Arbeitsspeicher; das lokale
  Profil speichert ausdrücklich kein Kennwort

Der voreingestellte TCP-Port ist bis zum kontrollierten Hardwaretest nur eine
Arbeitshypothese. ATOMburn scannt keine Ports und wechselt bei einem Fehler
nicht automatisch zu Port 8080 oder USB.

## USB-Diagnose

ATOMburn verwendet `serialport` 13.0.0 mit 115200 Baud. Die COM-Liste zeigt
verfügbare Hersteller-, VID-/PID- und Seriennummerdaten. TCP und USB werden von
einer gemeinsamen Sperre exklusiv gehalten. USB-Abzug, belegter Port und
Controllerreset beenden die Sitzung; es gibt keinen stillen Fallback.

Am Entwicklungs-PC ist derzeit nur der ACPI-Standardport `COM1` sichtbar. Er
ist kein nachgewiesener ATOMSTACK-Anschluss und wurde nicht geöffnet.

## Gate B

Vor jedem GRBL-Zugriff müssen alle vier Punkte bestätigt sein:

1. Nutzer bleibt physisch am Laser.
2. Arbeitsbereich ist frei.
3. Physischer Not-Aus ist geprüft und erreichbar.
4. LightBurn, LaserGRBL und BeagleEngrave-Steuerung sind geschlossen.

Danach darf die Diagnose ausschließlich diese Folge senden:

```text
$I
$$
$G
?
```

Die ersten drei Befehle werden zeilenweise abgeschlossen. Direkter USB sendet
`?` als rohes GRBL-Echtzeitbyte. Die vorhandene LaserCam-Bridge benötigt auch
für `?` einen TCP-Zeilenabschluss; ohne ihn kam am realen Gerät keine Antwort.
Jede andere Eingabe wird bereits vor dem Transport verworfen. Nach dem
Transcript wird die Verbindung immer getrennt.

## Automatische Abdeckung

- TCP-Latenz, Paketaufteilung, Abbruch und ungültige Ports
- MJPEG-Teilframes, ungültige Länge, Timeout und Zugangsdaten-Leak
- virtueller serieller Adapter, Busy und USB-Abzug
- identischer Parserpfad für TCP und Serial
- exklusive TCP-/USB-Sperre
- natives SerialPort-Laden innerhalb der verwendeten Electron-Version
- UI-Gate bei 100 %, 150 % und 200 % Skalierung
