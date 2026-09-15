import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { createProject } from "../../apps/desktop/src/domain/project";
import { rasterTransform } from "../../apps/desktop/src/domain/project-geometry";
import { createEditorHistory, reduceEditor } from "../../apps/desktop/src/editor/editor-state";
import { importDocument } from "../../apps/desktop/src/importers/import-document";

describe("raster orientation", () => {
  it("imports top-down image pixels into the bottom-up project coordinate system", async () => {
    const jpeg = await sharp({
      create: { width: 4, height: 2, channels: 3, background: "white" }
    }).jpeg().toBuffer();
    const imported = await importDocument("orientation.jpg", jpeg);
    const object = imported.objects[0];

    expect(object?.type).toBe("raster");
    if (!object || object.type !== "raster") throw new Error("Raster import did not create a raster object.");
    expect(object.transform).toEqual(rasterTransform(0, 0, object.heightMm));
  });

  it("uses the same orientation for raster objects created by the editor", () => {
    const project = createProject("Raster orientation");
    const history = reduceEditor(createEditorHistory(project), {
      type: "add-raster",
      name: "test.jpg",
      widthMm: 20,
      heightMm: 10,
      mimeType: "image/jpeg",
      dataBase64: "AAAA",
      xMm: 30,
      yMm: 40
    });

    expect(history.present.project.objects[0]?.transform).toEqual(rasterTransform(30, 40, 10));
  });
});
