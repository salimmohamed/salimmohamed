"""Build the profile art (ASCII drawn into PNGs, dissolving at the top and sides) and the info block (SVGs).

Usage: python scripts/build_card.py <avatar image> assets
Needs: pip install pillow fonttools brotli, plus DejaVu Sans Mono (fonts-dejavu-core on Ubuntu).
"""
import base64
import io
import random
import sys
from html import escape

from fontTools import subset
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont, ImageOps

avatar, out_dir = sys.argv[1], sys.argv[2]

MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
MONO_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
COLS = 120
RAMP = "@%#*+=-:. "  # dense -> sparse
ART_PX = 380  # displayed size; PNG is drawn at 2x for sharp screens
FADE_TOP, FADE_SIDE = 0.40, 0.30  # how far in from the top and side edges the dissolve reaches
SEED = 7  # fixed so the sprinkles land in the same places on every rebuild
INFO = [
    ("role", "Software Engineer @ Intuit"),
    ("school", "Oregon State CS '26"),
    ("building", "AI agents, self-hosted infra"),
    ("stack", "TypeScript, Python, React, Next.js"),
]
THEMES = {
    # name: (glyph color, text, muted, dense glyphs on bright pixels?)
    "light": ((36, 41, 47), "#1f2328", "#6e7781", False),
    "dark": ((201, 209, 217), "#e6edf3", "#7d8590", True),
}


def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def noise_field(cols, rows, cell, rng):
    """Blobby random values in -1..1: a coarse random grid, smoothly interpolated."""
    gw, gh = cols // cell + 2, rows // cell + 2
    grid = [[rng.uniform(-1, 1) for _ in range(gw)] for _ in range(gh)]
    def at(x, y):
        gx, gy = x / cell, y / cell
        x0, y0 = int(gx), int(gy)
        tx, ty = smooth(gx - x0), smooth(gy - y0)
        top = grid[y0][x0] * (1 - tx) + grid[y0][x0 + 1] * tx
        bottom = grid[y0 + 1][x0] * (1 - tx) + grid[y0 + 1][x0 + 1] * tx
        return top * (1 - ty) + bottom * ty
    return at


def keep_chance(x, y, cols, rows, wobble):
    """Chance a glyph is drawn: 1 in the core, falling to 0 at the top and sides with a ragged edge."""
    fx, fy = x / (cols - 1), y / (rows - 1)
    w = wobble(x, y)
    top = smooth((fy + 0.18 * w) / FADE_TOP)
    side = smooth((min(fx, 1 - fx) + 0.10 * w) / FADE_SIDE)
    return (top * side) ** 1.6


def art_png(glyph_rgb, bright_dense):
    font = ImageFont.truetype(MONO, 20)
    cw, ch = font.getbbox("A")[2], int(font.size * 1.2)
    img = ImageOps.autocontrast(Image.open(avatar).convert("L"), cutoff=1)
    rows = int(COLS * img.height / img.width * cw / ch)
    small = img.resize((COLS, rows), Image.LANCZOS)
    canvas = Image.new("RGBA", (COLS * cw, rows * ch), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    rng = random.Random(SEED)
    wobble = noise_field(COLS, rows, 9, rng)
    for y in range(rows):
        for x in range(COLS):
            keep = rng.random() < keep_chance(x, y, COLS, rows, wobble)
            v = small.getpixel((x, y)) / 255
            v = 1 - v if bright_dense else v  # v: 0 = dense glyph, 1 = blank
            glyph = RAMP[min(len(RAMP) - 1, int(v * len(RAMP)))]
            if glyph != " " and keep:
                draw.text((x * cw, y * ch), glyph, font=font, fill=glyph_rgb + (255,))
    return canvas.resize((ART_PX * 2, int(ART_PX * 2 * canvas.height / canvas.width)), Image.LANCZOS)


def font_b64(path, text):
    opts = subset.Options()
    opts.flavor = "woff2"
    font = TTFont(path)
    sub = subset.Subsetter(opts)
    sub.populate(text=text)
    sub.subset(font)
    buf = io.BytesIO()
    font.flavor = "woff2"
    font.save(buf)
    return base64.b64encode(buf.getvalue()).decode()


def info_svg(text_c, muted_c, art_h):
    regular = font_b64(MONO, "".join(k + v for k, v in INFO) + "─ ")
    bold = font_b64(MONO_BOLD, "salim mohamed")
    size, step, kw = 14, 24, 10
    block = step * (len(INFO) + 1)
    top = art_h / 2 - block / 2 + size  # baseline of the first line, centered beside the art
    width = (kw + max(len(v) for _, v in INFO)) * size * 0.602 + 4
    height = top + block + 8
    lines = [
        f'<text x="0" y="{top:.0f}" class="b" fill="{text_c}">salim mohamed</text>',
        f'<text x="0" y="{top + step:.0f}" fill="{muted_c}">{"─" * 13}</text>',
    ]
    for i, (key, value) in enumerate(INFO):
        lines.append(
            f'<text x="0" y="{top + step * (i + 2):.0f}"><tspan fill="{muted_c}">{escape(key.ljust(kw))}</tspan>'
            f'<tspan fill="{text_c}">{escape(value)}</tspan></text>'
        )
    return "\n".join([
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width:.0f}" height="{height:.0f}" viewBox="0 0 {width:.0f} {height:.0f}">',
        "<style>"
        f'@font-face{{font-family:"M";src:url(data:font/woff2;base64,{regular}) format("woff2")}}'
        f'@font-face{{font-family:"MB";src:url(data:font/woff2;base64,{bold}) format("woff2")}}'
        f'text,tspan{{white-space:pre;font-family:"M",monospace;font-size:{size}px}} .b{{font-family:"MB",monospace}}'
        "</style>",
        *lines,
        "</svg>",
    ])


for theme, (glyph_rgb, text_c, muted_c, bright_dense) in THEMES.items():
    art = art_png(glyph_rgb, bright_dense)
    art.save(f"{out_dir}/art_{theme}.png", optimize=True)
    with open(f"{out_dir}/info_{theme}.svg", "w") as f:
        f.write(info_svg(text_c, muted_c, art.height // 2))
    print(theme, "art", art.size)
