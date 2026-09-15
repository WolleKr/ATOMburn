import { Icon, type IconName } from "./Icon";

type DrawingTool = "select" | "rectangle" | "rounded-rectangle" | "ellipse" | "line" | "polygon" | "text" | "nodes" | "array" | "cut";
const tools: Array<{ name: IconName; label: string; tool?: DrawingTool }> = [
  { name: "select", label: "Select", tool: "select" },
  { name: "rectangle", label: "Rectangle", tool: "rectangle" },
  { name: "rounded-rectangle", label: "Rounded rectangle", tool: "rounded-rectangle" },
  { name: "circle", label: "Ellipse", tool: "ellipse" },
  { name: "line", label: "Line", tool: "line" },
  { name: "cut", label: "Cut path", tool: "cut" },
  { name: "polygon", label: "Polygon", tool: "polygon" },
  { name: "text", label: "Text", tool: "text" },
  { name: "nodes", label: "Edit nodes", tool: "nodes" },
  { name: "points", label: "Rectangular array", tool: "array" }
];

export function ToolRail({ activeTool = "select", onTool, onHome }: { activeTool?: DrawingTool; onTool?: (tool: DrawingTool) => void; onHome?: () => void }) {
  return (
    <aside className="tool-rail" aria-label="Drawing tools">
      {tools.map((tool) => {
        const active = tool.tool === activeTool;
        return <button
          key={tool.name}
          className={[
            "tool-button",
            tool.tool === "cut" ? "tool-button--cut" : "",
            active ? "tool-button--active" : ""
          ].filter(Boolean).join(" ")}
          type="button"
          aria-label={tool.label}
          aria-pressed={active}
          title={tool.tool === "cut" ? "Click two anchors on the same vector to cut the path between them." : tool.label}
          style={tool.tool === "cut" ? { cursor: "pointer", display: "grid" } : undefined}
          onClick={() => tool.tool && onTool?.(tool.tool)}
        ><Icon name={tool.name}/></button>;
      })}
      <span className="tool-rail__separator" />
      <button className="tool-button" type="button" aria-label="Home machine" title="Home machine" onClick={onHome}><Icon name="home"/></button>
      <button className="tool-button" type="button" aria-label="Layers" title="Layers are available in the inspector"><Icon name="layers"/></button>
      <button className="tool-button" type="button" aria-label="Measure" aria-disabled="true" disabled title="Measure — planned"><Icon name="ruler"/></button>
    </aside>
  );
}

export type { DrawingTool };
