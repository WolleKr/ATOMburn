import { describe, expect, it } from "vitest";
import { createProject } from "../../apps/desktop/src/domain/project";
import { createEditorHistory, reduceEditor } from "../../apps/desktop/src/editor/editor-state";

describe("Cut path", () => {
  it("cuts a closed rectangle between two anchors without deleting the figure", () => {
    const base = createProject();
    const project = {
      ...base,
      objects: [{
        id: "rectangle",
        name: "Rectangle",
        layerId: "layer-1",
        type: "rectangle" as const,
        widthMm: 100,
        heightMm: 80,
        cornerRadiusMm: 0,
        transform: [1, 0, 0, 1, 20, 20] as [number, number, number, number, number, number]
      }]
    };
    const selected = reduceEditor(createEditorHistory(project), { type: "select", id: "rectangle" });
    const cut = reduceEditor(selected, { type: "cut-path", objectId: "rectangle", startIndex: 0, endIndex: 1 });

    expect(cut.present.project.objects).toHaveLength(2);
    expect(cut.present.project.objects.every(object => object.type === "path" && !object.closed)).toBe(true);
    expect(cut.present.selectedIds).toHaveLength(2);

    const undone = reduceEditor(cut, { type: "undo" });
    expect(undone.present.project.objects).toHaveLength(1);
    expect(undone.present.project.objects[0]?.type).toBe("rectangle");
  });
});
