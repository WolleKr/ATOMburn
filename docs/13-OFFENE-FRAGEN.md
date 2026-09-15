# Offene Fragen und benötigte Daten

## Vom konkreten X30 Pro

- Ausgabe von `$I`, `$$`, `$G` und `?`
- genaue Firmwareversion
- direkter Windows-COM-Port, VID/PID und Herstellername nur für Diagnose
- funktionieren Homing und beide Limit-Schalter?
- ist der Nullpunkt tatsächlich vorne links?
- Arbeitsbereich ist am realen Controller mit `$130=400` und `$131=400` als 400 × 400 mm verifiziert; ältere 410 × 400-mm-Projektdateien werden migriert.
- welcher `$30`-Wert ist konfiguriert?
- wird die F30-Pumpe manuell geschaltet oder ist sie am Controller angeschlossen?
- reagieren `M7`, `M8` oder `M9`? Nur kontrolliert und einzeln testen.
- besitzt das Gerät eine steuerbare Z-Achse? Beim normalen X30 Pro vermutlich
  nein; nicht annehmen.

## Zum gewünschten Workflow

- Werden Designs hauptsächlich extern in SVG/DXF erstellt oder in LightBurn?
- Welche drei Dateiformate werden tatsächlich am häufigsten benutzt?
- Überwiegen Schneiden, Vektorgravur oder Fotos?
- Welche Materialien und Dicken sind regelmäßig relevant?
- Werden Kerf, Tabs oder Rotary heute verwendet?
- Soll das Livebild im MVP nur überwachen oder bereits maßhaltig als
  Hintergrund zur Werkstückpositionierung dienen?
- Ist Windows-only dauerhaft in Ordnung?
- Soll AtomBurn vollständig offline bleiben?

## Zu vorhandenen Libraries

Für jede vom Nutzer gelieferte Library benötigen wir:

- Originalquelle oder Repository-Link,
- Version/Commit, falls bekannt,
- Lizenzdatei,
- Beschreibung, in welcher App sie verwendet wurde,
- bekannte funktionierende Beispiele,
- Architektur und Plattform,
- ob Quellcode oder nur Binärdateien vorhanden sind.

Ungeprüfte Dateien nicht in das Repository aufnehmen. Nach Inventarisierung und
Lizenzprüfung werden sie entweder als reguläre Package-Dependency aufgenommen,
als eigene Originaldatei neu erstellt oder verworfen.

## Architekturfragen nach dem Hardware-Spike

- LaserFlow-basierter TypeScript-Neubau oder Rayforge-Fork?
- Electron ausreichend oder eigener nativer Maschinenprozess?
- SVG-DOM als Editorzustand oder eigenes unveränderliches Dokumentmodell?
- Paper.js, Maker.js oder kleinere Spezialbibliotheken?
- Clipper2 über TypeScript, WASM oder separaten nativen Dienst?

## Von der Mintion LaserCam V2

- genaue Modellbezeichnung vom Typenschild
- installierte Firmwareversion; Ziel ist mindestens 1.2.8
- aktuelle IP-Adresse beziehungsweise DHCP-Reservierung
- funktioniert LightBurn bereits per `Ethernet/TCP` über diese Kamera?
- welcher Netzwerkport ist dort eingestellt beziehungsweise nachweislich aktiv?
- liefert `http://<ip>/ipcam/mjpeg.cgi` im Browser ein Livebild?
- wurde das Standardkennwort `admin` geändert?
- läuft die LaserCam nur lokal oder ist Cloud-/App-Fernzugriff aktiviert?
- ist der optionale Flammensensor vorhanden und wie verhält er sich bei Alarm?
- welche Ausrichtung, Spiegelung und Drehung nutzt das Kamerabild?

## Noch zu verifizieren

- konkrete Abort-Sequenz des Atomstack-Controllers,
- Checkmodus-Verhalten `$C`,
- Statusfelder und herstellerspezifische Meldungen,
- reale RX-Puffergröße beziehungsweise Kompatibilität mit 127-Byte-Streaming,
- Verhalten des GRBL-Streamers bei WLAN-Latenz über die LaserCam,
- exakter TCP-Port und Verhalten bei zweiter gleichzeitiger Steuerverbindung,
- Authentifizierung des MJPEG-Endpunkts bei geändertem Kennwort,
- ob ein dokumentierter lokaler Snapshot-Endpunkt existiert; bis dahin MJPEG,
- Verhalten des Touchscreens während aktiver USB-Verbindung,
- Dateigrößen- und G-Code-Dialektgrenzen des TF-Karten-Players,
- Air-Assist-Kommandos der vorhandenen Controllerrevision.
