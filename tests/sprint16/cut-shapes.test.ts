import { describe, expect, it } from "vitest";
import { createProject, type ProjectDocument } from "../../apps/desktop/src/domain/project.js";
import { applyCutShapes, validateCutShapes } from "../../apps/desktop/src/editor/cut-shapes.js";
import { createEditorHistory, reduceEditor } from "../../apps/desktop/src/editor/editor-state.js";

const layer = { id: "layer-1", name: "Layer 1", visible: true, locked: false, color: "#68c5e8" } as const;

function project(objects: ProjectDocument["objects"], operations: ProjectDocument["operations"] = []): ProjectDocument {
  return { ...createProject(), layers: [layer], objects, operations };
}

function path(id: string, pointsMm: Array<[number, number]>, closed = false, extra: Record<string, unknown> = {}) {
  return { id, name: id, layerId: layer.id, type: "path" as const, closed, pointsMm, transform: [1, 0, 0, 1, 0, 0] as [number, number, number, number, number, number], ...extra };
}

function cutter(id = "cutter") {
  return path(id, [[40, 30], [60, 30], [60, 50], [40, 50]], true);
}

describe("Cut Shapes", () => {
  it("uses the last selected closed vector and creates inside/outside groups", () => {
    const document = project([path("line", [[0, 40], [100, 40]]), cutter()]);
    const result = applyCutShapes({ project: document, selectedIds: ["line", "cutter"], selectionOrder: ["line", "cutter"] });
    expect(result.project.objects).toHaveLength(3);
    expect(result.project.objects.some((object) => object.id === "cutter")).toBe(false);
    expect(new Set(result.project.objects.map((object) => object.groupId)).size).toBe(2);
    expect(result.selectedIds).toHaveLength(3);
  });

  it("keeps an outside target unchanged apart from its result group", () => {
    const document = project([path("line", [[0, 0], [10, 0]]), cutter()]);
    const result = applyCutShapes({ project: document, selectedIds: ["line", "cutter"] });
    expect(result.project.objects).toHaveLength(1);
    expect(result.project.objects[0]).toMatchObject({ id: "line", pointsMm: [[0, 0], [10, 0]], groupId: result.outsideGroupId });
  });

  it("handles one crossing, endpoint contact, and duplicate vertex intersections", () => {
    const oneCrossing = applyCutShapes({ project: project([path("line", [[50, 40], [100, 40]]), cutter()]), selectedIds: ["line", "cutter"] });
    expect(oneCrossing.project.objects).toHaveLength(2);
    const endpointContact = applyCutShapes({ project: project([path("line", [[0, 30], [40, 30]]), cutter()]), selectedIds: ["line", "cutter"] });
    expect(endpointContact.project.objects[0]).toMatchObject({ id: "line", pointsMm: [[0, 30], [40, 30]] });
    const duplicate = applyCutShapes({ project: project([path("line", [[0, 40], [40, 40], [100, 40]]), cutter()]), selectedIds: ["line", "cutter"] });
    expect(duplicate.project.objects).toHaveLength(3);
  });

  it("closes fragments for a fill operation and leaves line fragments open", () => {
    const fillDocument = project([path("shape", [[0, 40], [100, 40]], false), cutter()], [{ id: "fill-1", name: "Fill", kind: "fill", objectIds: ["shape"], enabled: true, speedMmPerMin: 1000, powerPercent: 10, passes: 1, lineSpacingMm: 0.1 }]);
    const fillResult = applyCutShapes({ project: fillDocument, selectedIds: ["shape", "cutter"] });
    expect(fillResult.project.objects.every((object) => object.type === "path" && object.closed)).toBe(true);
    const lineDocument = project([path("shape", [[0, 40], [100, 40]], false), cutter()]);
    const lineResult = applyCutShapes({ project: lineDocument, selectedIds: ["shape", "cutter"] });
    expect(lineResult.project.objects.every((object) => object.type === "path" && !object.closed)).toBe(true);
  });

  it("rejects open, grouped, and raster cutters without changing the document", () => {
    const open = path("cutter", [[40, 30], [60, 30], [60, 50]], false);
    expect(validateCutShapes({ project: project([path("line", [[0, 40], [100, 40]]), open]), selectedIds: ["line", "cutter"] }).valid).toBe(false);
    const grouped = { ...cutter(), groupId: "group-1" };
    expect(validateCutShapes({ project: project([path("line", [[0, 40], [100, 40]]), grouped]), selectedIds: ["line", "cutter"] }).valid).toBe(false);
    const raster = { id: "cutter", name: "raster", layerId: layer.id, type: "raster" as const, widthMm: 10, heightMm: 10, mimeType: "image/png" as const, dataBase64: "AAAA", transform: [1, 0, 0, 1, 0, 0] as [number, number, number, number, number, number] };
    expect(validateCutShapes({ project: project([path("line", [[0, 40], [100, 40]]), raster]), selectedIds: ["line", "cutter"] }).valid).toBe(false);
  });

  it("explains that a lone closed cutter needs target vectors", () => {
    const validation = validateCutShapes({ project: project([cutter()]), selectedIds: ["cutter"] });
    expect(validation.message).toBe("Select one or more target vectors, then select this closed cutter last.");
  });

  it("records Cut Shapes as one undoable transaction and restores selection on undo/redo", () => {
    const history = createEditorHistory(project([path("line", [[0, 40], [100, 40]]), cutter()]));
    const selected = reduceEditor(reduceEditor(history, { type: "select", id: "line" }), { type: "select", id: "cutter", additive: true });
    const cut = reduceEditor(selected, { type: "cut-shapes" });
    expect(cut.past).toHaveLength(1);
    const undone = reduceEditor(cut, { type: "undo" });
    expect(undone.present.project.objects.map((object) => object.id)).toEqual(["line", "cutter"]);
    expect(undone.present.selectionOrder).toEqual(["line", "cutter"]);
    const redone = reduceEditor(undone, { type: "redo" });
    expect(redone.present.project.objects.some((object) => object.id === "cutter")).toBe(false);
  });
});
