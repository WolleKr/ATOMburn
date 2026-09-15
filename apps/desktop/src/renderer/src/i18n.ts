export type Language = "en" | "de";

export const LANGUAGE_STORAGE_KEY = "atomburn-language";

export type TranslationKey =
  | "project" | "newProject" | "openProject" | "save" | "saveAs" | "import"
  | "undo" | "redo" | "previewExport" | "arrange" | "machine" | "device"
  | "motion" | "camera" | "workspaceCamera" | "calibration"
  | "laserTools" | "materialTest" | "materialLibrary" | "intervalTest" | "focusTest" | "planned" | "settings"
  | "language" | "systemDefault" | "english" | "german" | "about"
  | "languageSystem" | "properties" | "layers" | "move" | "inspector" | "projectName" | "workArea"
  | "objects" | "selected" | "layer" | "layersCount" | "processPalette" | "mode" | "speedPower"
  | "passes" | "show" | "hide" | "speed" | "power" | "line" | "fill" | "raster"
  | "fillSettings" | "lineSpacing" | "noAdditionalOperations" | "addLineOperation" | "addFillOperation"
  | "color" | "increasePasses" | "noProjectOpen" | "noLayers" | "text" | "content" | "replacePlaceholder"
  | "font" | "installedFonts" | "sizeMm" | "alignment" | "left" | "center" | "right" | "curveRadius"
  | "straightText" | "radiusClamped" | "rectangle" | "cornerRadius" | "radiusClampedShort"
  | "emptyProject" | "createOrOpen" | "selectedCount" | "delete" | "copy" | "paste" | "duplicate" | "zoom" | "canvasZoom"
  | "editorActions" | "layerColors" | "newProjectNotSaved";


