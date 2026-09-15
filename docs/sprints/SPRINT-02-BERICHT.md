# Sprint-02-Testbericht

## Identität

- Sprint: 2 — Domänenmodell und Projektformat
- Datum: 12. August 2026
- Ausgangscommit: `2edfd664c68f4caad9cc8e8d8d2eab4dc69449d7`
- Build-ID beim Entwicklungslauf: `uncommitted-dirty`
- Node/pnpm: Node.js 24.14.0, pnpm 11.16.0
- Betriebssystem: Windows

## Umfang

- getestet: Dokument-, Objekt-, Layer- und Operationsmodell, Millimetereinheit,
  X30-Pro-Profil, Verbindungsprofiltypen, Format v2, v1-Migration,
  deterministische Serialisierung, atomare Speicherung, Backup-/Recovery-Pfad,
  sichere IPC und New/Open/Save/Save-as-Oberfläche
- bewusst nicht getestet: CAM, G-Code, TCP, Kamera, USB-Portzugriff,
  Maschinenbewegung und Laseremission
- Hardware-Gate: A

## Befehle und Ergebnisse

| Befehl/Test | Ergebnis | Bericht/Artefakt |
|---|---|---|
| `pnpm lint` | bestanden | Konsole |
| `pnpm typecheck` | bestanden | Konsole |
| `pnpm test:unit` | 25 Tests einschließlich 1.000 Property-Fälle vorgesehen | `artifacts/test-reports/sprint-02/current/junit.xml` |
| `pnpm build` | bestanden | `out/` |
| `pnpm test:electron` | echter Electron-Start bestanden | Konsole |
| `pnpm test:e2e` | 12/12 nach Regressionstest bestanden | Sprint-02-Screenshots |
| In-App-Browser | 1440 × 900 und 1024 × 680; keine Warnungen, kein Overflow | Laufzeit-Screenshots |
| `pnpm gate:a` | vollständig bestanden | Gesamtlauf |

## Sicherheits- und Negativtests

- beschädigtes, unvollständiges, zu großes und unbekannt versioniertes JSON
  wird abgelehnt.
- NaN/unendliche Werte, falsche Einheiten, unbekannte Referenzen, doppelte IDs,
  absolute Pfade und Zugangsdatenfelder werden blockiert.
- Der Renderer besitzt weiterhin keinen Datei-, Shell-, Socket- oder
  Serialzugriff.
- IPC akzeptiert nur feste Projektaktionen; der Hauptprozess validiert jedes
  zu speichernde Projekt erneut.
- Ein beschädigtes Primärprojekt wird aus gültiger Recovery- oder Backup-Datei
  geöffnet und als Wiederherstellung gekennzeichnet.
- Ein UI-Regressionsfall `Operations -> New project` wurde gefunden und durch
  automatisches Umschalten auf `Properties` behoben.

## Hardwaretest

- Test-ID: nicht erforderlich
- Nutzerfreigabe: lokaler Dateidialog-Test ausstehend
- Ergebnis/Messwerte: keine Hardware verwendet
- Transcript/Log-ID: nicht zutreffend

## Offene Risiken und Einschränkungen

- Die 410 × 400 mm bleiben bis zu einem späteren Hardware-Gate unbestätigt.
- Das Format kennt Modellobjekte, der grafische Editor folgt erst in Sprint 7.
- Importierte Bilddaten und relative Asset-Referenzen sind noch nicht Teil des
  Formats.
- Ein installierbarer oder portabler Release-Ordner ist weiterhin nicht Teil
  dieses Sprints.

## Entscheidung

- Gate bestanden: ja
- nächster erlaubter Schritt nach Gate und lokalem Nutzertest: Sprint 3 —
  vollständig offline testbarer GRBL-Kern und Simulator
