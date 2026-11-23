"""Build the profile banner (an ASCII ridge of the last year's contributions)
and the info block under it, in light and dark versions.

Usage: python scripts/build_skyline.py <contributions.json> assets
The JSON is the output of:
  gh api graphql -f query='{user(login:"salimmohamed"){contributionsCollection{contributionCalendar{
    totalContributions weeks{contributionDays{date contributionCount}}}}}}'
Needs: pip install pillow fonttools brotli, plus DejaVu Sans Mono (fonts-dejavu-core on Ubuntu).
"""
import base64
import io
import json
import random
import sys
from datetime import date
from html import escape

from fontTools import subset
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

data_path, out_dir = sys.argv[1], sys.argv[2]
KERNEL = [int(k) for k in sys.argv[3].split(",")] if len(sys.argv) > 3 else [1, 4, 1]

MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
MONO_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
BANNER_PX = 830  # displayed width; PNG is drawn at about 2x for sharp screens
COLS, ROWS = 210, 40  # character grid for the ridge
RAMP = " .'`,:;-~=+*xo%#&@"  # sparse -> dense, symbols only so it never reads as words
SEED = 7  # fixed so the texture and sprinkles land in the same places on every rebuild
INFO = [
    ("role", "Software Engineer @ Intuit"),
    ("school", "Oregon State CS '26"),
    ("building", "AI agents, self-hosted infra"),
    ("stack", "TypeScript, Python, React, Next.js"),
]
THEMES = {
    # name: (glyph rgb, muted rgb, text color, muted color)
    "light": ((36, 41, 47), (110, 119, 129), "#1f2328", "#6e7781"),
    "dark": ((201, 209, 217), (125, 133, 144), "#e6edf3", "#7d8590"),
}


def load_weeks():
    cal = json.load(open(data_path))["data"]["user"]["contributionsCollection"]["contributionCalendar"]
    weeks = [sum(d["contributionCount"] for d in w["contributionDays"]) for w in cal["weeks"]]
    first = date.fromisoformat(cal["weeks"][0]["contributionDays"][0]["date"])
    last = date.fromisoformat(cal["weeks"][-1]["contributionDays"][-1]["date"])
    return weeks, cal["totalContributions"], first, last


def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def ridge_heights(weeks):
    """One height per column, 0..1. The busiest week is capped at the second busiest so it can't flatten the rest,
    then a square-root scale and a smooth curve through the weekly points."""
    cap = sorted(weeks)[-2]
    raw = [(min(w, cap) / cap) ** 0.5 for w in weeks]
    kernel = KERNEL  # how much each week borrows from its neighbors; [1] is no blending
    pts = []
    for i in range(len(raw)):
        r = len(kernel) // 2
        vals = [(raw[i + k - r], wt) for k, wt in enumerate(kernel) if 0 <= i + k - r < len(raw)]
        pts.append(sum(v * wt for v, wt in vals) / sum(wt for _, wt in vals))
    top = max(pts)
    pts = [v / top for v in pts]
    out = []
    for x in range(COLS):
        t = x / (COLS - 1) * (len(pts) - 1)
        i = min(int(t), len(pts) - 2)
        f = t - i
        p0, p1, p2, p3 = pts[max(i - 1, 0)], pts[i], pts[i + 1], pts[min(i + 2, len(pts) - 1)]
        v = 0.5 * (2 * p1 + (p2 - p0) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (3 * p1 - p0 - 3 * p2 + p3) * f ** 3)
        out.append(0.12 + 0.83 * max(0.0, min(1.0, v)))  # keep a low floor so quiet weeks still show
    return out


