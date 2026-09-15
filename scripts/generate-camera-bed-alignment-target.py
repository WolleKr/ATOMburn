import argparse
import re
from io import BytesIO
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen.canvas import Canvas


OUTPUT = Path(__file__).resolve().parents[1] / "output" / "pdf" / "ATOMburn-camera-bed-alignment-target-400x400-tiled.pdf"
MARKER_SOURCE = Path(__file__).resolve().parents[1] / "apps" / "desktop" / "src" / "domain" / "camera-bed-markers.ts"
PAGE_WIDTH_MM = 210
PAGE_HEIGHT_MM = 297
COLUMNS = [(0, 140), (140, 280), (280, 400)]
ROWS = [(0, 220), (220, 400)]
MARKER_SIZE_MM = 30
MARKER_CELLS = 6
MARKER_GAP_MM = 1
CROSSHAIR_EXTENT_MM = 19


def marker_definitions() -> list[tuple[int, int, int, int]]:
    """Read the detector's canonical IDs, machine points and payloads.

    Keeping the bit patterns in the TypeScript detector makes it impossible for
    a separately maintained PDF table to silently drift from recognition.
    """
    source = MARKER_SOURCE.read_text(encoding="utf-8")
    points = {
        int(marker_id): (int(x), int(y))
        for marker_id, x, y in re.findall(
            r"\{\s*id:\s*(\d+)\s+as\s+const,\s*machine:\s*\{\s*x:\s*(\d+),\s*y:\s*(\d+)\s*\}\s*\}",
            source,
        )
    }
    payload_block = re.search(r"(?:BED_MARKER_)?PAYLOADS[^=]*=\s*Object\.freeze\(\{(.*?)\}\);", source, re.DOTALL)
    if payload_block is None:
        raise RuntimeError("The canonical bed-marker payload table was not found.")
    payloads = {
        int(marker_id): int(hex_value, 16)
        for marker_id, hex_value in re.findall(r"(\d+)\s*:\s*(0x[0-9a-fA-F]+)", payload_block.group(1))
    }
    if sorted(points) != list(range(5)) or sorted(payloads) != list(range(5)):
        raise RuntimeError("Expected exactly canonical bed-marker IDs 0 through 4.")
    return [(marker_id, *points[marker_id], payloads[marker_id]) for marker_id in range(5)]


def draw_crop_mark(canvas: Canvas, x: float, y: float, sx: int, sy: int) -> None:
    canvas.line((x - sx * 4) * mm, y * mm, (x + sx * 2) * mm, y * mm)
    canvas.line(x * mm, (y - sy * 4) * mm, x * mm, (y + sy * 2) * mm)


def marker_cells(payload: int) -> list[list[bool]]:
    return [
        [
            row in (0, MARKER_CELLS - 1)
            or column in (0, MARKER_CELLS - 1)
            or bool(payload & (1 << (15 - ((row - 1) * 4 + column - 1))))
            for column in range(MARKER_CELLS)
        ]
        for row in range(MARKER_CELLS)
    ]


def draw_marker(canvas: Canvas, marker_id: int, center_x: float, center_y: float, payload: int) -> None:
    cell_size = MARKER_SIZE_MM / MARKER_CELLS
    left = center_x - MARKER_SIZE_MM / 2
    top = center_y + MARKER_SIZE_MM / 2
    canvas.setFillColorRGB(0, 0, 0)
    for row, cells in enumerate(marker_cells(payload)):
        for column, black in enumerate(cells):
            if black:
                canvas.addLiteral(
                    f"% ATOMburn-marker-cell id={marker_id} row={row} column={column}"
                )
                canvas.rect(
                    (left + column * cell_size) * mm,
                    (top - (row + 1) * cell_size) * mm,
                    cell_size * mm,
                    cell_size * mm,
                    stroke=0,
                    fill=1,
                )

    # Four aligned arms identify the exact marker centre for manual correction.
    # They remain separated from the black border, so the detector still sees
    # the marker's exact square component bounds and unmodified payload cells.
    canvas.setLineWidth(0.25 * mm)
    inner = MARKER_SIZE_MM / 2 + MARKER_GAP_MM
    for start, end in ((inner, CROSSHAIR_EXTENT_MM), (-inner, -CROSSHAIR_EXTENT_MM)):
        canvas.line((center_x + start) * mm, center_y * mm, (center_x + end) * mm, center_y * mm)
        canvas.line(center_x * mm, (center_y + start) * mm, center_x * mm, (center_y + end) * mm)


