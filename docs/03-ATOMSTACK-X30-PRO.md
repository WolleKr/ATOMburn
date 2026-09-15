# ATOMSTACK X30 Pro

## Bestätigte Eckdaten

| Eigenschaft | Wert |
|---|---|
| Gerät | ATOMSTACK X30 Pro |
| Lasertyp | Diodenlaser, Klasse 4 |
| Optische Leistung | Herstellerangabe 33 bis 36 W |
| Wellenlänge | 455 ± 5 nm |
| Arbeitsbereich | 400 x 400 mm, am realen Controller über `$130/$131` verifiziert |
| Steuerung | GRBL |
| Datenübertragung | im vorhandenen Aufbau USB zur LaserCam, von dort WLAN/TCP; alternativ direktes USB oder TF-Karte |
| Seriell | 115200 Baud, üblicherweise 8-N-1 |
| USB-Seriell-Chip | CH340/CH34x-Treiber laut Handbuch |
| Üblicher Ursprung | vorne links |
| Offline-Dateien | LaserGRBL `.nc`, LightBurn `.gc` |
| Hardware-Sicherheit | Not-Aus und Reset vorhanden |
| Anzeige | Touchscreen/TF-Karten-Bedienung vorhanden |
| Fokus | fest fokussiertes Modul, Höhe mit Fokuslehre einstellen |

Herstellerangaben zu Leistung und Materialien sind keine Garantie für ein
bestimmtes Schnittergebnis. Material, Leim, Feuchtigkeit, Fokus, Luft und
Verschmutzung haben starken Einfluss.

## Nicht hart codieren

Folgende Werte müssen wir am konkreten Gerät auslesen oder verifizieren:

- Firmwarekennung und GRBL-Version über `$I`
- komplette Einstellungen über `$$`
- aktueller Modalzustand über `$G`
- maximale Leistung `$30`
- Laser-Modus `$32`
- maximale X-/Y-Wege `$130` und `$131`
- Homing `$22`, Richtung `$23` und Pull-off `$27`
- Soft-/Hard-Limits `$20` und `$21`
- Statusformat `$10`
- maximale Geschwindigkeiten und Beschleunigungen
- tatsächliche USB VID/PID und Gerätebezeichnung

AtomBurn soll die gelesenen Originalwerte sichern, bevor es eine Änderung an
Firmwareeinstellungen erlaubt. Das MVP muss Einstellungen nur lesen.

## Maschinenprofil

Vorgeschlagene logische Voreinstellung:

```json
{
  "id": "atomstack-x30-pro-stock",
  "displayName": "ATOMSTACK X30 Pro",
  "widthMm": 400,
  "heightMm": 400,
  "origin": "front-left",
  "connection": {
    "transport": "tcp",
    "bridge": "mintion-lasercam",
    "host": "configured-on-device",
    "port": "configured-and-probed",
    "fallbackSerial": {
      "baudRate": 115200
    }
  },
  "firmware": "grbl",
  "powerScale": "read-$30",
  "airAssist": "unknown",
  "rotary": false
}
```

Die Datei ist nur eine Vorlage. Firmwarewerte haben Vorrang vor Marketingdaten,
und Abweichungen müssen sichtbar gemeldet werden.

Der X30 Pro bleibt ein normaler GRBL-Controller. Die LaserCam terminiert das
USB-Kabel und reicht den GRBL-Datenstrom über TCP weiter. GRBL-Identifikation,
`$$`-Werte und Status müssen deshalb auch über die Bridge gelesen werden; das
Maschinenprofil darf sie nicht durch LaserCam-Vorgaben ersetzen.

## TF-Karten-Workflow

Das Handbuch beschreibt, dass `.nc`- und `.gc`-Dateien über die TF-Karte auf
dem Display ausgewählt, positioniert, geframt, gestartet, pausiert und gestoppt
werden können. AtomBurn kann deshalb schon vor fertigem WLAN-Streaming nützlich
sein, indem es korrekten G-Code exportiert.

Nachteile gegenüber WLAN-/TCP-Steuerung:

- keine AtomBurn-Liveanzeige des tatsächlichen Jobzustands,
- kein verlässlicher Software-Abbruch aus AtomBurn,
- manuelles Übertragen der Karte,
- mögliche Einschränkungen des Display-Parsers und der Dateigröße.

## Air Assist

Das beim X30 Pro angebotene F30/F30-Pro-System kann je nach konkreter
Ausführung manuell beziehungsweise separat versorgt sein. Atomstacks AIC1-
Controller nennt ausdrücklich automatische Steuerung per `M7`. Deshalb gilt:

- `M7`, `M8` und `M9` zunächst nur über eine Diagnosefunktion testen,
- automatische Air-Assist-Option erst nach positivem Hardwaretest freischalten,
- niemals annehmen, dass `M7` oder `M8` bei jedem X30-Pro-Board einen Ausgang
  schaltet.

## Erweiterungsrahmen

Atomstack nennt einen erweiterbaren Bereich von etwa 400 x 850 mm. Falls dieser
Rahmen später verwendet wird, wird ein separates Maschinenprofil erstellt und
der tatsächliche `$131`-Wert überprüft. Eine bloße UI-Änderung der Arbeitsfläche
reicht nicht.

## Quellen

- [Atomstack X30 Pro Produktseite](https://atomstack.com/products/atomstack-x30-pro-160w-6-core-laser-engraving-and-cutting-machine)
- [Offizielles X30-Pro-Handbuch, Version D](https://ncstatic.clewm.net/rsrc/2024/0112/09/1ab42831666d756fd6ab09232f3c5874.pdf)
- [Atomstack Firmware- und Handbuchseite](https://atomstack.com/pages/firmware-and-manual-download)
- [Atomstack AIC1 Air Assist](https://atomstack.net/products/atomstack-a1c1-auto-air-assist-system)
