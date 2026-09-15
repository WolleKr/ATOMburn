# Sprint 14 Bericht — persönlicher Release 1.0 (Offline-Umfang)

## Umgesetzt

- Deterministisches Release-Manifest mit Dateipfaden, Bytegrößen und SHA-256.
- Dependency-/Quelleninventar aus `package.json` und `pnpm-lock.yaml`; keine
  Secret-Werte werden gelesen oder veröffentlicht.
- Sicherheitsinvarianten für Electron-Isolation, Sandbox, Navigation und
  Fenster-Öffnung als blockierendes Offline-Kommando.
- Vergleichsfunktion für zwei Release-Manifeste zur Reproduzierbarkeitsprüfung.
- Release-/Sicherheitscheckliste und Paritätsmatrix zu LaserWeb4 und MeerK40t.
- Offline-Simulator- und Unit-Testumfang aus Sprint 10–13 bleibt Teil des
  Release-Kandidaten.

## Kommandos

```text
corepack pnpm release:inventory
corepack pnpm release:manifest
corepack pnpm release:invariants
corepack pnpm test:unit tests/sprint14
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
```

Das portable Build-Manifest wird mit `corepack pnpm release:portable-manifest`
erzeugt. Die erzeugten Inventare und Manifeste liegen unter
`artifacts/release/sprint-14/` und sind lokale Prüfartefakte.

## Finaler Offline-Prüfstand

- Release-Inventar, Manifest und Sicherheitsinvarianten: bestanden.
- Sprint-14-Fokustests: 12/12 bestanden.
- Typecheck: bestanden.
- Lint: bestanden.
- Build: bestanden.
- Gesamtsuite: 258/258 Tests in 67 Dateien bestanden.
- Reporter-Vertrag, Paketgrenze, Markdown-Links und Electron-SerialPort-Smoke:
  bestanden.
- Interaktive Browser-QA: App-Titel, sinnvoller Erstinhalt, keine
  Framework-Overlays, keine Console-Warnungen/-Fehler sowie Projektanlage und
  Umbenennung bestanden.

Die Umgebung verwendet Node 24.19.0. Der native Electron-Fenster-Smoke bleibt
auf dieser Codex-Windows-Umgebung blockiert: Chromiums GPU-Prozess beendet sich
mit `0x80000003`/Exitcode `2147483651`. Die App-Sandbox wurde für den Test nicht
abgeschaltet. Der separate Electron-SerialPort-Smoke ist grün.

## Korrekturen aus der Abschlussprüfung

- Windows-Pfade der Release-CLI verwenden jetzt `fileURLToPath`; die früheren
  Pfade der Form `D:\\D:\\...` sind durch einen Regressionstest abgedeckt.
- Source-Manifeste schließen lokale Builds, Caches und temporäre Prüfbäume aus.
- Das Inventar nennt für alle direkten Abhängigkeiten Typ, deklarierte und
  installierte Version sowie Lizenz; Referenzquellen enthalten Präsenz und
  Commit.
- Der Sicherheitscheck erkennt verdächtige Secret-Dateinamen und bekannte
  Token-/Private-Key-Muster blockierend, ohne Werte auszugeben.
- Lint- und Markdown-Link-Prüfung ignorieren generierte Release-/Testbäume.
- Der dokumentierte Sprint-14-Fokustest startet jetzt wirklich nur `tests/sprint14`.
- Der fehlende reale Rasterpfad ist als fester `H-RASTER-BW-01`-Workflow
  ergänzt: unveränderliche 11×11-Pixel-Schwarzweißkarte auf 5×5 mm, 600
  mm/min, 15 Prozent, 0,5 mm Intervall und ein Durchgang. Checkmodus, erneutes
  Homing, laserloses Framing, Liveprofil-Neuprüfung und Jobticket sind vor dem
  einzelnen manuellen Startklick zwingend.
- `sharp` ist jetzt korrekt als Laufzeitabhängigkeit deklariert. Der portable
  Build wird mit physisch kopierten Produktionsabhängigkeiten ohne
  pfadgebundene Windows-Junctions ausgeliefert; der Pakettest lädt `sharp` und
  `serialport` direkt aus der Ausgabe.
- Die App- und Sprintkennung wurde auf `0.14.0` / Sprint 14 angehoben.
- Der generische beaufsichtigte Jobpfad wartet nicht mehr nach jedem einzelnen
  `G1` auf `Idle`. GRBL bestätigt weiterhin jede Zeile, kann Rasterbewegungen
  aber kontinuierlich planen; erst nach defensivem `M5` wird der abschließende
  `Idle`-Zustand mit einem begrenzten Timeout abgewartet. Ein Regressionstest
  schützt dieses Streamingverhalten.

## Parität und bewusste Grenzen

