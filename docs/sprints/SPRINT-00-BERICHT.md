# Sprint-00-Testbericht

## Identität

- Sprint: 0 — Regeln, Quellen und Testfundament
- Datum: 12. August 2026
- ATOMburn-Commit: noch kein Initial-Commit zum Zeitpunkt des Gate-Laufs
- Build-ID: `uncommitted-dirty`
- Node/pnpm: Node.js 24.14.0, pnpm 11.16.0
- Betriebssystem: Windows

## Umfang

- getestet: Workspace, Entwicklungsbefehle, Referenz-Submodule, Testreporter,
  Paketgrenze, Markdown-Links und leerer Buildpunkt
- bewusst nicht getestet: App, UI, GRBL, Netzwerk, USB und reale Hardware
- Hardware-Gate: A

## Befehle und Ergebnisse

| Befehl/Test | Ergebnis | Bericht/Artefakt |
|---|---|---|
| `pnpm lint` | bestanden | Konsolenausgabe |
| `pnpm typecheck` | bestanden; noch kein TypeScript-Produktcode | Konsolenausgabe |
| `pnpm test:unit` | 5/5 Tests bestanden | `artifacts/test-reports/sprint-00/current/junit.xml` |
| `pnpm test:reporter-contract` | bestanden; absichtlicher Fehlschlag erzeugt Fehlerstatus und JUnit | `artifacts/test-reports/sprint-00/reporter-contract/junit.xml` |
| `pnpm test:package-boundary` | bestanden; 3 Dateien, keine Upstream-Quellen | `artifacts/package-probes/sprint-00/package-manifest.json` |
| `pnpm test:links` | bestanden | Konsolenausgabe |
| `pnpm build` | bestanden; Sprint-0-Platzhalter | Konsolenausgabe |
| `pnpm gate:a` | vollständig bestanden | Kombination der obigen Ergebnisse |

Der erste Gate-Aufruf stoppte vor den Tests, weil die gebündelte Node-Laufzeit
in der Codex-Desktop-Shell nicht im `PATH` lag. Nach Aufnahme des bereits
vorhandenen gebündelten Node-Pfads wurde derselbe unveränderte Gate-Befehl
vollständig erfolgreich ausgeführt. Kein Test wurde übersprungen.

## Sicherheits- und Negativtests

- Upstream-Quellen sind durch die Package-Allowlist ausgeschlossen.
- Beide Referenz-Checkouts sind vorhanden, sauber und an 40-stellige Commits
  gebunden.
- LaserWeb4 bleibt eine getrennte AGPL-Referenz und wird nicht importiert.
- Der absichtlich rote Fixture-Test bestätigt Berichterstellung auch bei
  Fehlschlägen.
- Es existiert noch kein Maschinen- oder Laserzugriff.

## Hardwaretest

- Test-ID: nicht erforderlich
- Nutzerfreigabe: nicht erforderlich
- Ergebnis/Messwerte: keine Hardware verwendet
- Transcript/Log-ID: nicht zutreffend

## Offene Risiken und Einschränkungen

- GitHub-CLI ist noch nicht angemeldet; das private Remote-Repository konnte
  deshalb noch nicht erstellt oder gepusht werden.
- MeerK40t ist ein flacher Checkout; der festgehaltene Commit ist lokal
  vorhanden und wird als Git-Submodule referenziert.
- Typprüfung und echter Anwendungsbuild beginnen planmäßig in Sprint 1.

## Entscheidung

- Gate bestanden: ja
- Sprint-0-Funktionsumfang: lokal erfüllt
- ausstehende externe Aufgabe: privates GitHub-Repository nach `gh auth login`
  erstellen und Initial-Commit pushen
- nächster erlaubter Entwicklungsschritt: Sprint 1 erst nach Sicherung des
  Initial-Commits

