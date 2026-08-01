from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import math
import random

OUT = Path(__file__).resolve().parents[1] / "src" / "assets" / "illustrations"
OUT.mkdir(parents=True, exist_ok=True)

S = 3
W, H = 320, 232
CREAM = (255, 252, 247, 255)
SKIN = (249, 208, 178, 255)
SKIN2 = (255, 226, 204, 255)
CORAL = (232, 111, 92, 255)
CORAL2 = (255, 166, 144, 255)
MINT = (140, 184, 150, 255)
MINT2 = (213, 236, 219, 255)
BROWN = (137, 88, 62, 255)
GOLD = (240, 184, 91, 255)


def sc(v):
    return int(v * S)


def img():
    return Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))


def rr(d, xy, r, fill, outline=None, width=1):
    d.rounded_rectangle(tuple(sc(v) for v in xy), radius=sc(r), fill=fill, outline=outline, width=sc(width))


def el(d, xy, fill, outline=None, width=1):
    d.ellipse(tuple(sc(v) for v in xy), fill=fill, outline=outline, width=sc(width))


def ln(d, pts, fill, width=3):
    d.line([(sc(x), sc(y)) for x, y in pts], fill=fill, width=sc(width), joint="curve")


def card():
    im = img()
    d = ImageDraw.Draw(im)
    shadow = Image.new("RGBA", im.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    rr(sd, (18, 18, W - 18, H - 18), 26, (120, 74, 44, 36))
    shadow = shadow.filter(ImageFilter.GaussianBlur(sc(10)))
    im.alpha_composite(shadow)
    rr(d, (18, 18, W - 18, H - 18), 26, CREAM, (239, 210, 187, 255), 2)
    return im, d


def save(im, name):
    im = im.resize((W, H), Image.Resampling.LANCZOS)
    im.save(OUT / name, optimize=True)


def skin_circle(d, cx=160, cy=116, r=72):
    el(d, (cx - r, cy - r, cx + r, cy + r), SKIN2, None)
    el(d, (cx - r, cy - r, cx + r, cy + r), (255, 228, 206, 130), (241, 204, 178, 255), 1)


def skin_band(d):
    d.pieslice((sc(18), sc(88), sc(302), sc(220)), 180, 360, fill=SKIN2)
    ln(d, [(28, 132), (78, 125), (124, 126), (174, 119), (230, 124), (296, 116)], (255, 229, 208, 255), 2)


def acne():
    im, d = card()
    skin_circle(d, 146, 116, 74)
    for x, y, r in [(130, 93, 11), (166, 128, 10), (112, 138, 4), (186, 96, 5), (142, 154, 5), (180, 150, 4)]:
        el(d, (x - r, y - r, x + r, y + r), CORAL, (255, 188, 172, 255), 2)
        el(d, (x - r + 4, y - r + 4, x - r + 10, y - r + 10), (255, 255, 255, 160))
    save(im, "condition-acne.png")


def dry():
    im, d = card()
    skin_band(d)
    for pts in [[(48, 151), (66, 139), (82, 152)], [(104, 160), (124, 143), (142, 158)], [(178, 150), (196, 135), (216, 150)], [(238, 158), (252, 142), (270, 154)]]:
        ln(d, pts, (255, 255, 255, 220), 3)
    el(d, (112, 48, 188, 138), MINT2, MINT, 4)
    ln(d, [(150, 56), (128, 104), (152, 130), (178, 104), (150, 56)], (126, 170, 137, 255), 3)
    el(d, (76, 76, 98, 98), (229, 244, 233, 255), (169, 203, 178, 255), 2)
    el(d, (214, 70, 236, 92), (229, 244, 233, 255), (169, 203, 178, 255), 2)
    save(im, "condition-dry.png")


def sensitive():
    im, d = card()
    skin_band(d)
    # leaf
    d.polygon([(sc(138), sc(56)), (sc(216), sc(32)), (sc(196), sc(132)), (sc(132), sc(140))], fill=MINT2, outline=MINT)
    ln(d, [(144, 128), (196, 50)], (126, 170, 137, 255), 3)
    for x, y in [(96, 82), (102, 116), (236, 84), (252, 112)]:
        ln(d, [(x, y), (x + 18, y + 18)], CORAL, 4)
    save(im, "condition-sensitive.png")


def redness():
    im, d = card()
    skin_circle(d, 160, 116, 72)
    el(d, (98, 62, 222, 174), (238, 93, 82, 118))
    for x, y in [(136, 106), (160, 116), (184, 104), (168, 136)]:
        el(d, (x - 4, y - 4, x + 4, y + 4), (224, 73, 67, 135))
    ln(d, [(98, 98), (110, 88), (124, 80)], (255, 255, 255, 200), 4)
    ln(d, [(210, 78), (224, 88), (234, 104)], (255, 255, 255, 200), 4)
    save(im, "condition-redness.png")


def oil():
    im, d = card()
    skin_band(d)
    for x in [108, 158, 208, 244]:
        el(d, (x - 8, 148, x + 8, 166), (222, 168, 127, 190), (204, 139, 100, 255), 2)
    el(d, (122, 42, 198, 130), MINT2, MINT, 4)
    el(d, (74, 72, 94, 92), (229, 244, 233, 255), (169, 203, 178, 255), 2)
    el(d, (224, 82, 240, 98), (229, 244, 233, 255), (169, 203, 178, 255), 2)
    save(im, "condition-oil.png")


def pore():
    im, d = card()
    skin_circle(d, 154, 120, 74)
    random.seed(5)
    for _ in range(12):
        x = random.randint(105, 204)
        y = random.randint(78, 165)
        r = random.randint(5, 8)
        el(d, (x - r, y - r, x + r, y + r), (210, 139, 102, 190), (178, 99, 68, 220), 2)
    save(im, "condition-pore.png")


def blackhead():
    im, d = card()
    skin_band(d)
    random.seed(8)
    for _ in range(11):
        x = random.randint(88, 230)
        y = random.randint(102, 170)
        r = random.randint(4, 7)
        el(d, (x - r, y - r, x + r, y + r), (211, 145, 111, 210), (178, 102, 76, 230), 2)
    el(d, (82, 52, 180, 150), (213, 236, 219, 80), MINT, 5)
    el(d, (118, 88, 136, 106), (76, 52, 40, 220))
    el(d, (152, 116, 168, 132), (76, 52, 40, 220))
    ln(d, [(176, 146), (222, 184)], BROWN, 9)
    save(im, "condition-blackhead.png")


def dull():
    im, d = card()
    skin_band(d)
    for x in [106, 150, 194, 238]:
        ln(d, [(x, 58), (x, 96)], GOLD, 4)
    ln(d, [(78, 84), (102, 108)], GOLD, 4)
    ln(d, [(258, 84), (234, 108)], GOLD, 4)
    el(d, (104, 106, 220, 220), (255, 240, 174, 120))
    for pts in [[(42, 158), (80, 148), (124, 155), (168, 146), (216, 154), (278, 145)], [(62, 178), (118, 170), (184, 176), (252, 168)]]:
        ln(d, pts, (255, 225, 202, 230), 2)
    save(im, "condition-dull.png")


def spot():
    im, d = card()
    skin_circle(d, 160, 116, 72)
    random.seed(12)
    for _ in range(20):
        x = random.randint(92, 220)
        y = random.randint(68, 166)
        r = random.choice([3, 4, 6, 9])
        el(d, (x - r, y - r, x + r, y + r), (151, 91, 51, 115))
    for x, y, r in [(144, 105, 18), (186, 136, 16), (126, 148, 9)]:
        el(d, (x - r, y - r, x + r, y + r), (157, 91, 50, 128))
    save(im, "condition-spot.png")


def barrier():
    im, d = card()
    skin_band(d)
    for y in [138, 162, 186]:
        for x in range(28, 300, 54):
            rr(d, (x, y, x + 46, y + 18), 6, (255, 188, 168, 205), (241, 160, 138, 200), 1)
    d.polygon([(sc(160), sc(54)), (sc(216), sc(76)), (sc(206), sc(138)), (sc(160), sc(166)), (sc(114), sc(138)), (sc(104), sc(76))], fill=(197, 226, 202, 245), outline=(126, 170, 137, 255))
    d.polygon([(sc(160), sc(70)), (sc(198), sc(84)), (sc(190), sc(130)), (sc(160), sc(150)), (sc(130), sc(130)), (sc(122), sc(84))], fill=(144, 190, 154, 210))
    save(im, "condition-barrier.png")


def neck():
    im, d = card()
    # Neck cross-section: stacked skin bands with two horizontal neck lines.
    d.pieslice((sc(34), sc(60), sc(286), sc(270)), 180, 360, fill=SKIN2)
    for y in [118, 142, 166]:
        ln(d, [(52, y), (102, y - 8), (160, y - 3), (222, y - 10), (270, y - 2)], (242, 178, 150, 230), 4)
    for y in [130, 154]:
        ln(d, [(66, y), (128, y + 7), (196, y + 2), (258, y + 9)], (192, 116, 82, 150), 3)
    ln(d, [(80, 98), (244, 88)], (255, 235, 220, 230), 3)
    save(im, "condition-neck.png")


def sagging():
    im, d = card()
    skin_circle(d, 160, 106, 68)
    # Downward soft contour lines and arrows to show laxity.
    for x in [112, 146, 180, 214]:
        ln(d, [(x, 72), (x + 4, 118), (x - 8, 154)], (206, 129, 94, 140), 4)
        d.polygon(
            [(sc(x - 14), sc(144)), (sc(x - 8), sc(164)), (sc(x + 4), sc(148))],
            fill=(206, 129, 94, 150)
        )
    el(d, (102, 126, 218, 188), (255, 220, 198, 120))
    ln(d, [(104, 142), (152, 160), (212, 144)], (255, 245, 238, 220), 4)
    save(im, "condition-sagging.png")


def fine_lines():
    im, d = card()
    skin_circle(d, 160, 116, 72)
    # Fine-line cluster, inspired by eye/forehead line diagrams.
    for y in [82, 98, 114]:
        ln(d, [(96, y), (134, y - 6), (178, y), (220, y - 5)], (176, 105, 72, 150), 3)
    for pts in [
        [(126, 142), (146, 134), (168, 142)],
        [(176, 144), (198, 136), (218, 144)],
        [(118, 160), (154, 154), (190, 160), (224, 154)]
    ]:
        ln(d, pts, (176, 105, 72, 120), 2)
    for x, y in [(232, 72), (246, 88), (236, 106)]:
        ln(d, [(x, y), (x + 16, y - 10)], GOLD, 3)
    save(im, "condition-fine-lines.png")


def main():
    acne()
    dry()
    sensitive()
    redness()
    oil()
    pore()
    blackhead()
    dull()
    spot()
    barrier()
    neck()
    sagging()
    fine_lines()
    for path in sorted(OUT.glob("condition-*.png")):
        print(path.name, path.stat().st_size)


if __name__ == "__main__":
    main()
