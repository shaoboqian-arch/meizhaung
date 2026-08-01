from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / "src" / "assets" / "illustrations"
OUT.mkdir(parents=True, exist_ok=True)

SCALE = 3
CORAL = (232, 111, 92, 255)
CORAL_SOFT = (255, 224, 214, 255)
MINT = (151, 193, 144, 255)
MINT_SOFT = (224, 242, 226, 255)
CREAM = (255, 248, 237, 255)
BROWN = (116, 76, 58, 255)
GOLD = (239, 181, 102, 255)
INK = (71, 49, 37, 255)


def rgba(size):
    return Image.new("RGBA", (size[0] * SCALE, size[1] * SCALE), (0, 0, 0, 0))


def d(img):
    return ImageDraw.Draw(img)


def box(draw, xy, radius, fill, outline=None, width=1):
    xy = tuple(v * SCALE for v in xy)
    draw.rounded_rectangle(xy, radius=radius * SCALE, fill=fill, outline=outline, width=width * SCALE)


def ellipse(draw, xy, fill, outline=None, width=1):
    xy = tuple(v * SCALE for v in xy)
    draw.ellipse(xy, fill=fill, outline=outline, width=width * SCALE)


def line(draw, points, fill, width=3):
    pts = [(x * SCALE, y * SCALE) for x, y in points]
    draw.line(pts, fill=fill, width=width * SCALE, joint="curve")


