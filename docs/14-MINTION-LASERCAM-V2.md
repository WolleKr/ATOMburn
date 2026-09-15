# Mintion LaserCam V2

## Rolle im AtomBurn-System

Die vorhandene LaserCam ist kein bloßes Kamerazubehör, sondern der zentrale
Netzwerkknoten zwischen AtomBurn und Laser:

```text
AtomBurn auf Windows
  |-- TCP/GRBL über lokales WLAN --> Mintion LaserCam
  |                                   |
  |                                   +-- USB --> ATOMSTACK X30 Pro
  |
  +-- HTTP/MJPEG -------------------> Livebild der LaserCam
```

Die WLAN-Verbindung ist der primäre Betriebsweg. Ein direktes USB-Kabel vom PC
zum X30 Pro wird nur für Diagnose, Entwicklung und Notfall-Fehlersuche
unterstützt.

## Durch Herstellerquellen bestätigt

- Ab LaserCam-Firmware 1.2.7 kann die Kamera als drahtlose GRBL-Bridge für
  LightBurn ab Version 1.4.05 arbeiten.
- Die Hersteller-Kompatibilitätsliste nennt den ATOMSTACK X30 Pro ausdrücklich.
- PC, LaserCam und Laser müssen sich im selben lokalen Netzwerk befinden; die
  LaserCam ist per USB mit dem Gravierer verbunden.
- Die Steuerverbindung wird in LightBurn als `Ethernet/TCP` mit der IP-Adresse
  der LaserCam angelegt.
- Der MJPEG-Stream ist unter
  `http://<laserCam-IP>/ipcam/mjpeg.cgi` erreichbar.
- Die Produktdaten nennen 1080p, H.264/MJPEG, bis zu 25 fps sowie 2,4- und
  5-GHz-WLAN.
- Firmware 1.2.8 behebt laut Changelog unter anderem unerwartete Stopps und
  Verbindungsabbrüche bestimmter Gravierer bei drahtloser Verbindung.
- Die Weboberfläche ist direkt über die IP erreichbar. Ältere Unterlagen nennen
  `admin`/`admin` als Standardzugang; dieser muss geändert werden.
- Laut Handbuch wird ein Gravierer angeschlossen, während bis zu vier Benutzer
  auf die Kamera zugreifen können. Ob mehrere gleichzeitige TCP-Steuerclients
  unterstützt oder sauber abgewiesen werden, ist nicht dokumentiert.

Die vom Nutzer verwendete Bezeichnung „LaserCam V2“ muss noch mit Typenschild
und Firmwareanzeige abgeglichen werden. Mintions Webseiten unterscheiden nicht
überall konsistent zwischen Hardwaregenerationen und Produktnamen.

## Bewusste Protokollgrenze

Für den Kernbetrieb benötigen wir keine proprietäre BeagleEngrave-API:

1. Rohes GRBL wird über eine TCP-Verbindung transportiert.
2. Das Bild kommt über den dokumentierten MJPEG-Endpunkt.
3. Datei-Upload, Timelapse, Pushmeldungen, Cloudkonto und proprietäre
   Web-Steuerung bleiben zunächst außerhalb von AtomBurn.

Das hält die Implementierung prüfbar und verhindert eine Abhängigkeit von
undokumentierten HTTP-Endpunkten, App-Versionen oder Cloud-Diensten. Eine lokale
API kann später nur dann ergänzt werden, wenn sie am konkreten Gerät sauber
aufgezeichnet, verstanden und durch Integrationstests abgesichert ist.

## TCP-Port

Mintions LightBurn-Anleitung verlangt nur die IP-Adresse, nennt im Text aber
keinen TCP-Port. LightBurn verwendet für Netzwerkverbindungen standardmäßig
Port 23 und weist darauf hin, dass manche Geräte stattdessen Port 8080 nutzen.
Daraus folgt als **Arbeitshypothese**, nicht als bestätigte LaserCam-Spezifikation:

- Port 23 zuerst testen,
- den tatsächlich funktionierenden Port im Geräteprofil speichern,
- Port 8080 nur als manuellen Diagnosekandidaten anbieten,
- niemals während eines Jobs Ports scannen oder automatisch wechseln.

