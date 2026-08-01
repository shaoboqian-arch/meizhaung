from pathlib import Path
import random
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "assets" / "illustrations"
BASE = OUT / "condition-base-face.png"

SIZE = (320, 232)


def load_base():
    im = Image.open(BASE).convert("RGBA")
    w, h = im.size
    # Crop a plain close portrait. Keep the face large and centered.
    crop_w = int(w * 0.72)
    crop_h = int(h * 0.52)
    left = max(0, (w - crop_w) // 2)
    top = int(h * 0.18)
    im = im.crop((left, top, left + crop_w, top + crop_h))
    im = im.resize(SIZE, Image.Resampling.LANCZOS)
    return im


def soft_layer():
    return Image.new("RGBA", SIZE, (0, 0, 0, 0))


def ellipse(draw, xy, fill, outline=None, width=1):
    draw.ellipse(xy, fill=fill, outline=outline, width=width)


def line(draw, pts, fill, width=2):
    draw.line(pts, fill=fill, width=width, joint="curve")


def acne(im):
    layer = soft_layer()
    d = ImageDraw.Draw(layer)
    random.seed(7)
    for _ in range(28):
        x = random.randint(145, 230)
        y = random.randint(92, 150)
        r = random.choice([2, 3, 4])
        ellipse(d, (x-r, y-r, x+r, y+r), (214, 82, 72, 170), (255, 180, 166, 130), 1)
    for _ in range(12):
        x = random.randint(165, 220)
        y = random.randint(100, 142)
        ellipse(d, (x-1, y-1, x+1, y+1), (126, 67, 54, 170))
    return Image.alpha_composite(im, layer)


def dry(im):
    layer = soft_layer()
    d = ImageDraw.Draw(layer)
    random.seed(9)
    for _ in range(36):
        x = random.randint(118, 245)
        y = random.randint(86, 162)
        length = random.randint(8, 20)
        line(d, [(x, y), (x + length, y + random.randint(-5, 5))], (239, 210, 190, 165), 2)
    for _ in range(10):
        x = random.randint(145, 235)
        y = random.randint(100, 155)
        ellipse(d, (x-8, y-5, x+8, y+5), (255, 244, 234, 120))
    return Image.alpha_composite(im, layer)


def sensitive(im):
    layer = soft_layer()
    d = ImageDraw.Draw(layer)
    ellipse(d, (139, 78, 245, 162), (233, 111, 101, 80))
    ellipse(d, (152, 92, 228, 150), (245, 139, 128, 90))
    for pts in [[(156, 110), (174, 104), (190, 112)], [(166, 130), (185, 124), (210, 134)]]:
        line(d, pts, (204, 78, 70, 130), 2)
    return Image.alpha_composite(im, layer.filter(ImageFilter.GaussianBlur(1.2)))


def redness(im):
    layer = soft_layer()
    d = ImageDraw.Draw(layer)
    ellipse(d, (128, 82, 252, 166), (232, 90, 78, 95))
    for y in [106, 124, 140]:
        line(d, [(155, y), (185, y-8), (218, y+3)], (206, 79, 68, 130), 3)
    return Image.alpha_composite(im, layer.filter(ImageFilter.GaussianBlur(0.9)))


def oil(im):
    im = ImageEnhance.Brightness(im).enhance(1.02)
    layer = soft_layer()
    d = ImageDraw.Draw(layer)
    for xy in [(118, 56, 210, 104), (155, 88, 248, 144), (94, 76, 148, 120)]:
        ellipse(d, xy, (255, 255, 255, 92))
    for xy in [(215, 87, 230, 111), (235, 122, 248, 143), (105, 105, 116, 125)]:
        ellipse(d, xy, (245, 220, 190, 135))
    return Image.alpha_composite(im, layer.filter(ImageFilter.GaussianBlur(1.8)))


def pore(im):
    layer = soft_layer()
    d = ImageDraw.Draw(layer)
    random.seed(11)
    for _ in range(44):
        x = random.randint(152, 236)
        y = random.randint(94, 153)
        r = random.choice([1, 2])
        ellipse(d, (x-r, y-r, x+r, y+r), (95, 67, 58, 115))
    return Image.alpha_composite(im, layer)


def blackhead(im):
    layer = soft_layer()
    d = ImageDraw.Draw(layer)
    random.seed(13)
    for _ in range(26):
        x = random.randint(105, 152)
        y = random.randint(86, 134)
        r = random.choice([1, 2])
        ellipse(d, (x-r, y-r, x+r, y+r), (53, 45, 42, 185))
    return Image.alpha_composite(im, layer)


def dull(im):
    im = ImageEnhance.Color(im).enhance(0.72)
    im = ImageEnhance.Brightness(im).enhance(0.93)
    layer = soft_layer()
    d = ImageDraw.Draw(layer)
    d.rectangle((0, 0, 320, 232), fill=(176, 152, 134, 34))
    return Image.alpha_composite(im, layer)


def spot(im):
    layer = soft_layer()
    d = ImageDraw.Draw(layer)
    for xy in [(176, 105, 190, 119), (205, 126, 220, 141), (148, 135, 159, 146), (224, 100, 235, 111)]:
        ellipse(d, xy, (156, 96, 56, 125))
    return Image.alpha_composite(im, layer.filter(ImageFilter.GaussianBlur(0.4)))


def barrier(im):
    im = ImageEnhance.Contrast(im).enhance(0.95)
    layer = soft_layer()
    d = ImageDraw.Draw(layer)
    ellipse(d, (132, 82, 250, 170), (230, 87, 79, 70))
    for x in [152, 172, 194, 216]:
        line(d, [(x, 92), (x+10, 112), (x-4, 136), (x+12, 158)], (198, 80, 70, 145), 2)
    return Image.alpha_composite(im, layer.filter(ImageFilter.GaussianBlur(0.8)))


def frame(im):
    bg = Image.new("RGBA", SIZE, (255, 253, 249, 255))
    bg.alpha_composite(im)
    return bg


def main():
    base = load_base()
    variants = {
        "condition-acne.png": acne,
        "condition-dry.png": dry,
        "condition-sensitive.png": sensitive,
        "condition-redness.png": redness,
        "condition-oil.png": oil,
        "condition-pore.png": pore,
        "condition-blackhead.png": blackhead,
        "condition-dull.png": dull,
        "condition-spot.png": spot,
        "condition-barrier.png": barrier,
    }
    for name, fn in variants.items():
        result = frame(fn(base.copy()))
        result.save(OUT / name, optimize=True)
        print(name, (OUT / name).stat().st_size)


if __name__ == "__main__":
    main()
