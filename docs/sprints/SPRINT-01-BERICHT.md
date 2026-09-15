# Sprint-01-Testbericht

## Identität

- Sprint: 1 — Desktop-Skelett und Startbild
- Datum: 12. August 2026
- ATOMburn-Commit beim Gate-Lauf: Arbeitsstand nach Sprint 0
- Build-ID beim Gate-Lauf: `uncommitted-dirty`
- Node/pnpm: Node.js 24.14.0, pnpm 11.16.0
- Betriebssystem: Windows

## Umfang

- getestet: Electron-/TypeScript-/React-Skelett, Prozessgrenzen, minimale IPC,
  Start-, Haupt-, Fehler- und About-Ansicht, Splash, Icon, Produktionsbuild und
  Paketgrenze
- bewusst nicht getestet: GRBL, Netzwerk, Mintion LaserCam V2, Kamera, USB,
  Maschinenbewegung und Laseremission
- Hardware-Gate: A

## Befehle und Ergebnisse

| Befehl/Test | Ergebnis | Bericht/Artefakt |
|---|---|---|
| `pnpm lint` | bestanden | Konsolenausgabe |
| `pnpm typecheck` | bestanden, strikter TypeScript-Build | Konsolenausgabe |
| `pnpm test:unit` | 11/11 Tests bestanden | `artifacts/test-reports/sprint-01/current/junit.xml` |
| `pnpm build` | bestanden; Main, sandbox-kompatibler Preload, Renderer und acht Icongrößen erzeugt | `out/` (nicht versioniert) |
| `pnpm test:electron` | bestanden; echter Electron-Start mit Renderer-Handshake und sauberem Ende | Konsolenausgabe |
| `pnpm test:e2e` | 12/12 Tests bestanden; 100 %, 150 %, 200 % und Mindestfenster | `artifacts/test-reports/sprint-01/current/screenshots/` |
| In-App-Browser-QA | 1440 × 900, kein Overflow, keine Warnungen/Fehler, About und Inspector bedienbar | `iab-main-window.png`, `iab-splash.png` |
| `pnpm gate:a` | vollständig bestanden | Gesamtlauf |

## Sicherheits- und Negativtests

- `contextIsolation`, Renderer-Sandbox und `webSecurity` sind aktiv;
  `nodeIntegration` ist deaktiviert.
- Der sandboxfähige Preload exportiert ausschließlich `getAppInfo()` und
  `rendererReady()`; es gibt keine generische IPC-Sendefunktion.
- Neue Fenster, Webviews und Fremdnavigation sind gesperrt.
- Der Renderer besitzt keinen direkten Node-, Dateisystem- oder Shell-Zugriff.
- Ein absichtlich ausgelöster React-Fehler landet in der lokalen Fehleransicht.
- Sprint-1-Quellen enthalten keine seriellen, TCP-, Maschinen- oder
  Emissionskanäle.
- Das Probe-Paket darf weder `third_party` noch Dokumentationsquellen aufnehmen.

## Hardwaretest

- Test-ID: nicht erforderlich
- Nutzerfreigabe: nur visuelle Abnahme ausstehend
- Ergebnis/Messwerte: keine Hardware verwendet
- Transcript/Log-ID: nicht zutreffend

## Offene Risiken und Einschränkungen

- Der Sprint erzeugt noch kein installierbares MSIX/Setup; das ist nicht Teil
  des Sprint-1-Umfangs.
- Der Renderer-Bundle-Hinweis zur Chunkgröße ist für das kleine private
  Grundgerüst nicht blockierend und wird vor funktionsreichen Sprints durch
  Code-Splitting bearbeitet.
- Windows-Fensterknöpfe sind nur im echten Electron-Fenster sichtbar und daher
  nicht im Browser-Vergleichsbild enthalten.
- Motiv, Lichtwirkung, Icon und Startverhalten benötigen die persönliche
  visuelle Freigabe des Nutzers.

## Entscheidung

- Gate bestanden: ja
- maschinensicherer Sprint-1-Funktionsumfang: implementiert
- nächster erlaubter Schritt nach Gate und visueller Freigabe: Sprint 2 —
  Domänenmodell und Projektformat, weiterhin ohne Maschinensteuerung
