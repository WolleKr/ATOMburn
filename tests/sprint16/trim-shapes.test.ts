import { describe, expect, it } from "vitest";
import { createProject } from "../../apps/desktop/src/domain/project";
import { createEditorHistory, reduceEditor } from "../../apps/desktop/src/editor/editor-state";

describe("Trim Shapes", () => {
  it("removes one intersecting segment and preserves the rest of a rectangle", () => {
    const base = createProject();
    const project = {
      ...base,
      objects: [
        { id: "target", name: "Target", layerId: "layer-1", type: "rectangle" as const, widthMm: 100, heightMm: 80, cornerRadiusMm: 0, transform: [1, 0, 0, 1, 20, 20] as [number, number, number, number, number, number] },
        { id: "crossing", name: "Crossing", layerId: "layer-1", type: "path" as const, closed: false, pointsMm: [[70, 10], [70, 120]] as Array<[number, number]>, transform: [1, 0, 0, 1, 0, 0] as [number, number, number, number, number, number] }
      ]
    };
    const history = createEditorHistory(project);
    const trimmed = reduceEditor(history, { type: "trim-path", objectId: "target", segmentIndex: 0 });

    expect(trimmed.present.project.objects).toHaveLength(2);
    expect(trimmed.present.project.objects.find(object => object.id === "target")).toMatchObject({ type: "path", closed: false, pointsMm: [[100, 0], [100, 80], [0, 80], [0, 0]] });
    expect(trimmed.present.selectedIds).toEqual(["target"]);
    expect(reduceEditor(trimmed, { type: "undo" }).present.project.objects).toHaveLength(2);
  });
});
