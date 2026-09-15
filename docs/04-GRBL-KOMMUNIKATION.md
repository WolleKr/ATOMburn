# GRBL-Kommunikation

## Schichten

Die Kommunikation wird in getrennte Komponenten zerlegt:

1. `ByteTransport`: gemeinsame Schnittstelle für verbundene Byte-Streams.
2. `TcpTransport`: primärer Transport zur Mintion LaserCam im lokalen WLAN.
3. `SerialTransport`: direkter USB-Diagnose- und Entwicklungsfallback.
4. `LineDecoder`: CR/LF und partielle Datenpakete in Nachrichten umwandeln.
5. `GrblParser`: Welcome, `ok`, `error`, `ALARM`, Status und Feedback parsen.
6. `GrblSession`: Zustandsmaschine, Abfragen, Reconnect-Regeln.
7. `GrblStreamer`: G-Code gepuffert senden und Antworten zuordnen.
8. `MachineController`: Home, Jog, Frame, Start, Pause und Stop für die UI.

Keine UI-Komponente darf direkt auf einen Socket oder seriellen Port schreiben.

## Verbindungsaufbau

1. Konfigurierte LaserCam-IP beziehungsweise Hostname auf Erreichbarkeit prüfen.
2. TCP-Verbindung auf dem konfigurierten Port öffnen.
3. TCP `NoDelay` und Keepalive aktivieren; anwendungsseitigen Timeout führen.
4. Begrüßung abwarten oder kontrollierten Wake-up senden.
5. GRBL-Version erkennen.
6. `$I`, `$$`, `$G` und Status `?` lesen.
7. Profilvalidierung durchführen.
8. Erst danach Maschinenaktionen freigeben.

Mintion dokumentiert nicht eindeutig, wie mehrere gleichzeitige TCP-Steuerclients
behandelt werden. AtomBurn nimmt deshalb konservativ einen exklusiven GRBL-Kanal
an: LightBurn, LaserGRBL, BeagleEngrave-Steuerung und AtomBurn dürfen ihn nicht
gleichzeitig verwenden. Mehrere reine Videobetrachter sind davon getrennt.

Die Herstelleranleitung verlangt bei LightBurn nur IP-Adresse und
`Ethernet/TCP`. Daraus zusammen mit LightBurns Standard ergibt sich Port 23 als
plausibler Ausgangswert, aber nicht als ausreichend belegte Gerätekonstante.
AtomBurn macht den Port deshalb sichtbar konfigurierbar. Port 8080 kann als
manueller Diagnosekandidat angeboten, aber niemals während eines Jobs
automatisch durchprobiert werden.

### Direkter USB-Fallback

Für Diagnose und Entwicklung kann `SerialTransport` weiterhin COM-Ports
auflisten, CH340/CH34x hervorheben und 115200 Baud verwenden. Die GRBL-Schichten
oberhalb von `ByteTransport` bleiben identisch.

## Nachrichtentypen

| Beispiel | Bedeutung |
|---|---|
| `Grbl 1.1h [...]` | Controllerstart/Begrüßung |
| `ok` | vorherige G-Code-Zeile angenommen |
| `error:n` | vorherige Zeile abgelehnt |
| `ALARM:n` | gesperrter Gefahren-/Fehlerzustand |
| `<Idle|MPos:...|FS:...>` | Echtzeitstatus |
| `[MSG:...]` | Feedbackmeldung |
| `$30=1000` | Firmwareeinstellung |

Parser müssen unbekannte Felder erhalten und dürfen nicht bei hersteller-
spezifischen Erweiterungen abstürzen.

## Echtzeitbefehle

Diese Bytes dürfen jederzeit gesendet werden und belegen nicht den normalen
G-Code-Empfangspuffer:

| Befehl | Byte | Zweck |
|---|---:|---|
| Status | `?` | Statusbericht anfordern |
| Feed Hold | `!` | kontrolliert anhalten |
| Cycle Start | `~` | fortsetzen |
| Soft Reset | `0x18` | GRBL zurücksetzen |

Status soll höchstens ungefähr fünfmal pro Sekunde abgefragt werden. Ein
Soft-Reset ist kein normaler Pause-Knopf: Er verwirft Parser- und Pufferzustand
und führt meist in einen Zustand, der neu synchronisiert werden muss.

## Streaming

TCP ersetzt nur die physische Übertragung. Ein erfolgreicher Socket-Write oder
TCP-Acknowledge bedeutet **nicht**, dass GRBL die Zeile verarbeitet hat. Nur
GRBL-`ok` beziehungsweise `error:n` räumen Einträge aus der Streaming-FIFO.
TCP-Pakete dürfen Nachrichten beliebig teilen oder zusammenfassen; daher bleibt
der `LineDecoder` zwingend erforderlich.

### Nicht ausreichend: Send-response

Eine Zeile senden, auf `ok` warten und erst dann die nächste Zeile senden ist
einfach, kann bei Rasterjobs aber den Planerpuffer leerlaufen lassen.

