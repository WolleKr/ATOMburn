# ATOMburn

ATOMburn is a private Windows application for preparing, simulating, and
executing laser jobs on exactly one device chain: **Windows PC -> Wi-Fi ->
Mintion LaserCam V2 -> USB -> ATOMSTACK X30 Pro**.

The deliberate restriction to a GRBL laser is intended to make ATOMburn
smaller, easier to understand, and more robust than a general-purpose
LightBurn alternative. The current development version is ATOMburn 0.16.7
(Sprint 16). It contains a launchable Electron app, the local `.atomburn`
project format, direct editing and import workflows, LaserCam TCP/MJPEG
monitoring, direct USB diagnostics, material workflows, CAM preview/export,
camera calibration, and guarded machine-control workflows.

Sprint 6 added strictly limited, laser-off machine control; Sprint 7 added the
document editor and import; Sprint 8 added deterministic line/score toolpaths;
Sprint 9 added the local, supervised one-time job with an immutable G-code
fingerprint; and Sprints 10–16 added fill and raster CAM, recovery diagnostics,
direct canvas interaction, material tests, lens calibration, and automatic bed
marker detection. The real H-LASER-02 test was confirmed by the user present
with `$30=1000`, `S200`, and 600 mm/min as a visible 10 mm line; the final
homing operation was completed.

Sprint 10 adds project format V3, editable fill operations, deterministic
bidirectional even-odd scanlines with holes and islands, multiple passes,
conservative path planning, preview, golden files, and strict resource and
boundary limits. A dedicated supervised fill dialog accepts only 600 mm/min,
15%, a maximum area of 10 × 10 mm, and exactly one or two passes for the first
real tests. Homing, laser-off framing, a live profile, SHA-256, an exact start
phrase, and a manual user start are mandatory. The real Sprint 10 gates are not
run automatically and each require separate approval at the device.

## Implemented Application Capabilities

### Projects, imports, and editing

- Create, open, save, and save-as V3 `.atomburn` projects with legacy-version
  migration and recovery from backup or recovery copies.
- Import SVG/SVGZ, DXF, LightBurn `.lbrn`/`.lbrn2`, PNG, JPEG, and BMP files,
  while preserving layers and reporting unsupported or malformed content.
- Edit a 400 × 400 mm canvas with rulers, coordinates, software-home display,
  and cursor-centred zoom from 100% to 1000%.
- Select and multi-select objects, drag, resize, rotate, move with the keyboard,
  and use undo, redo, copy, paste, duplicate, and delete.
- Draw rectangles, rounded rectangles, ellipses, lines, polygons, and text.
- Edit path nodes, split or cut paths, and create rectangular, circular, or
  path-based arrays.
- Edit text content, installed font, size, alignment, and curve radius; edit
  rectangle corner radii.
- Group, ungroup, align, distribute, mirror, rotate, scale, reorder, lock, and
  unlock objects; move selections to the origin or bed centre and create
  selection outlines.

### Operations, CAM, and materials

- Configure independent line, fill, and raster/image operations per layer,
  including speed, power, visibility, colour, passes, and fill spacing.
- Generate deterministic vector paths and even-odd fill scanlines with holes,
  islands, multiple passes, bounded resources, and conservative path planning.
- Process raster images with threshold, grayscale, or Floyd–Steinberg dithering,
  configurable interval, and bounded command counts.
- Preview toolpaths, bounds, estimated duration, power, and generated G-code;
  validate safe headers, footers, controller limits, and machine bounds before
  export as `.gc` or `.nc`.
- Open LightBurn `.clb` material libraries and native ATOMburn material-library
  JSON, save native libraries, and assign presets to layers.
- Generate supervised material-test grids for wood, stone, acrylic, plywood,
  leather, or a custom material, and use the included cutting and engraving
  templates.

### Camera, connection, and machine control

- View, pause, reload, and enlarge LaserCam V2 snapshots independently from
  GRBL state, with stale/offline status and software-stop controls.
- Export printable lens and bed-alignment targets; capture eight lens-target
  views, detect the 44 circles, calculate lens distortion, and persist the
  resulting camera calibration.
- Detect five bed markers automatically, review quality, manually correct,
  accept or discard proposals, reject stale snapshots, and save verified
  camera-to-bed alignment with RMS and maximum-error limits.
- Connect through LaserCam TCP or direct USB/serial diagnostics, use an offline
  GRBL simulator, store a local device profile, enumerate ports, inspect
  transcripts, and export redacted diagnostics.