Die relevante X30-Pro-/LaserCam-Funktionsfläche ist abgedeckt: Importe, Line,
Fill, Raster, Dithering/Overscan, GRBL TCP/USB, Kamera/Kalibrierung, Preflight,
Recovery und Diagnose. K40/Ruida/TinyG/Marlin-Treiber, Rotary, vollständige
Mehrgeräte-GUIs und historische LaserWeb-Funktionen werden nicht blind portiert.
Details: `docs/SPRINT-14-PARITY.md`.

## Offene Abnahmen

- Gate B wurde am 27.08.2026 durch den Nutzer als funktionierend bestätigt:
  LaserCam, direkter USB-Diagnoseweg, Kameraausrichtung, laserlose Bewegung und
  Framing, Hold/Abort sowie Recovery ohne Auto-Resume. Der Diagnoseexport zeigt
  ausschließlich `$I`, `$$`, `$G` und `?`, keine Emissionsbefehle und den
  sicheren Zustand `Idle` mit `FS:0,0`.
- Der normale Start der portablen Windows-Version ist damit ebenfalls bestätigt.
- Gate C / H-LASER-02 wurde am 28.08.2026 durch den Nutzer erfolgreich
  abgeschlossen: Framing positiv und der feste 10-mm-Line-Referenzjob
  vollständig ausgeführt. Der geprüfte Job-SHA-256 lautet
  `f1c128abe651064a0fc0080e1f43928a51854b16ca050de93e912f39dac1d013`;
  verwendet wurde die portable Version `0.13.0` mit dem EXE-SHA-256
  `BAB31519EE1BC5B490CAF7844E2B1DBCD4F7BB49A13039103952AB381C02ADE4`.
- Gate C / H-FILL-01 wurde am 28.08.2026 durch den Nutzer erfolgreich
  abgeschlossen: Das feste 5-mm-Fill-Referenzprojekt lief mit einem Durchgang,
  600 mm/min, 15 Prozent und 0,5 mm Zeilenabstand vollständig durch.
- Gate C / `H-RASTER-BW-01` wurde am 01.09.2026 durch den Nutzer erfolgreich
  abgeschlossen. Preflight und Checkmodus bestätigten 182/182 Zeilen für
  X30/Y30 bis X35/Y35 bei 600 mm/min, 15 Prozent (`S150`) und 0,5 mm
  Intervall. Nach passendem laserlosem Framing endete der Emissionslauf mit
  `completed 182/182`, `Idle` bei X35/Y35 und einem visuell vollständig
  erfolgreichen Ergebnis. Der Job-SHA-256 lautet
  `4ba0a5e51f8b89382844a66bf7a1b26cdce9cc5b93301629c7db213b320676d3`.
- Nach Nutzerentscheidung wird ein Materialbereich ab jetzt nur einmal für
  einen Emissionstest verwendet. X30–35/Y30–35 ist verbraucht;
  X50–55/Y50–55 ist als nächster 5×5-mm-Testbereich reserviert. Die
  fortlaufende Belegung steht in `docs/HARDWARE-TEST-FLAECHEN.md`.
- Gate A bleibt ausschließlich wegen des nativen Electron-GPU-Absturzes der
  aktuellen Ausführungsumgebung offen.
- Gate C ist vollständig abgeschlossen. Offen bleibt die schriftliche
  persönliche Freigabe des exakt geprüften Builds.
- Das erfolgreiche Rasterlog zeigt während des laufenden lokalen Jobs den
  letzten GRBL-Zustand weiterhin als `Idle`. Da der Rasterdialog Hold und Stop
  derzeit an `Run`/`Hold` bindet, ist dies als P0-Zustandskorrektur für Sprint
  15 erfasst und vor jedem weiteren Emissionstest automatisch zu schließen.
  Das ändert nicht den bestätigten Abschluss 182/182 und erfordert keine
  Wiederholung von `H-RASTER-BW-01`.
- Der neue portable Kandidat liegt unter `output/ATOMburn-0.14.0-win-x64`.
  Sein Manifest enthält 1.598 Dateien und 415.087.334 Bytes; der
  Manifest-SHA-256 lautet
  `73A7D03A727488C9543CBBAA74648E6C5D4C89D4E48EC59FC5FD24C58A0B60AA`.
  Der Nutzer hat am 31.08.2026 entschieden, die mehrfach erfolgreich geprüften
  Tests `H-LASER-02` und `H-FILL-01` nicht erneut auszuführen. Auch der am
  01.09.2026 erfolgreich abgeschlossene Rastertest wird nicht wiederholt.
- Es wurde keine Laseremission durch einen Agenten ausgelöst. Der Playwright-
  Lauf erreichte alle 21 Fälle ohne sichtbaren Assertion-Fehler, beendete den
  Runner in dieser Umgebung jedoch nicht selbstständig; deshalb wird er nicht
  als vollständig sauberer Gate-A-Pass gewertet.