### Empfohlen: Character Counting

GRBL 1.1 besitzt standardmäßig einen seriellen RX-Puffer von 128 Byte; praktisch
wird höchstens mit 127 belegten Bytes geplant. Der Sender führt eine FIFO-Liste
der gesendeten Zeilenlängen inklusive Zeilenende:

1. Zeile normalisieren und Kommentare entfernen.
2. Bytezahl inklusive `\n` berechnen.
3. Senden, solange `belegt + zeilenlaenge <= 127`.
4. Für jedes `ok` oder `error:n` die älteste Zeile aus der FIFO entfernen.
5. Freigewordenen Platz sofort nachfüllen.
6. Status- und Feedbackmeldungen nicht als Acknowledge zählen.

Wichtige Invarianten:

- Jede normale gesendete Zeile besitzt genau einen FIFO-Eintrag.
- `ok` und `error` beziehen sich auf die älteste unbeantwortete Zeile.
- Nach Reset, TCP-/Portverlust oder unerwarteter Begrüßung wird der Job abgebrochen;
  die FIFO wird nicht geraten oder automatisch rekonstruiert.
- Ein `error` stoppt den Stream standardmäßig.

## Maschinenzustände

Vorgeschlagene Anwendungsebene:

```text
Disconnected -> Resolving -> Connecting -> Synchronizing -> Idle
Idle -> Running -> Holding -> Running
Running/Holding -> Aborting -> Alarm|Idle|Disconnected
Any -> Faulted
```

Die UI darf `Start` nur in `Idle` anbieten. `Unlock` ist eine bewusste Aktion
mit Erklärung und darf niemals automatisch nach einem Alarm erfolgen.

## Status und Position

AtomBurn speichert mindestens:

- GRBL-State (`Idle`, `Run`, `Hold`, `Jog`, `Alarm`, `Door`, `Check`, `Home`),
- Maschinenposition `MPos`,
- Arbeitsposition `WPos` oder Work-Coordinate-Offset `WCO`,
- Feed und Spindle/Laserwert `FS`,
- Overrides `Ov`,
- Pinzustände `Pn`,
- Pufferdaten `Bf`, falls gemeldet.

Koordinaten werden intern in Millimetern gehalten. Displayrundung darf nicht in
den G-Code zurückfließen.

## Jogging und Homing

- Homing: `$H`, nur wenn Homing laut `$22` aktiv und Maschine bereit ist.
- Jogging: GRBL-1.1-Jogbefehle `$J=...`, nicht allgemeine `G0`-Zeilen.
- Jog Cancel: Echtzeitbefehl `0x85`, falls unterstützt.
- Arbeitsbereich und Richtung vor jedem Jog prüfen.
- Laserzustand beim Joggen immer aus.

## WLAN- und Bridge-Abbruch

AtomBurn unterscheidet drei Gesundheitszustände:

- LaserCam-Weboberfläche beziehungsweise Kamera erreichbar,
- GRBL-TCP-Bridge erreichbar,
- X30 Pro antwortet innerhalb der Bridge-Sitzung.

Ein MJPEG-Bild beweist nicht, dass die GRBL-Bridge oder der Lasercontroller
erreichbar ist. Umgekehrt darf ein fehlendes Kamerabild einen laufenden
GRBL-Stream nicht durch zusätzliche Steuerbefehle stören. Bei Verlust des
Steuerkanals wird der Job lokal als fehlgeschlagen markiert. Nach Reconnect wird
der reale Zustand neu gelesen und **nie** automatisch ab der letzten bekannten
Zeile weitergesendet.

## Pause und Abbruch

Pause sendet `!` und wartet auf einen Hold-Zustand. Resume sendet `~`.

Abbruchsequenz muss am realen Controller getestet werden. Kandidat:

1. `!` senden.
2. Hold oder Timeout abwarten.
3. Soft Reset senden.
4. Begrüßung/Alarm abwarten.
5. Session neu synchronisieren.
6. `M5` erst senden, wenn der Controller Befehle wieder sicher annimmt.

Der physische Not-Aus bleibt die primäre Maßnahme bei Feuer oder unerwarteter
Bewegung.

## Quellen

- [GRBL Interface Basics](https://github.com/gnea/grbl/blob/master/doc/markdown/interface.md)
- [GRBL Commands](https://github.com/gnea/grbl/blob/master/doc/markdown/commands.md)
- [GRBL Settings](https://github.com/gnea/grbl/blob/master/doc/markdown/settings.md)
- [GRBL Laser Mode](https://github.com/gnea/grbl/blob/master/doc/markdown/laser_mode.md)
- [Mintion: vollständig drahtlose Verbindung mit LightBurn](https://www.mintion.net/blogs/laser-engraver-camera-guidelines/mintion-lasercam-fully-wireless-connection-with-lightburn)
- [LightBurn: GRBL-Netzwerkport](https://docs.lightburnsoftware.com/2.0/Troubleshooting/GRBLCommunicationProblems/)
