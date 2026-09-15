import { describe, expect, it } from "vitest";
import { importDocument } from "../../apps/desktop/src/importers/import-document.js";

const spline = `0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n0\nSPLINE\n8\nCUT\n70\n1\n71\n3\n72\n8\n73\n4\n40\n0\n40\n0\n40\n0\n40\n0\n40\n1\n40\n1\n40\n1\n40\n1\n10\n0\n20\n0\n10\n10\n20\n0\n10\n10\n20\n10\n10\n0\n20\n10\n0\nENDSEC\n0\nEOF\n`;
const ellipse = `0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n0\nELLIPSE\n8\nCUT\n10\n0\n20\n0\n11\n10\n21\n0\n40\n0.5\n41\n0\n42\n6.283185307179586\n0\nENDSEC\n0\nEOF\n`;

describe("DXF spline import", () => {
  it("converts valid cubic spline entities into editable closed paths", async () => {
    const result = await importDocument("spline.dxf", new TextEncoder().encode(spline));

    expect(result.objects).toHaveLength(1);
    expect(result.objects[0]).toMatchObject({ type: "path", closed: true, layerId: "import-dxf-layer-1" });
    expect(result.objects[0]?.type === "path" ? result.objects[0].pointsMm.length : 0).toBeGreaterThan(8);
    expect(result.diagnostics).toEqual([]);
  });

  it("imports DXF ellipses as editable closed paths", async () => {
    const result = await importDocument("ellipse.dxf", new TextEncoder().encode(ellipse));

    expect(result.objects).toHaveLength(1);
    expect(result.objects[0]).toMatchObject({ type: "path", closed: true });
    expect(result.diagnostics).toEqual([]);
  });
});
