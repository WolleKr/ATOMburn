# Sprint-03-Testbericht

## Identität

- Sprint: 3 — GRBL-Kern und Simulator
- Datum: 12. August 2026
- Ausgangscommit: `6aa5a479b9c83a5165abcdf47b4b4372bfc7777b`
- Hardware-Gate: A
- Betriebssystem: Windows

## Umfang

- getestet: ByteTransport-Vertrag, inkrementeller LineDecoder, GRBL-1.1-Parser,
  Maschinenzustandsautomat, Character-Counting-Streamer, Echtzeitbytes,
  deterministischer Fake-Controller und interaktive Simulatoransicht
- bewusst nicht getestet: reale TCP-/WLAN-/LaserCam-Verbindung, COM-Port,
  Maschinenbewegung, G-Code-Erzeugung und Laseremission

## Ergebnisse

| Prüfung | Ergebnis |
|---|---|
| Typprüfung und ESLint | bestanden |
| Unit-/Sicherheits-/Integrationstests | 43/43 bestanden |
| zufällige Paketsplittung | 2.000 deterministische Property-Fälle |
| Streamer | 250 Zeilen, Fehler, Alarm, Kabelverlust, Timeout, Überlänge und Abort bestanden |
| Session | Idle-Gate, Hold/Resume, Reset und kein Auto-Resume bestanden |
| UI-Matrix | 15/15 bei 100 %, 150 % und 200 % bestanden |
| Electron-Smoke und Produktionsbuild | bestanden |
| vollständiges `pnpm gate:a` | bestanden |

## Sicherheits- und Negativtests

- Kein realer Netzwerk- oder Serialcode ist vorhanden.
- Der Simulatorjob enthält kein `M3`, `M4` oder Leistungswort.
- Normale Zeilen und Echtzeitbytes besitzen getrennte Pufferlogik.
- `error`, `ALARM`, unerwartetes Welcome und Transportverlust stoppen den
  Stream und leeren die Buchhaltung.
- Reconnect kann einen fehlgeschlagenen Job nicht automatisch fortsetzen.
- Ungültiges UTF-8, überlange Antworten und G-Code-Zeilen über 127 Byte werden
  vor weiterer Verarbeitung abgelehnt.

## Importdateien

Die fünf vom Nutzer bereitgestellten Dateien unter `tests/data_to_load/` wurden
inventarisiert, aber nicht verändert oder in Sprint 3 verwendet. SVG/LBRN2
folgen in Sprint 7. Die Importmatrix wurde um DXF, PDF-Vektor, HPGL/PLT und
einen kontrollierten AI/EPS-Kompatibilitätsweg ergänzt.

## Nutzertest

Ohne Hardware: `Simulator` öffnen, `Connect fake`, `Run dry job`, danach die
Störknöpfe Alarm, Cable loss und Controller reset ausprobieren. Es werden
weder Socket noch COM-Port geöffnet.

## Entscheidung

- Gate bestanden: ja
- nächster planmäßiger Sprint nach Abnahme: Sprint 4 — LaserCam TCP und MJPEG;
  dies wäre das erste Hardware-Gate und benötigt vor realen Zugriffen eine
  gesonderte Nutzerfreigabe