def save(img, name):
    img = img.resize((img.width // SCALE, img.height // SCALE), Image.Resampling.LANCZOS)
    img.save(OUT / name)


def hero():
    img = rgba((420, 220))
    draw = d(img)
    ellipse(draw, (58, 44, 188, 174), (255, 234, 222, 255))
    ellipse(draw, (266, 26, 392, 152), (229, 244, 230, 255))
    ellipse(draw, (152, 42, 244, 160), (255, 214, 195, 255), BROWN, 3)
    box(draw, (148, 40, 248, 92), 34, BROWN)
    ellipse(draw, (174, 92, 184, 102), INK)
    ellipse(draw, (214, 92, 224, 102), INK)
    line(draw, [(185, 125), (204, 134), (223, 125)], CORAL, 4)
    box(draw, (68, 96, 112, 180), 12, MINT_SOFT, MINT, 3)
    box(draw, (80, 78, 100, 100), 7, CREAM, MINT, 3)
    box(draw, (284, 92, 332, 184), 14, (250, 223, 194, 255), GOLD, 3)
    box(draw, (296, 72, 320, 96), 8, CREAM, GOLD, 3)
    ellipse(draw, (30, 48, 92, 124), (255, 255, 255, 120), (205, 185, 164, 255), 4)
    line(draw, [(61, 123), (44, 170)], (205, 185, 164, 255), 5)
    line(draw, [(346, 74), (366, 42), (384, 72), (368, 104)], MINT, 5)
    ellipse(draw, (330, 52, 360, 76), MINT_SOFT, MINT, 3)
    ellipse(draw, (366, 82, 400, 108), MINT_SOFT, MINT, 3)
    save(img, "hero-care.png")


def condition_icon(name, kind):
    img = rgba((120, 120))
    draw = d(img)
    ellipse(draw, (12, 12, 108, 108), (255, 247, 239, 255))
    if kind == "acne":
        box(draw, (32, 30, 88, 86), 22, CORAL_SOFT, CORAL, 3)
        for p in [(48, 48), (65, 42), (58, 66)]:
            ellipse(draw, (p[0], p[1], p[0] + 9, p[1] + 9), CORAL)
    elif kind == "dry":
        ellipse(draw, (43, 20, 75, 76), MINT_SOFT, MINT, 3)
        line(draw, [(34, 88), (86, 88)], GOLD, 4)
        line(draw, [(42, 98), (78, 98)], GOLD, 3)
    elif kind == "sensitive":
        ellipse(draw, (32, 22, 76, 88), MINT_SOFT, MINT, 3)
        line(draw, [(78, 32), (94, 24)], CORAL, 4)
        line(draw, [(82, 52), (102, 52)], CORAL, 4)
    elif kind == "redness":
        ellipse(draw, (38, 24, 82, 92), CORAL_SOFT, CORAL, 3)
        line(draw, [(35, 45), (86, 62)], CORAL, 4)
        line(draw, [(38, 64), (84, 45)], CORAL, 4)
    elif kind == "oil":
        ellipse(draw, (45, 18, 76, 72), MINT_SOFT, MINT, 3)
        ellipse(draw, (54, 76, 68, 90), MINT)
    elif kind == "pore":
        box(draw, (28, 26, 92, 88), 20, CORAL_SOFT, CORAL, 3)
        for p in [(44, 46), (62, 58), (70, 40)]:
            ellipse(draw, (p[0], p[1], p[0] + 8, p[1] + 8), CORAL)
    elif kind == "blackhead":
        ellipse(draw, (24, 24, 72, 72), CORAL_SOFT, BROWN, 3)
        ellipse(draw, (44, 42, 53, 51), INK)
        ellipse(draw, (66, 66, 75, 75), INK)
        line(draw, [(75, 75), (94, 94)], BROWN, 5)
    elif kind == "dull":
        ellipse(draw, (22, 36, 74, 76), (224, 242, 239, 255), (122, 184, 175, 255), 3)
        for y in [34, 52, 70]:
            line(draw, [(78, y), (98, y - 4)], GOLD, 4)
    elif kind == "spot":
        ellipse(draw, (33, 28, 87, 82), (255, 241, 196, 255), GOLD, 3)
        ellipse(draw, (24, 58, 34, 68), GOLD)
        ellipse(draw, (88, 42, 99, 53), GOLD)
    else:
        box(draw, (24, 48, 96, 78), 15, (223, 243, 239, 255), (122, 181, 171, 255), 3)
        line(draw, [(32, 40), (60, 24), (88, 40)], (122, 181, 171, 255), 5)
    save(img, name)


def scene(name, theme):
    img = rgba((220, 160))
    draw = d(img)
    box(draw, (8, 14, 212, 150), 26, (255, 248, 237, 255), (230, 204, 181, 255), 2)
    ellipse(draw, (24, 30, 92, 98), CORAL_SOFT)
    ellipse(draw, (142, 22, 198, 78), MINT_SOFT)
    if theme == "products":
        box(draw, (42, 54, 82, 124), 12, MINT_SOFT, MINT, 3)
        box(draw, (102, 44, 148, 126), 14, (250, 223, 194, 255), GOLD, 3)
        box(draw, (154, 64, 186, 122), 10, CORAL_SOFT, CORAL, 3)
    elif theme == "upload":
        box(draw, (52, 44, 170, 118), 18, (255, 253, 249, 255), (220, 190, 168, 255), 3)
        line(draw, [(82, 78), (106, 58), (132, 78), (150, 62)], MINT, 5)
        ellipse(draw, (68, 58, 82, 72), GOLD)
    elif theme == "ingredients":
        ellipse(draw, (74, 26, 130, 102), MINT_SOFT, MINT, 4)
        box(draw, (132, 54, 164, 124), 10, CORAL_SOFT, CORAL, 3)
        line(draw, [(56, 120), (176, 120)], GOLD, 4)
    else:
        box(draw, (50, 48, 160, 118), 18, (255, 253, 249, 255), (230, 204, 181, 255), 3)
        line(draw, [(70, 82), (96, 66), (124, 86), (148, 58)], MINT, 5)
        ellipse(draw, (66, 78, 78, 90), CORAL)
        ellipse(draw, (118, 80, 130, 92), CORAL)
    save(img, name)


hero()
for filename, kind in [
    ("condition-acne.png", "acne"),
    ("condition-dry.png", "dry"),
    ("condition-sensitive.png", "sensitive"),
    ("condition-redness.png", "redness"),
    ("condition-oil.png", "oil"),
    ("condition-pore.png", "pore"),
    ("condition-blackhead.png", "blackhead"),
    ("condition-dull.png", "dull"),
    ("condition-spot.png", "spot"),
    ("condition-barrier.png", "barrier"),
]:
    condition_icon(filename, kind)

scene("hero-products.png", "products")
scene("upload-package.png", "upload")
scene("hero-ingredients.png", "ingredients")
scene("hero-analysis.png", "analysis")

print(f"generated {len(list(OUT.glob('*.png')))} png assets in {OUT}")
