# Sprint 14 — Hardwareprüfung für ATOMburn 0.14.0

## Testkandidat

- Portable App: `output/ATOMburn-0.14.0-win-x64/ATOMburn.exe`
- Projekt: `tests/fixtures/projects/h-raster-bw-01.atomburn`
- Testfall: `H-RASTER-BW-01`
- Fläche: 5 × 5 mm bei X30/Y30
- Parameter: Threshold, 600 mm/min, 15 Prozent, 0,5 mm Intervall, ein Durchgang

## Ablauf

1. Projekt öffnen und `Raster reference test` anklicken.
2. Die Schaltflächen 1 bis 6 der Reihe nach ausführen.
3. Prüfen, dass das Framing vollständig auf dem Material liegt.
4. `7 · Rahmen passt – Rastertest starten` selbst anklicken.
5. Nach Abschluss Workflowstatus und Werkstück prüfen.

Der Dialog verlangt keine Checkbox und keine Texteingabe. Vor Schritt 7 wird
kein Emissionsjob gesendet.

## Erwartetes Ergebnis

- quadratische 5×5-mm-Schwarzweiß-Testkarte,
- klar erkennbare dunkle Außenbereiche und diagonale Strukturen,
- gleichmäßige bidirektionale Zeilen ohne sichtbaren Zeilenversatz,
- keine Gravur außerhalb des zuvor abgefahrenen Rahmens,
- Jobstatus `completed` und Controllerstatus `Idle`,
- Laserleistung nach dem Job aus.

## Verbleibende Abnahme

`H-LASER-02` und `H-FILL-01` sind nach Nutzerentscheidung endgültig bestanden
und werden nicht wiederholt.

## Ergebnis vom 1. September 2026

`H-RASTER-BW-01` wurde durch den Nutzer vollständig ausgeführt und visuell als
erfolgreich bestätigt:

- Preflight: X30/Y30 bis X35/Y35, 600 mm/min, 15 Prozent (`S150`), 0,5 mm
  Intervall, 182 Zeilen und circa 5,97 Sekunden,
- Maschinenprofil: `$30=1000`, `$32=1`, `$130=400`, `$131=400`,
- Job-SHA-256:
  `4ba0a5e51f8b89382844a66bf7a1b26cdce9cc5b93301629c7db213b320676d3`,
- Checkmodus: `completed 182/182`, danach `Idle`,
- laserloses Framing durch den Nutzer als passend bestätigt,
- Emissionslauf: `completed 182/182`, Endzustand `Idle` bei X35/Y35,
- visuelle Prüfung: vollständig erfolgreich, keine gemeldete Abweichung.

Der Bereich X30–35/Y30–35 ist verbraucht und darf nicht erneut verwendet
werden. Für den nächsten neuen 5×5-mm-Test ist X50–55/Y50–55 reserviert. Die
verbindliche Belegung steht in
[`HARDWARE-TEST-FLAECHEN.md`](HARDWARE-TEST-FLAECHEN.md).
