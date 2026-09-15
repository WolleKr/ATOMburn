# ATOMburn-Entwicklung

## Voraussetzungen

- Windows 10 oder Windows 11
- Git
- Node.js 24 oder neuer
- pnpm 11.16.0 entsprechend `packageManager` in `package.json`

## Erster Checkout

```powershell
git clone --recurse-submodules <private-ATOMburn-URL>
Set-Location AtomBurn
pnpm install --frozen-lockfile
pnpm gate:a
```

Bei einem bereits vorhandenen Checkout:

```powershell
pnpm install --frozen-lockfile
pnpm gate:a
```

Upstream-Projekte werden nicht als Submodule oder Checkouts mitgeführt. Ihre
offiziellen Referenzen stehen in [docs/REFERENCES.md](docs/REFERENCES.md).

## Gate A

Ein einziger Befehl führt das vollständig automatische, hardwarelose Gate aus:

```powershell
pnpm gate:a
```

Der aktuelle Gate-A-Lauf prüft damit:

- ESLint,
- die strikte TypeScript-Typprüfung,
- Vitest und JUnit-Ausgabe,
- einen absichtlich fehlschlagenden Reporter-Vertrag,
- die Paketgrenze gegen externe Quellen und Dokumentation,
- lokale Markdown-Links,
- den Produktionsbuild, echten Electron-Start und die UI-Matrix,
- das Laden des nativen Windows-SerialPort-Moduls in Electron, ohne einen Port
  zu öffnen,
- Projektformat, Migration, deterministische Speicherung und Wiederherstellung.

Die Berichte liegen unter `artifacts/test-reports/` und werden nicht in Git
eingecheckt.

## Anwendung starten

Per Doppelklick kann unter Windows auch `ATOMburn-Test.cmd` verwendet werden.
Das Menü startet den Entwicklungsmodus, baut und startet den lokalen
Produktionsstand oder führt Gate A aus. App-Start und Gate A verbinden sich
nicht automatisch mit realer Hardware. Nur der Dialog `Device` kann nach vier
expliziten Gate-B-Bestätigungen eine kurze Read-only-Diagnose auslösen.

Der Dialog `Motion` startet standardmäßig ebenfalls ohne Verbindung. Sein
Simulator ist hardwarelos. Die reale Verbindung benötigt sechs Vor-Ort-
Bestätigungen; die Software erlaubt nur typisierte Sprint-6-Aktionen und keine
frei beschreibbare Konsole.

Entwicklungsmodus ohne vorherigen Build:

```powershell
pnpm dev
```

Produktionsbuild lokal erzeugen und starten:

```powershell
pnpm build
pnpm preview
```

Der Build liegt unter `out/`. Er ist noch kein portabler Release-Ordner und
enthält noch keinen Installer.

## Besonderheit der Codex-Desktop-Laufzeit

Wenn `node` in der Shell nicht gefunden wird, obwohl die gebündelte Laufzeit
vorhanden ist, muss deren `node/bin`-Pfad nur für diesen Prozess vor `pnpm`
in `PATH` aufgenommen werden. Das Projekt selbst enthält bewusst keinen
rechnerspezifischen absoluten Laufzeitpfad.

## Upstream-Status

Die externen Referenzen und ihre Lizenzen stehen in
[docs/REFERENCES.md](docs/REFERENCES.md). Es gibt bewusst keinen lokalen
Upstream-Checkout im Repository.