const translations: Record<Language, Record<TranslationKey, string>> = {
  en: {
    project: "Project", newProject: "New project", openProject: "Open project", save: "Save", saveAs: "Save as", import: "Import",
    undo: "Undo", redo: "Redo", previewExport: "Preview & export", arrange: "Arrange", machine: "Machine", device: "Device", motion: "Motion",
    camera: "Camera", workspaceCamera: "Workspace camera", calibration: "Calibration", laserTools: "Laser tools", materialTest: "Material test", materialLibrary: "Material library", intervalTest: "Interval test", focusTest: "Focus test", planned: "planned", settings: "Settings", language: "Language",
    systemDefault: "System default", english: "English", german: "German", about: "About", languageSystem: "Language follows your system by default.",
    properties: "Properties", layers: "Layers", move: "Move", inspector: "Inspector", projectName: "Project name", workArea: "Work area",
    objects: "Objects", selected: "Selected", layer: "layer", layersCount: "layers", processPalette: "Process palette", mode: "Mode", speedPower: "Speed / power",
    passes: "Passes", show: "Show", hide: "Hide", speed: "Speed", power: "Power", line: "Line", fill: "Fill", raster: "Raster",
    fillSettings: "Fill settings", lineSpacing: "Line spacing mm", noAdditionalOperations: "No additional operations", addLineOperation: "Add line operation", addFillOperation: "Add fill operation",
    color: "color", increasePasses: "Increase passes", noProjectOpen: "No project open", noLayers: "No layers", text: "Text", content: "Content", replacePlaceholder: "Click the Text tool, then type here to replace the placeholder.",
    font: "Font", installedFonts: "Showing fonts installed on this computer.", sizeMm: "Size mm", alignment: "Alignment", left: "Left", center: "Center", right: "Right", curveRadius: "Curve radius mm",
    straightText: "0 keeps the text straight; smaller radii are clamped to a valid arc.", radiusClamped: "Radius is clamped to half the shorter side.", rectangle: "Rectangle", cornerRadius: "Corner radius mm", radiusClampedShort: "Radius is clamped to half the shorter side.",
    emptyProject: "Empty project", createOrOpen: "Create a new project or open an existing file.", selectedCount: "selected", delete: "Delete", copy: "Copy", paste: "Paste", duplicate: "Duplicate", zoom: "Zoom", canvasZoom: "Canvas zoom", editorActions: "Editor actions", layerColors: "Layer colors", newProjectNotSaved: "New project · not saved",
  },
  de: {
    project: "Projekt", newProject: "Neues Projekt", openProject: "Projekt öffnen", save: "Speichern", saveAs: "Speichern unter", import: "Importieren",
    undo: "Rückgängig", redo: "Wiederholen", previewExport: "Vorschau & Export", arrange: "Anordnen", machine: "Maschine", device: "Gerät", motion: "Bewegung",
    camera: "Kamera", workspaceCamera: "Arbeitsbereichskamera", calibration: "Kalibrierung", laserTools: "Laserwerkzeuge", materialTest: "Materialtest", materialLibrary: "Materialbibliothek", intervalTest: "Intervalltest", focusTest: "Fokustest", planned: "geplant", settings: "Einstellungen", language: "Sprache",
    systemDefault: "Systemstandard", english: "Englisch", german: "Deutsch", about: "Über", languageSystem: "Die Sprache folgt standardmäßig der Systemsprache.",
    properties: "Eigenschaften", layers: "Ebenen", move: "Bewegen", inspector: "Inspektor", projectName: "Projektname", workArea: "Arbeitsbereich",
    objects: "Objekte", selected: "Ausgewählt", layer: "Ebene", layersCount: "Ebenen", processPalette: "Prozesspalette", mode: "Modus", speedPower: "Geschwindigkeit / Leistung",
    passes: "Durchläufe", show: "Anzeigen", hide: "Ausblenden", speed: "Geschwindigkeit", power: "Leistung", line: "Linie", fill: "Füllung", raster: "Raster",
    fillSettings: "Fülleinstellungen", lineSpacing: "Linienabstand mm", noAdditionalOperations: "Keine weiteren Operationen", addLineOperation: "Linienoperation hinzufügen", addFillOperation: "Fülloperation hinzufügen",
    color: "Farbe", increasePasses: "Durchläufe erhöhen", noProjectOpen: "Kein Projekt geöffnet", noLayers: "Keine Ebenen", text: "Text", content: "Inhalt", replacePlaceholder: "Textwerkzeug auswählen und hier den Platzhalter ersetzen.",
    font: "Schriftart", installedFonts: "Auf diesem Computer installierte Schriftarten.", sizeMm: "Größe mm", alignment: "Ausrichtung", left: "Links", center: "Zentriert", right: "Rechts", curveRadius: "Kurvenradius mm",
    straightText: "0 lässt den Text gerade; kleinere Radien werden auf einen gültigen Bogen begrenzt.", radiusClamped: "Der Radius wird auf die Hälfte der kürzeren Seite begrenzt.", rectangle: "Rechteck", cornerRadius: "Eckenradius mm", radiusClampedShort: "Der Radius wird auf die Hälfte der kürzeren Seite begrenzt.",
    emptyProject: "Leeres Projekt", createOrOpen: "Neues Projekt erstellen oder vorhandene Datei öffnen.", selectedCount: "ausgewählt", delete: "Löschen", copy: "Kopieren", paste: "Einfügen", duplicate: "Duplizieren", zoom: "Zoom", canvasZoom: "Canvas-Zoom", editorActions: "Editoraktionen", layerColors: "Ebenenfarben", newProjectNotSaved: "Neues Projekt · nicht gespeichert",
  },
};

function isLanguage(value: unknown): value is Language { return value === "en" || value === "de"; }

export function languageFromSystem(languages: readonly string[] = typeof navigator === "undefined" ? [] : navigator.languages?.length ? navigator.languages : [navigator.language]): Language {
  return languages.some((language) => language.toLowerCase().startsWith("de")) ? "de" : "en";
}

export function getInitialLanguage(storage: Storage | undefined = typeof localStorage === "undefined" ? undefined : localStorage, systemLanguages?: readonly string[]): Language {
  try {
    const stored = storage?.getItem(LANGUAGE_STORAGE_KEY);
    if (isLanguage(stored)) return stored;
  } catch { /* use the system default when storage is unavailable */ }
  return languageFromSystem(systemLanguages);
}

export function getTranslations(language: Language): Record<TranslationKey, string> { return translations[language]; }

export type Translator = Record<TranslationKey, string>;
