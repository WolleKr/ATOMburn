# Sprint 15 capability matrix

This matrix records the behaviour implemented in ATOMburn without copying
LaserWeb4 source code. Any future source reuse requires a separate licence and
provenance review.

| Capability | ATOMburn 0.15 implementation | Boundary |
|---|---|---|
| Select and multi-select | Pointer selection, Ctrl/Shift additive selection, shared bounds | Locked layers cannot be manipulated |
| Move, resize, rotate | Drag, eight resize handles, rotation handle, keyboard movement | Corner resize preserves proportions; Shift enables free resize |
| Rectangle, ellipse and line | Pointer placement with one history commit | Tool activation alone creates no geometry |
| Polygon | Click points, finish by double-click, Enter/button; Escape cancels | Straight segments only |
| Text | Editable text, family, size and alignment; deterministic outline envelope for CAM | No arbitrary system-font outline dependency |
| Node editing | Move, add and delete path nodes | Paths only; no Bézier handles |
| Arrays | Deterministic rectangular and polar duplication | Copies are committed after preview/action |
| Cut | Split an open path at a selected segment | No boolean operations or contour trimming |
| Zoom and rulers | Cursor-centred 100–1000% zoom, aspect-ratio-preserving surface | Document millimetres never change |
| Camera workspace | Pausable snapshot panel with age/offline state | Monitoring only; never changes GRBL state |
| Import | SVG/SVGZ, DXF, LBRN/LBRN2, PNG, JPEG and BMP | Unsupported content remains diagnosed |

Deliberately out of scope: Bézier-handle editing, boolean union/difference,
multi-contour trimming, unrestricted plugin execution, and automatic GitHub
publication.