def build_target() -> bytes:
    output = BytesIO()
    canvas = Canvas(output, pagesize=A4, pageCompression=0, invariant=1)
    canvas.setTitle("ATOMburn 400 x 400 mm camera bed alignment target")
    canvas.setAuthor("ATOMburn")
    markers = marker_definitions()

    for row_index, (global_y0, global_y1) in enumerate(ROWS):
        for column_index, (global_x0, global_x1) in enumerate(COLUMNS):
            tile_width = global_x1 - global_x0
            tile_height = global_y1 - global_y0
            tile_x = (PAGE_WIDTH_MM - tile_width) / 2
            tile_y = (PAGE_HEIGHT_MM - tile_height) / 2
            page_number = row_index * len(COLUMNS) + column_index + 1
            canvas.addLiteral(
                f"% ATOMburn-tile page={page_number} row={row_index} column={column_index} "
                f"global-x={global_x0}:{global_x1} global-y={global_y0}:{global_y1} "
                f"local-x={tile_x:g} local-y={tile_y:g} width={tile_width} height={tile_height}"
            )

            canvas.setFont("Helvetica-Bold", 10)
            canvas.drawCentredString(PAGE_WIDTH_MM / 2 * mm, 289 * mm, f"ATOMburn 400 x 400 bed target - page {page_number}/6")
            canvas.setFont("Helvetica", 7)
            canvas.drawCentredString(PAGE_WIDTH_MM / 2 * mm, 283 * mm, f"Assembly position: row {row_index + 1}, column {column_index + 1} - print at 100% / Actual size")

            canvas.setLineWidth(0.35 * mm)
            canvas.rect(tile_x * mm, tile_y * mm, tile_width * mm, tile_height * mm, stroke=1, fill=0)
            draw_crop_mark(canvas, tile_x, tile_y, -1, -1)
            draw_crop_mark(canvas, tile_x + tile_width, tile_y, 1, -1)
            draw_crop_mark(canvas, tile_x, tile_y + tile_height, -1, 1)
            draw_crop_mark(canvas, tile_x + tile_width, tile_y + tile_height, 1, 1)

            canvas.setFont("Helvetica", 6)
            canvas.drawString((tile_x + 3) * mm, (tile_y + tile_height - 4) * mm, f"X {global_x0}-{global_x1} mm")
            canvas.drawRightString((tile_x + tile_width - 3) * mm, (tile_y + 3) * mm, f"Y {global_y0}-{global_y1} mm")

            for marker_id, global_x, global_y, payload in markers:
                in_x = global_x0 <= global_x < global_x1 or (column_index == len(COLUMNS) - 1 and global_x == global_x1)
                in_y = global_y0 <= global_y < global_y1 or (row_index == len(ROWS) - 1 and global_y == global_y1)
                if not (in_x and in_y):
                    continue
                local_x = global_x - global_x0
                local_y = global_y - global_y0
                px = tile_x + local_x
                py = tile_y + tile_height - local_y
                canvas.addLiteral(
                    f"% ATOMburn-marker id={marker_id} machine-x={global_x} machine-y={global_y} "
                    f"page-x={px:g} page-y={py:g} payload=0x{payload:04x} size={MARKER_SIZE_MM} cells={MARKER_CELLS}"
                )
                draw_marker(canvas, marker_id, px, py, payload)
                canvas.setFont("Helvetica-Bold", 7)
                canvas.drawCentredString(px * mm, (py + 23) * mm, f"Marker {marker_id}")
                canvas.setFont("Helvetica", 6)
                canvas.drawCentredString(px * mm, (py + 20) * mm, f"X{global_x} / Y{global_y}")

            ruler_y = 13
            ruler_x = (PAGE_WIDTH_MM - 100) / 2
            canvas.addLiteral(
                f"% ATOMburn-ruler x1={ruler_x:g} x2={ruler_x + 100:g} y={ruler_y} length=100"
            )
            canvas.setLineWidth(0.3 * mm)
            canvas.line(ruler_x * mm, ruler_y * mm, (ruler_x + 100) * mm, ruler_y * mm)
            canvas.line(ruler_x * mm, (ruler_y - 2) * mm, ruler_x * mm, (ruler_y + 2) * mm)
            canvas.line((ruler_x + 100) * mm, (ruler_y - 2) * mm, (ruler_x + 100) * mm, (ruler_y + 2) * mm)
            canvas.setFont("Helvetica", 7)
            canvas.drawCentredString(PAGE_WIDTH_MM / 2 * mm, 17 * mm, "Control length: exactly 100 mm")
            canvas.drawCentredString(PAGE_WIDTH_MM / 2 * mm, 5 * mm, "Cut on the tile border. Join pages without gaps: 1-2-3 above 4-5-6. X right, Y down.")
            canvas.showPage()

    canvas.save()
    return output.getvalue()


def draw_target(output_path: Path = OUTPUT, check: bool = False) -> None:
    document = build_target()
    if check:
        if not output_path.exists() or output_path.read_bytes() != document:
            raise SystemExit(f"Generated target is stale: {output_path}")
        return
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(document)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--check", action="store_true")
    arguments = parser.parse_args()
    draw_target(arguments.output, arguments.check)
