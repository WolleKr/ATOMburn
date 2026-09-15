# Sprint 14 — persönlicher Release 1.0 (Offline-Checkliste)

## Offline erledigt

- [x] deterministisches Release-Manifest mit SHA-256: `pnpm release:manifest`
- [x] SHA-256-Manifest des portablen Windows-Builds: `pnpm release:portable-manifest`
- [x] Dependency-/Quelleninventar ohne Secret-Werte: `pnpm release:inventory`
- [x] blockierende Sicherheitsinvarianten: `pnpm release:invariants`
- [x] Simulator- und Offline-Unit-Tests für Line, Fill und Raster
- [x] Backup-/Restore-, Diagnose- und Sicherheitsanleitung
- [x] Release-Build und Artefaktprüfung
- [x] Version `0.14.0` mit festem `H-RASTER-BW-01`-Hardwareworkflow gebaut.
- [x] Portables Paket ohne Reparse Points erzeugt; `sharp` und `serialport`
  direkt aus dem Paket geladen und geprüft.
- [x] Portable `0.14.0`-Ausgabe: 1.598 Dateien, 415.087.334 Bytes,
  Manifest-SHA-256:
  `73A7D03A727488C9543CBBAA74648E6C5D4C89D4E48EC59FC5FD24C58A0B60AA`.

Die Release-Skripte schließen `node_modules`, `out`, `artifacts`, `.git` und
externe Referenzquellen aus. Fremdquellen werden nicht in ein Release-Paket
kopiert.

## Vor Ort erledigt

- [x] Portable Windows-Version normal gestartet.
- [x] Gate B am 27.08.2026 vom Nutzer bestätigt: LaserCam-Verbindung,
  USB-Diagnose, Kameraausrichtung, laserlose Bewegung und Framing, Hold/Abort
  sowie sicherer Recovery-Zustand ohne Auto-Resume.
- [x] Diagnoseexport geprüft: ausschließlich `$I`, `$$`, `$G` und `?`, keine
  Bewegungs- oder Emissionsbefehle, Controller `Idle`, `FS:0,0`.
- [x] Gate C / H-LASER-02 am 28.08.2026 vom Nutzer erfolgreich bestätigt:
  Framing positiv, 10-mm-Line-Referenzjob vollständig ausgeführt. Geprüfter
  Job-SHA-256:
  `f1c128abe651064a0fc0080e1f43928a51854b16ca050de93e912f39dac1d013`.
  Verwendete portable Version: `0.13.0`, EXE-SHA-256:
  `BAB31519EE1BC5B490CAF7844E2B1DBCD4F7BB49A13039103952AB381C02ADE4`.
- [x] Gate C / H-FILL-01 am 28.08.2026 vom Nutzer erfolgreich bestätigt:
  5-mm-Fill-Referenzprojekt, ein Durchgang bei 600 mm/min, 15 Prozent und
  0,5 mm Zeilenabstand vollständig ausgeführt.
- [x] Nutzerentscheidung vom 31.08.2026: `H-LASER-02` und `H-FILL-01` sind
  endgültig bestanden und werden nicht erneut ausgeführt.
- [x] Gate C / `H-RASTER-BW-01` am 01.09.2026 vollständig bestanden:
  Preflight und Checkmodus 182/182, Framing passend, Emissionslauf 182/182,
  Endzustand `Idle` bei X35/Y35 und visuelles Ergebnis ohne Abweichung. Job-
  SHA-256:
  `4ba0a5e51f8b89382844a66bf7a1b26cdce9cc5b93301629c7db213b320676d3`.
- [x] Nutzerregel vom 01.09.2026 dokumentiert: Jeder weitere Emissionstest
  verwendet einen neuen Bereich; X50–55/Y50–55 ist als nächster
  5×5-mm-Bereich reserviert.

## Weiterhin offen

- Gate A: der native Electron-Fenster-Smoke ist auf der aktuellen
  Codex-Windows-Umgebung durch einen Chromium-GPU-Prozessabsturz blockiert
  (`0x80000003`/Exitcode `2147483651`). Die Sandbox wird dafür nicht
  abgeschaltet.
- Aus dem erfolgreichen Rasterlog folgt ein UI-/Zustands-P0 für Sprint 15:
  Während `Job running` blieb der letzte GRBL-Zustand `Idle`, wodurch Hold und
  Stop im Rasterdialog deaktiviert sein können. Vor einem weiteren
  Emissionstest wird dies automatisch korrigiert und geprüft; der bestandene
  Rastertest wird nicht wiederholt.
- Schriftliche persönliche Freigabe des exakt geprüften Builds nach Gate C.

Diese Punkte dürfen nicht durch Simulatoren ersetzt werden.
