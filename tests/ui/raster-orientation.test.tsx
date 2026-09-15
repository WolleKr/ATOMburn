// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createProject } from "../../apps/desktop/src/domain/project";
import { rasterTransform } from "../../apps/desktop/src/domain/project-geometry";
import { createEditorHistory } from "../../apps/desktop/src/editor/editor-state";
import { CanvasStage } from "../../apps/desktop/src/renderer/src/components/CanvasStage";

describe("raster orientation in the canvas", () => {
  afterEach(() => cleanup());

  it("counteracts the canvas Y-axis flip for top-down image pixels", () => {
    const project = createProject("Raster preview");
    project.objects.push({
      id: "raster-1",
      name: "orientation.jpg",
      layerId: "layer-1",
      type: "raster",
      widthMm: 20,
      heightMm: 10,
      mimeType: "image/jpeg",
      dataBase64: "AAAA",
      transform: rasterTransform(30, 40, 10)
    });

    render(<CanvasStage editor={createEditorHistory(project)} onAction={vi.fn()} onCommand={vi.fn()} />);

    expect(screen.getByRole("img", { name: "1 document objects" })).toBeTruthy();
    expect(document.querySelector("image.canvas-object")?.getAttribute("transform")).toBe("matrix(1 0 0 -1 30 50)");
  });
});
