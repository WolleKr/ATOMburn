# ATOMburn-Projektformat

## Zweck und Grenze

`.atomburn` ist ein lokales, UTF-8-kodiertes JSON-Format. Version 3 speichert
Dokumentname, Ebenen, geometrische Objekte, Operationen, das X30-Pro-Profil und
die Wahl zwischen `lasercam-tcp` und `serial-usb`. Es enthält weder G-Code noch
Maschinenzustand, Zugangsdaten, Hostnamen, COM-Ports oder absolute Dateipfade.

## Invarianten

- Einheit ist ausschließlich `mm`.
- Maschinenprofil ist `atomstack-x30-pro` mit verifizierten 400 × 400 mm; ältere 410 × 400-mm-Dateien werden beim Laden sicher normalisiert.
- `machine.verified` bleibt `false`, bis ein späterer Hardware-Sprint die Maße
  ausdrücklich bestätigt.
- Transformationen bestehen aus sechs endlichen Zahlen.
- IDs sind innerhalb ihrer Bereiche eindeutig und Referenzen müssen existieren.
- Leistung liegt zwischen 0 und 100 Prozent; Durchgänge zwischen 1 und 100.
- Fill-Operationen besitzen einen positiven endlichen `lineSpacingMm`; Line- und Image-Operationen dürfen dieses Fill-spezifische Feld nicht enthalten.
- Dateien über 64 MiB werden vor dem JSON-Parsing abgelehnt. Die Grenze lässt auch größere, in Millimetergeometrie umgewandelte LightBurn-Projekte zu, ohne unbegrenzt große Eingaben anzunehmen.
- Unbekannte Felder, absolute Pfade und sensible Feldnamen werden abgelehnt.

## Versionierung und Migration

`version: 3` ist aktuell. Version 1 wird deterministisch migriert und erhält
das X30-Pro-Profil sowie `lasercam-tcp` als sicheren Standard. Version 2 wird
ebenfalls deterministisch migriert; bereits vorhandene Fill-Operationen ohne
Zeilenabstand erhalten den dokumentierten Standard von 0,1 mm. Unbekannte
Versionen werden nicht geraten oder stillschweigend geöffnet.

## Speichervorgang und Wiederherstellung

Der Hauptprozess validiert und kanonisiert das Projekt, schreibt zunächst eine
Recovery-Datei und eine temporäre Datei, synchronisiert sie auf den Datenträger
und ersetzt erst danach die Zieldatei. Beim Überschreiben bleibt die vorherige
gültige Version als `.bak` erhalten. Beim Öffnen gilt diese Reihenfolge:

1. primäre `.atomburn`-Datei,
2. `.recovery`,
3. `.bak`.

Eine Wiederherstellung wird der Oberfläche ausdrücklich gemeldet. Der Renderer
erhält keinen freien Dateisystemzugriff; Öffnen und Speichern laufen nur über
fest definierte IPC-Funktionen und native Windows-Dateidialoge.
