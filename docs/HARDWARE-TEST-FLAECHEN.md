# Belegung der Hardware-Testfläche

Diese Liste verhindert, dass ein neuer Emissionstest auf der aktuellen
Testplatte einen bereits gravierten Bereich verwendet. Maßangaben sind
Maschinenkoordinaten in Millimetern.

## Verbindliche Regel

- Vor Erzeugung eines neuen Hardware-Testjobs wird ein noch unbenutzter Bereich
  einschließlich Framing- und möglichem Overscan-Bereich reserviert.
- Sobald ein Emissionslauf gestartet wurde, gilt sein Bereich als verbraucht –
  unabhängig davon, ob der Lauf erfolgreich war oder abgebrochen wurde.
- Ein verbrauchter Bereich wird auf derselben Platte niemals erneut verwendet.
- Erst wenn der Nutzer ausdrücklich eine neue Testplatte bestätigt, wird eine
  neue Belegungsliste begonnen; die historische Liste bleibt erhalten.
- Testprojekt, Preflight, Dokumentation und Flächenliste müssen dieselben
  Koordinaten nennen.

## Historisch verwendete Bereiche

Die folgenden Überschneidungen entstanden vor Einführung dieser Regel und
dürfen nicht als Vorlage für neue Tests dienen:

| Bereich/Geometrie | Testfälle | Status |
|---|---|---|
| X30–35 / Y30–35 | `H-FILL-01`, `H-PASS-01`, `H-RASTER-BW-01` | verbraucht |
| X30–40 bei Y30 | historischer `H-LASER-01` | verbraucht |
| X30–40 bei Y35 | `H-LASER-02` | verbraucht |

## Nächste Reservierung

| Bereich | Zweck | Status |
|---|---|---|
| X50–55 / Y50–55 | nächster neuer 5×5-mm-Hardwaretest | reserviert, noch nicht ausgeführt |

Nach Verwendung wird die Reservierung in „verbraucht“ geändert. Jeder weitere
Test erhält eine neue, nicht überlappende Reservierung.
