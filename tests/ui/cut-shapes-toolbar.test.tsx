// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { ToolRail } from "../../apps/desktop/src/renderer/src/components/ToolRail";

describe("Cut path toolbar command", () => {
  it("activates the existing scissors tool and documents its two-anchor rule", () => {
    const onTool = vi.fn();
    render(<ToolRail onTool={onTool} />);
    const button = screen.getByRole("button", { name: "Cut path" });
    expect(button.getAttribute("title")).toBe("Click two anchors on the same vector to cut the path between them.");
    fireEvent.click(button);
    expect(onTool).toHaveBeenCalledWith("cut");
  });
});