- Home, unlock, use Check mode, jog in 1 mm steps, frame 10 × 10 mm or
  40 × 40 mm without laser emission, move the laser to a selected-object centre,
  and use Hold, Resume, Stop, and Abort.
- Run guarded H-LASER-02, H-CAM-MARK-01, H-FILL-01/H-PASS-01,
  H-RASTER-BW-01, and H-MATERIAL-01 workflows with fresh preflight, SHA-256
  fingerprints, safety acknowledgements, laser-off framing, and a manual start.
- Recover from connection loss, sleep/wake, network changes, timeouts, alarms,
  and renderer failures without automatic job resume.

### Application features

- English and German interface selection with persisted preference.
- About dialog with platform, architecture, version, and repository actions.
- Central error reports with copyable details and explicit user-triggered issue
  handoff.
- Keyboard shortcuts, status and progress feedback, and reduced-motion-aware
  startup splash screen.

## Disclaimer

ATOMburn is provided as development and utility software without any guarantee
of particular suitability, availability, or freedom from defects. The software
may contain motion, communication, or output problems and is not a safety
control, protective device, or guarantee of any particular result.

Responsibility for the machine, workpiece, material, settings, working
environment, and compliance with all applicable regulations remains with the
user at all times. Before every job, the specific machine type, firmware state,
coordinates, focus, power, speed, material compatibility, and extraction must
be checked in particular. Unknown materials or parameters must first be tested
in a safe, supervised test.

An ATOMSTACK X30 Pro is a Class 4 laser system. Suitable enclosure, laser
protection, fire protection, ventilation or extraction, and a physical
emergency stop that is accessible at all times are required. The room must not
be left during a job. A software stop, preview, camera image, or successful
previous execution never replaces the manufacturer's operating instructions,
your own safety inspection, or the physical emergency stop.

By using ATOMburn, the user assumes responsibility for the risks of injury,
fire, smoke and material damage, machine damage, data loss, and damage to third
parties. To the extent permitted by law, the authors and contributors are not
liable for damage or loss resulting from use of, misuse of, or reliance on the
software. If anything is uncertain, do not start the job and consult a
qualified professional or the machine manufacturer.

The development environment and the completely hardware-free Gate A are
described in [DEVELOPMENT.md](DEVELOPMENT.md). The current status is documented
in the reports for [Sprint 4](docs/sprints/SPRINT-04-BERICHT.md) and
[Sprint 5](docs/sprints/SPRINT-05-BERICHT.md), as well as the
[Sprint 6 report](docs/sprints/SPRINT-06-BERICHT.md) and
[Sprint 7 report](docs/sprints/SPRINT-07-BERICHT.md).

## Repeatable Motion Test

[`ATOMburn-Bewegungstest.cmd`](ATOMburn-Bewegungstest.cmd) starts the fixed,
laser-off Gate B acceptance run. After an exact safety confirmation, the test
homes the machine and moves a closed 40 × 40 mm square at 300 mm/min. Only the
subsequent visual confirmation marks the run as passed; the machine-readable
log is stored locally under `artifacts/hardware-acceptance/`. Real hardware is
never addressed from Gate A.

## Current Recommendation

