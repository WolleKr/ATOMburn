# Hardware- und Software-Testplan

## Teststufen

### Stufe 1: ohne Hardware

- Parser mit aufgezeichneten GRBL-Zeilen
- virtueller serieller Transport
- virtueller TCP-Transport mit Teilpaketen, Verzögerung und Verbindungsabbruch
- Streamer mit zufällig gesplitteten Datenpaketen
- verzögerte und gebündelte `ok`-Antworten
- `error`, `ALARM`, Reset und Verbindungsabbruch
- G-Code-Golden-Files
- Geometrie-, Bounds- und Dither-Snapshots

### Stufe 2: LaserCam und Gerät an, Laserleistung nicht benutzt

- LaserCam per IP finden beziehungsweise konfigurieren
- Firmwarestand und MJPEG-Livebild prüfen
- TCP-Bridge verbinden; verwendeten Port dokumentieren
- nur lesende Abfragen
- Statuspolling
- Homing
- kleine Jogs in sicherer Richtung
- laserloses Framing
- Checkmodus
- Hold, Resume und Reset ohne Laserjob
- WLAN kurz trennen, LaserCam neu starten und USB-Verbindung zwischen LaserCam
  und X30 Pro unterbrechen; niemals automatisch fortsetzen
- exklusiven Steuerzugriff gegenüber LightBurn und BeagleEngrave prüfen

Der wiederholbare Standardfall `H-VISUAL-SQUARE40-01` wird ausschließlich über
`ATOMburn-Bewegungstest.cmd` gestartet. Pro Lauf sind die Gate-B-Freigabe und
die anschließende Sichtbestätigung erforderlich. Das Protokoll ist fest auf
Homing, `M5` und ein geschlossenes 40 × 40-mm-Quadrat bei 300 mm/min begrenzt.
Ein fehlgeschlagener oder nicht bestätigter Lauf wird nicht automatisch
wiederholt.

Das LaserCam-Livebild darf parallel in ATOMburn geöffnet werden, ohne dort eine
zweite GRBL-Verbindung aufzubauen. Für eine spätere agentengestützte Beobachtung
sind nur ausdrücklich freigegebene, temporäre Kamerabilder zulässig. Sie dürfen
nicht in Testberichte oder Git gelangen und ersetzen niemals die Person am
Gerät.

### Stufe 3: minimale Leistung auf sicherem Material

- Fokus und Unterlage manuell prüfen
- für jeden neuen Emissionstest einen noch unbenutzten Bereich gemäß
  [`HARDWARE-TEST-FLAECHEN.md`](HARDWARE-TEST-FLAECHEN.md) reservieren
- einzelner kurzer Strich
- 10-mm-Quadrat nachmessen
- Framing und tatsächliche Lage vergleichen
- M4-Leistungsskala prüfen
- physischer Not-Aus-Test nach Herstellerverfahren

### Stufe 4: echte Jobtypen

- Line mit mehreren Pfaden
- Innen- und Außenkontur
- Fill
- Raster Schwarzweiß
- Raster Dither
- Graustufe
- mehrere Durchgänge
- große Datei mit dauerhaft gefülltem Streamerpuffer

## Benötigte Geräteaufzeichnung

Ein vollständiger, anonymisierbarer Diagnoseblock:

```text
[LaserCam IP, Firmware, TCP-Port und MJPEG-URL]
[TCP-Verbindungsinformationen]
[GRBL-Begrüßung]
$I
...
$$
...
$G
...
?
...
```

Außerdem:

- Screenshot der LaserCam-Kamerainformationen ohne Kennwort,
- Angabe, ob LightBurn aktuell über `Ethernet/TCP` funktioniert,
- Screenshot oder Foto der Controller-/Firmwareinfo auf dem Display,
- Angabe, ob Limit-Schalter und Homing aktuell funktionieren,
- genaue Air-Assist-Verkabelung,
- Original- oder Erweiterungsrahmen,
- ein von LightBurn erzeugter und nachweislich funktionierender kleiner
  G-Code-Job als Vergleich.

## Streamer-Testmatrix

| Szenario | Erwartung |
|---|---|
| `ok` pro Zeile | FIFO korrekt geleert |
| mehrere `ok` in einem Read | alle Antworten verarbeitet |
| `ok` über Reads geteilt | LineDecoder setzt korrekt zusammen |
| Status zwischen `ok` | Status verändert FIFO nicht |
| `error:20` | betroffene Zeile gemeldet, Stream stoppt |
| `ALARM:2` | Job stoppt, keine weiteren normalen Zeilen |
| Reset-Begrüßung während Job | Job fehlgeschlagen, Resync erforderlich |
| Portverlust bei vollem Puffer | keine automatische Fortsetzung |
| überlange G-Code-Zeile | vor Senden ablehnen/normalisieren |
| TCP teilt eine GRBL-Zeile | LineDecoder setzt sie korrekt zusammen |
| TCP bündelt viele Antworten | alle Antworten in Reihenfolge verarbeitet |
| WLAN-Ausfall bei vollem Puffer | Job fehlgeschlagen, kein Auto-Resume |
| MJPEG fällt aus, TCP bleibt | Zustände getrennt, Streamer nicht desynchronisiert |
| LaserCam rebootet | Session verworfen, vollständiger Resync erforderlich |

## CAM-Fixtures

- offener Pfad
- Rechteck, Kreis und Bézierkurve
- Form mit Loch
- ineinander verschachtelte Konturen
- deckungsgleiche Linien
- Pfad genau auf Arbeitsbereichsgrenze
- Overscan außerhalb der Grenze
- negative und extrem große Transformationen
- transparente PNG-Kante
- 1-Bit-Bild, Graustufenverlauf und Foto
- SVG mit verschachtelten Transformationsmatrizen
- bösartiges SVG mit Script und externen Referenzen

## Maßhaltigkeit

Testformen bei 10, 50, 100 und 300 mm schneiden beziehungsweise markieren und
mit geeignetem Messmittel prüfen. Softwareabweichung, Kerf und mechanische
Abweichung getrennt erfassen.

## Regression

Jeder reale Fehler liefert:

- anonymisiertes Controllertranskript,
- kleinstes reproduzierbares Projekt,
- erwarteten und tatsächlichen Zustand,
- automatisierten Test, bevor der Fix akzeptiert wird.

## Sprint 15

Der detaillierte automatische und manuelle Abnahmeumfang für den interaktiven
Editor, Viewport, Rasterbeschriftung, Import, Kameraansicht, Navigation,
Dateidialoge, Fehlerübergabe und aktive Jobsteuerung steht im
[Sprint-15-Plan](sprints/SPRINT-15-PLAN.md). Laufende Ergebnisse und offene
Gate-Abweichungen werden im
[Sprint-15-Bericht](sprints/SPRINT-15-BERICHT.md) festgehalten.