Der reale Port wird aus einer funktionierenden LightBurn-Konfiguration oder
durch einen kontrollierten Verbindungstest mit ausgeschaltetem Laser bestimmt.

## Befund am vorhandenen Gerät vom 12. August 2026

- IP-Adresse: `192.168.178.71`
- Weboberfläche erreichbar, Seitentitel `BeagleEngrave`
- Weboberfläche zeigt einen Login; es wurden keine Zugangsdaten eingegeben oder
  gespeichert
- `http://192.168.178.71/ipcam/mjpeg.cgi` antwortet ohne Anmeldung mit
  `HTTP 200` und `multipart/x-mixed-replace;boundary=--myboundary`
- in einem auf fünf Sekunden begrenzten Lesetest wurden rund 4 MB Streamdaten
  empfangen; der Timeout war beabsichtigt und beendet den endlosen Stream
- TCP-Port der GRBL-Bridge: `23`, durch `H-TCP-01` bestätigt
- Bridge meldet `/dev/ttyUSB0` bei 115200 Baud
- GRBL `1.1h.2022070601`, Status `Idle`, `WPos 0,0,0`, `FS 0,0`
- `$I`, `$$` und `$G` antworten regulär; `?` benötigt an dieser Bridge einen
  TCP-Zeilenabschluss
- nach echtem `$H` meldet GRBL wegen des 1-mm-Pull-offs `WPos 1,1,0`
- während normalem `Run` und `Hold` kommt der Status zuverlässig, das zusätzliche
  TCP-`ok` auf den Zeilenabschluss jedoch nicht immer
- eine bereits angenommene Jog-Bewegung läuft trotz TCP-Trennung bis zum Ziel;
  Verbindungsverlust ist daher kein Bewegungsstopp

## Implementierung

### Gemeinsame Transportschnittstelle

```ts
interface ByteTransport {
  connect(): Promise<void>;
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
  onData(handler: (chunk: Uint8Array) => void): Unsubscribe;
  onClose(handler: (reason: TransportClose) => void): Unsubscribe;
}
```

Implementierungen:

- `LaserCamTcpTransport` mit Node `net.Socket`, `setNoDelay(true)`, Keepalive und
  expliziten Connect-/Idle-Timeouts,
- `DirectSerialTransport` mit `serialport` und 115200 Baud als Fallback,
- `MockTransport` für deterministische Tests.

Parser, Zustandsmaschine und Character-Counting-Streamer kennen den konkreten
Transport nicht. Ein erfolgreicher TCP-Write ersetzt niemals das GRBL-`ok`.

### Kamerakanal

Der Desktop-Hauptprozess öffnet den MJPEG-Stream und gibt dekodierte Frames oder
eine sichere lokale Stream-URL an die UI weiter. Dadurch liegen Zugangsdaten
nicht im Renderer und Browser-CORS-/Authentifizierungsprobleme bleiben gekapselt.

MVP-Funktionen:

- Livebild starten/stoppen,
- Verbindungs- und Framerateanzeige,
- Snapshot aufnehmen,
- Drehen und Spiegeln als Anzeigeprofil,
- Kameraausfall getrennt vom GRBL-Zustand melden.

Später:

- Linsenkalibrierung,
- perspektivische Entzerrung,
- Abbildung Pixel -> Maschinenkoordinaten,
- Hintergrundbild auf der Arbeitsfläche,
- Kalibrierung mit Markern und Fehlermaß,
- Print-and-Cut.

Kalibrierdaten gehören zum konkreten Aufbau aus Kamera, Halterung und
Maschinenprofil. Schon eine verschobene Kamera macht sie ungültig.

## Zustände und Exklusivität

AtomBurn zeigt drei getrennte Statusanzeigen:

| Kanal | Beispiele |
|---|---|
| Kamera/Web | nicht erreichbar, authentifiziert, Streaming, Bild-Timeout |
| TCP-Bridge | getrennt, verbindet, verbunden, durch andere App belegt |
| GRBL/X30 | synchronisiert, Idle, Run, Hold, Alarm, keine Antwort |