For the first prototype, a **TypeScript/React desktop client with a local Node
process** is the most attractive option. The Node process provides the TCP
connection and MJPEG camera stream for the LaserCam; direct serial access
remains a diagnostic fallback. This allows us to evaluate and, if appropriate,
reuse parts of the MIT-licensed
[LaserFlow](https://github.com/praegustator/laserflow). LaserFlow already has:

- SVG and PNG workflows,
- operations per layer,
- G-code generation and preview,
- a job queue,
- GRBL status processing,
- serial port access with `serialport` as a model for the transport interface,
- buffered GRBL streaming for the 127-byte receive buffer.

For the LaserCam, LaserFlow's serial transport will not be adopted unchanged;
it will instead be supplemented or replaced by a TCP transport on the same
GRBL interface.

The second main technical reference is
[MeerK40t](https://github.com/meerk40t/meerk40t). Its Python code will not form
the foundation of the TypeScript interface, but it provides proven concepts,
algorithms, and test cases for GRBL over TCP, CutPlan/CutCode, raster paths,
geometry, path optimization, and camera calibration.

Alternatively, a fork of the also MIT-licensed
[Rayforge](https://github.com/barebaric/rayforge) should be evaluated. Rayforge
is much more extensive, but is based on Python/GTK4 and therefore brings more
technology and complexity than AtomBurn needs for a single laser.

A final stack decision will be made only after the hardware spike.

ATOMburn is deliberately informed by currently available laser-software
solutions and their documented workflows. LightBurn is used as the practical
feature benchmark, while LaserFlow, MeerK40t, and Rayforge provide reference
points for GRBL communication, CAM, raster paths, geometry, path optimization,
camera calibration, and machine workflows. ATOMburn implements its own bounded
TypeScript/Electron architecture; this orientation does not imply unreviewed
source-code reuse.

## Documentation

1. [Goals and Scope](https://github.com/WolleKr/ATOMburn/blob/main/docs/01-ZIELBILD.md)
2. [LightBurn Feature Analysis](https://github.com/WolleKr/ATOMburn/blob/main/docs/02-LIGHTBURN-FUNKTIONEN.md)
3. [ATOMSTACK X30 Pro](https://github.com/WolleKr/ATOMburn/blob/main/docs/03-ATOMSTACK-X30-PRO.md)
4. [GRBL Communication](https://github.com/WolleKr/ATOMburn/blob/main/docs/04-GRBL-KOMMUNIKATION.md)
5. [Proposed Architecture](https://github.com/WolleKr/ATOMburn/blob/main/docs/05-ARCHITEKTUR.md)
6. [CAM, Rasterization, and G-Code](https://github.com/WolleKr/ATOMburn/blob/main/docs/06-CAM-UND-GCODE.md)
7. [Open-Source Projects](https://github.com/WolleKr/ATOMburn/blob/main/docs/07-OPEN-SOURCE-PROJEKTE.md)
8. [Library Candidates](https://github.com/WolleKr/ATOMburn/blob/main/docs/08-BIBLIOTHEKEN.md)
9. [Roadmap](https://github.com/WolleKr/ATOMburn/blob/main/docs/09-ROADMAP.md)
10. [Safety](https://github.com/WolleKr/ATOMburn/blob/main/docs/10-SICHERHEIT.md)
11. [Licenses and Reuse Rules](https://github.com/WolleKr/ATOMburn/blob/main/docs/11-LIZENZEN.md)
12. [Hardware and Test Plan](https://github.com/WolleKr/ATOMburn/blob/main/docs/12-TESTPLAN.md)
13. [Open Questions and Required Data](https://github.com/WolleKr/ATOMburn/blob/main/docs/13-OFFENE-FRAGEN.md)
14. [Mintion LaserCam V2](https://github.com/WolleKr/ATOMburn/blob/main/docs/14-MINTION-LASERCAM-V2.md)
15. [MeerK40t Analysis and Reuse](https://github.com/WolleKr/ATOMburn/blob/main/docs/15-MEERK40T-ANALYSE.md)
16. [Binding Development Plan with Sprints and Test Gates](https://github.com/WolleKr/ATOMburn/blob/main/docs/16-DEV-PLAN.md)
17. [Project Format](https://github.com/WolleKr/ATOMburn/blob/main/docs/17-PROJEKTFORMAT.md)
18. [Import Formats](https://github.com/WolleKr/ATOMburn/blob/main/docs/18-IMPORT-FORMATE.md)
19. [Offline GRBL Core](https://github.com/WolleKr/ATOMburn/blob/main/docs/19-GRBL-KERN.md)
20. [Connection Diagnostics](https://github.com/WolleKr/ATOMburn/blob/main/docs/20-VERBINDUNGSDIAGNOSE.md)
21. [Safe Machine Control](https://github.com/WolleKr/ATOMburn/blob/main/docs/21-MASCHINENSTEUERUNG.md)

## Open-source references and licensing

ATOMburn is released under the [MIT License](LICENSE). Runtime dependency
licenses and notices are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

ATOMburn does not bundle the referenced LaserWeb4 or MeerK40t applications.
They are external technical references only; their official repositories and
licenses are documented in [docs/REFERENCES.md](docs/REFERENCES.md). Reference
links do not grant permission to copy source code, assets, documentation, or
trademarks.

ATOMburn is not affiliated with, sponsored by, or endorsed by ATOMSTACK,
Mintion, LaserCam, LightBurn, LaserWeb4, MeerK40t, or the other referenced
projects. Product names are used only to describe compatibility or references.

## Important

The X30 Pro is a Class 4 laser. ATOMburn must not bypass the machine's safety
measures. A software stop never replaces the physical emergency stop. Jobs must
be supervised.

Research status: **August 12, 2026**.
