from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen.canvas import Canvas


OUTPUT = Path(__file__).resolve().parents[1] / "output" / "pdf" / "ATOMburn-camera-calibration-target-4x11.pdf"
PAGE_WIDTH_MM = 210
PAGE_HEIGHT_MM = 297
GRID_COLUMNS = 4
GRID_ROWS = 11
GRID_SPACING_MM = 18
DOT_DIAMETER_MM = 7
FIDUCIAL_SIZE_MM = 14


def draw_target() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas = Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
    canvas.setTitle("ATOMburn camera calibration target 4x11")
    canvas.setAuthor("ATOMburn")

    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawCentredString((PAGE_WIDTH_MM / 2) * mm, 289 * mm, "ATOMburn - Camera lens target 4 x 11")
    canvas.setFont("Helvetica", 7)
    canvas.drawCentredString((PAGE_WIDTH_MM / 2) * mm, 283 * mm, "Print at 100% / Actual size. Keep the complete white page visible.")

    fiducials = [(18, 18), (192, 18), (192, 272), (18, 272)]
    canvas.setFillColorRGB(0, 0, 0)
    half = FIDUCIAL_SIZE_MM / 2
    for x_mm, y_mm in fiducials:
        canvas.rect((x_mm - half) * mm, (y_mm - half) * mm, FIDUCIAL_SIZE_MM * mm, FIDUCIAL_SIZE_MM * mm, stroke=0, fill=1)

    grid_width = (2 * (GRID_COLUMNS - 1) + 1) * GRID_SPACING_MM
    grid_height = (GRID_ROWS - 1) * GRID_SPACING_MM
    origin_x = (PAGE_WIDTH_MM - grid_width) / 2
    origin_y = (PAGE_HEIGHT_MM - grid_height) / 2
    radius = DOT_DIAMETER_MM / 2
    for row in range(GRID_ROWS):
        for column in range(GRID_COLUMNS):
            x_mm = origin_x + (2 * column + row % 2) * GRID_SPACING_MM
            y_mm = origin_y + row * GRID_SPACING_MM
            canvas.circle(x_mm * mm, y_mm * mm, radius * mm, stroke=0, fill=1)

    canvas.setLineWidth(0.25 * mm)
    canvas.line(55 * mm, 6 * mm, 155 * mm, 6 * mm)
    canvas.line(55 * mm, 4 * mm, 55 * mm, 8 * mm)
    canvas.line(155 * mm, 4 * mm, 155 * mm, 8 * mm)
    canvas.setFont("Helvetica", 7)
    canvas.drawCentredString(105 * mm, 9 * mm, "Control length: exactly 100 mm")
    canvas.drawCentredString(105 * mm, 1.8 * mm, "Pattern: asymmetric circles 4 x 11 - spacing 18 mm - dots 7 mm")
    canvas.showPage()
    canvas.save()


if __name__ == "__main__":
    draw_target()
