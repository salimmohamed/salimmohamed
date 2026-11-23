"""Build the info card (name, role, school, building, stack) as light and dark SVGs with the font embedded.

Usage: python scripts/build_info.py assets
Needs: pip install fonttools brotli, plus DejaVu Sans Mono (fonts-dejavu-core on Ubuntu).
"""
import base64
import io
import sys
from html import escape

from fontTools import subset
from fontTools.ttLib import TTFont

out_dir = sys.argv[1]

MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
MONO_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
NAME = "salim mohamed"
INFO = [
    ("role", "Software Engineer @ Intuit"),
    ("school", "Oregon State CS '26"),
    ("building", "AI agents, self-hosted infra"),
    ("stack", "TypeScript, Python, React, Next.js"),
]
THEMES = {"light": ("#1f2328", "#6e7781"), "dark": ("#e6edf3", "#7d8590")}  # text, muted


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
    bold = font_b64(MONO_BOLD, NAME)
    size, step, kw = 14, 24, 10
    top = size + 4
    width = (kw + max(len(v) for _, v in INFO)) * size * 0.602 + 4
    height = top + step * (len(INFO) + 1) + 8
    lines = [
        f'<text x="{width / 2:.0f}" y="{top}" text-anchor="middle" class="b" fill="{text_c}">{escape(NAME)}</text>',
        f'<text x="{width / 2:.0f}" y="{top + step}" text-anchor="middle" fill="{muted_c}">{"─" * len(NAME)}</text>',
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


for theme, (text_c, muted_c) in THEMES.items():
    with open(f"{out_dir}/info_{theme}.svg", "w") as f:
        f.write(info_svg(text_c, muted_c))