Vor dem Verbinden muss AtomBurn darauf hinweisen, LightBurn, LaserGRBL und die
Steuerfunktion von BeagleEngrave zu trennen. Unabhängig vom noch zu testenden
Geräteverhalten behandelt AtomBurn die Steuerung exklusiv. Reine
Videobetrachter dürfen dagegen parallel möglich sein. AtomBurn führt selbst nur
eine GRBL-Sitzung.

## Wiederverbindung

- Im Zustand `Idle` darf ein Reconnect mit vollständiger Neusynchronisation
  angeboten werden.
- Während `Run` oder `Hold` beendet jeder Verlust des TCP-Kanals den lokalen Job
  als fehlgeschlagen.
- Nach Reconnect werden Begrüßung, `$I`, `$$`, `$G` und `?` neu gelesen.
- Es gibt kein automatisches Resume und keine Rekonstruktion der GRBL-Puffer.
- Das Livebild ist kein Beweis dafür, dass LaserCam-Bridge und X30 antworten.
- Der Nutzer muss nach einem Abbruch die reale Maschine und das Werkstück
  kontrollieren, bevor irgendeine Fortsetzung erzeugt wird.

## Lokales Netzwerk und Zugangsdaten

- Bevorzugt DHCP-Reservierung im Router oder ein stabiler lokaler Hostname.
- AtomBurn speichert Host und Port im Geräteprofil.
- Kennwörter gehören in den Windows Credential Manager, nicht in Projektdateien
  oder Logs.
- Bei erkanntem Standardkennwort zeigt AtomBurn eine dauerhafte Warnung.
- Kein Port-Forwarding und keine Freigabe der LaserCam ins öffentliche Internet.
- Cloud-/App-Fernzugriff ist keine Voraussetzung für AtomBurn.
- Netzwerkfehler dürfen niemals implizit Maschinenbefehle wiederholen.

## Hardware-Spike

Benötigt werden:

1. genaue IP und Firmwareversion der LaserCam,
2. Nachweis einer funktionierenden LightBurn-`Ethernet/TCP`-Verbindung,
3. tatsächlich verwendeter TCP-Port,
4. Test des MJPEG-Links im Browser,
5. GRBL-Transcript mit `$I`, `$$`, `$G` und `?` über die Bridge,
6. Verhalten bei zweiter Steuerverbindung,
7. Verhalten bei WLAN-Ausfall, LaserCam-Neustart und getrenntem USB-Kabel,
8. Prüfung von Hold, Resume und Abbruch zunächst ohne Laserleistung.

## Sicherheitsgrenze

Mintion weist selbst darauf hin, dass die drahtlose Verbindung nicht zum
unbeaufsichtigten Betrieb gedacht ist. Das Kamerabild verbessert die
Beobachtung, ersetzt aber keinen erreichbaren physischen Not-Aus. AtomBurn nennt
seinen Softwareknopf deshalb nur `Stop`, niemals `Not-Aus`.

## Quellen

- [Mintion: vollständig drahtlose Verbindung mit LightBurn](https://www.mintion.net/blogs/laser-engraver-camera-guidelines/mintion-lasercam-fully-wireless-connection-with-lightburn)
- [Mintion: LaserCam-Firmware und Changelog](https://www.mintion.net/pages/lasercam-camera-firmware)
- [Mintion: Kompatibilitätsliste](https://www.mintion.net/pages/laser-engraver-compatibility)
- [Mintion: Nutzung der Weboberfläche](https://www.mintion.net/blogs/laser-engraver-camera-guidelines/how-to-use-the-mintion-lasercam-on-pc)
- [Mintion: Verbindung zum Gravierer](https://www.mintion.net/blogs/laser-engraver-camera-guidelines/how-to-connect-mintion-lasercam-with-laser-engraver)
- [Mintion: technische Produktdaten](https://www.mintion.net/products/mintion-new-lasercam-lightburn-camera)
- [LightBurn: GRBL-Netzwerkport](https://docs.lightburnsoftware.com/2.0/Troubleshooting/GRBLCommunicationProblems/)
