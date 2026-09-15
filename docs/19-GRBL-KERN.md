# Offline-GRBL-Kern

## Sprint-3-Grenze

Der Kern besitzt noch keinen TCP- oder Serial-Transport. `ByteTransport` ist
nur ein Vertrag; die einzige Implementierung ist ein deterministischer
Speichersimulator. Dadurch können Parser, Zustände, Puffer und Störungen ohne
Verbindung zu einem Laser geprüft werden.

## Komponenten

- `LineDecoder`: setzt beliebig geteilte CR/LF-Bytepakete zusammen und begrenzt
  Zeilenlängen sowie ungültiges UTF-8.
- `parseGrblLine`: erkennt Welcome, `ok`, `error`, `ALARM`, Status, Feedback und
  Settings; unbekannte Statusfelder bleiben erhalten.
- `GrblSession`: erlaubt Jobstart nur aus synchronisiertem Idle, Resume nur
  nach bestätigtem Hold und beendet Jobs bei Alarm, Fehler, Reset oder Trennung.
- `GrblStreamer`: Character Counting bis maximal 127 Byte, FIFO-Zuordnung von
  Acknowledgements und getrennter Echtzeitkanal.
- `FakeGrblTransport`: reproduzierbare Paketsplittung, Verzögerung, Fehler,
  Alarm, Kabelverlust und Controller-Reset.

## Verhaltensreferenzen

Es wurde kein Upstream-Code kopiert. Verglichen wurden:

- MeerK40t Commit `5f68a45bff41d98e4d3fe8b8267857218099afa8`, insbesondere
  `meerk40t/grbl/controller.py`: getrennter Echtzeitkanal ohne `ok`,
  zeilenbezogener Forward-Puffer, gepufferter/synchroner Modus sowie Behandlung
  von `ALARM`, Welcome und Status.
- LaserWeb4 Commit `9403a659a89d70dc0f18cff6194ce1820c9843c9`, insbesondere
  `src/components/com.js` und `src/lib/lw.comm-client.js`: GRBL-1.1-Erkennung,
  Queueanzeige sowie sichtbare Behandlung von Trennung, Alarm und Fehler.

ATOMburn ist absichtlich konservativer: Fehler, Alarm, unerwartetes Welcome
oder Transportverlust leeren die lokale Buchhaltung und führen nie zu einer
automatischen Jobfortsetzung.