def skyline_grid(weeks, rng):
    """Cells of (glyph, alpha). Solid and dense under the ridge, lighter toward the ridge line, then sprinkles above it."""
    heights = ridge_heights(weeks)
    grid = [[(" ", 0)] * COLS for _ in range(ROWS)]
    for x in range(COLS):
        h = heights[x]
        for y in range(ROWS):
            up = 1 - y / (ROWS - 1)  # 0 at the bottom row, 1 at the top row
            if up <= h:
                depth = 1 - up / h  # 1 at the bottom, 0 at the ridge line
                d = 0.35 + 0.6 * depth ** 0.7 + rng.uniform(-0.12, 0.12)
                edge = (h - up) / 0.10  # within ~10% of the ridge line the glyphs start dropping out
                if edge < 1 and rng.random() > 0.35 + 0.65 * smooth(edge):
                    continue
                alpha = 255
            else:
                gap = up - h
                if rng.random() > 0.55 * (1 - smooth(gap / 0.22)):
                    continue
                d = rng.uniform(0.05, 0.3)
                alpha = 210
            glyph = RAMP[max(1, min(len(RAMP) - 1, int(d * len(RAMP))))]
            grid[y][x] = (glyph, alpha)
    return grid, COLS


def banner_png(grid, cols, total, first, last, glyph_rgb, muted_rgb):
    font = ImageFont.truetype(MONO, 20)
    cw, ch = font.getbbox("A")[2], int(font.size * 1.2)
    rows = len(grid) + 2  # blank, caption
    canvas = Image.new("RGBA", (cols * cw, rows * ch), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    for y, line in enumerate(grid):
        for x, (glyph, alpha) in enumerate(line):
            if glyph != " ":
                draw.text((x * cw, y * ch), glyph, font=font, fill=glyph_rgb + (alpha,))
    left, right = first.strftime("%b %Y"), last.strftime("%b %Y")
    middle = f"{total:,} contributions in the last year"
    caption = left + middle.center(cols - len(left) - len(right)) + right
    for x, glyph in enumerate(caption):  # one glyph per cell, so the caption can't run past the edge
        draw.text((x * cw, (len(grid) + 1) * ch), glyph, font=font, fill=muted_rgb + (255,))
    scale = BANNER_PX * 2 / canvas.width
    return canvas.resize((BANNER_PX * 2, int(canvas.height * scale)), Image.LANCZOS)


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


def info_svg(text_c, muted_c):
    regular = font_b64(MONO, "".join(k + v for k, v in INFO) + "─ ")
    bold = font_b64(MONO_BOLD, "salim mohamed")
    size, step, kw = 14, 24, 10
    top = size + 4
    width = (kw + max(len(v) for _, v in INFO)) * size * 0.602 + 4
    height = top + step * (len(INFO) + 1) + 8
    lines = [
        f'<text x="{width / 2:.0f}" y="{top}" text-anchor="middle" class="b" fill="{text_c}">salim mohamed</text>',
        f'<text x="{width / 2:.0f}" y="{top + step}" text-anchor="middle" fill="{muted_c}">{"─" * 13}</text>',
    ]
    for i, (key, value) in enumerate(INFO):
        lines.append(
            f'<text x="0" y="{top + step * (i + 2)}"><tspan fill="{muted_c}">{escape(key.ljust(kw))}</tspan>'
            f'<tspan fill="{text_c}">{escape(value)}</tspan></text>'
        )
    return "\n".join([
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width:.0f}" height="{height}" viewBox="0 0 {width:.0f} {height}">',
        "<style>"
        f'@font-face{{font-family:"M";src:url(data:font/woff2;base64,{regular}) format("woff2")}}'
        f'@font-face{{font-family:"MB";src:url(data:font/woff2;base64,{bold}) format("woff2")}}'
        f'text,tspan{{white-space:pre;font-family:"M",monospace;font-size:{size}px}} .b{{font-family:"MB",monospace}}'
        "</style>",
        *lines,
        "</svg>",
    ])


weeks, total, first, last = load_weeks()
grid, cols = skyline_grid(weeks, random.Random(SEED))
for theme, (glyph_rgb, muted_rgb, text_c, muted_c) in THEMES.items():
    banner_png(grid, cols, total, first, last, glyph_rgb, muted_rgb).save(f"{out_dir}/skyline_{theme}.png", optimize=True)
    with open(f"{out_dir}/info_{theme}.svg", "w") as f:
        f.write(info_svg(text_c, muted_c))
print(f"{len(weeks)} weeks, {total} contributions, {cols} columns")
