#!/usr/bin/env python3
"""Rasterize the 운명상회 favicon mark and refresh HTML icon links.

Source geometry matches 사주/favicon.svg: dark rounded square, gold disk,
thin orbit, short gold bar. CreamWIKI AIOS-AST-06: symbol-only favicon,
identifiable at 16px, ICO 16/32/48, app icons 192/512.
"""

from __future__ import annotations

import io
import re
import struct
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SAJU = ROOT / "사주"
VERSION = "20260917-icon"

BG = (12, 11, 10, 255)
GOLD = (216, 186, 114, 255)
GOLD_DEEP = (197, 161, 82, 255)

ICON_BLOCK = (
    f'<link rel="icon" href="/favicon.svg?v={VERSION}" type="image/svg+xml" />'
    f'<link rel="icon" href="/favicon.ico?v={VERSION}" sizes="any" />'
    f'<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v={VERSION}" />'
    f'<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png?v={VERSION}" />'
    f'<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v={VERSION}" />'
    f'<link rel="manifest" href="/manifest.json?v={VERSION}" />'
)

PRETTY_ICON_BLOCK = (
    f'<link rel="icon" href="/favicon.svg?v={VERSION}" type="image/svg+xml" />\n'
    f'    <link rel="icon" href="/favicon.ico?v={VERSION}" sizes="any" />\n'
    f'    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v={VERSION}" />\n'
    f'    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png?v={VERSION}" />\n'
    f'    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v={VERSION}" />\n'
    f'    <link rel="manifest" href="/manifest.json?v={VERSION}" />'
)

EXISTING_BLOCK = re.compile(
    r'<link rel="icon" href="/favicon\.ico(?:\?v=[^"]*)?"(?: sizes="any")?\s*/?>'
    r'(?:\s*<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32\.png(?:\?v=[^"]*)?"\s*/?>)?'
    r'(?:\s*<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16\.png(?:\?v=[^"]*)?"\s*/?>)?'
    r'(?:\s*<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon\.png(?:\?v=[^"]*)?"\s*/?>)?',
    re.IGNORECASE,
)


def render_mark(size: int, *, maskable: bool = False, orbit: bool | None = None) -> Image.Image:
    if orbit is None:
        orbit = size >= 24
    scale = 8 if size <= 48 else 4
    canvas = size * scale
    img = Image.new("RGBA", (canvas, canvas), BG)
    draw = ImageDraw.Draw(img)

    inset = canvas * (0.14 if maskable else 0.0)
    box = (inset, inset, canvas - inset, canvas - inset)
    if maskable:
        radius = (box[2] - box[0]) * 0.25
        draw.rounded_rectangle(box, radius=radius, fill=BG)

    inner = box[2] - box[0]
    cx = (box[0] + box[2]) / 2
    cy = box[1] + inner * 0.445
    if orbit:
        orbit_r = inner * 0.268
        stroke = max(scale * (1.2 if size >= 32 else 1.0), inner * 0.036)
        draw.ellipse(
            (cx - orbit_r, cy - orbit_r, cx + orbit_r, cy + orbit_r),
            outline=GOLD,
            width=int(round(stroke)),
        )

    disk_r = inner * (0.168 if orbit else 0.20)
    draw.ellipse((cx - disk_r, cy - disk_r, cx + disk_r, cy + disk_r), fill=GOLD)

    bar_w = inner * 0.412
    bar_h = inner * 0.068
    bar_y = box[1] + inner * 0.722
    draw.rounded_rectangle(
        (cx - bar_w / 2, bar_y, cx + bar_w / 2, bar_y + bar_h),
        radius=bar_h / 2,
        fill=GOLD_DEEP,
    )
    return img.resize((size, size), Image.Resampling.LANCZOS)


def write_png(path: Path, size: int, **kwargs: object) -> None:
    render_mark(size, **kwargs).save(path, format="PNG", optimize=True)


def png_bytes(image: Image.Image) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    return buffer.getvalue()


def write_ico(path: Path) -> None:
    # Chrome bookmark trays read the 16px ICO entry. PNG-in-ICO keeps
    # per-size geometry (no orbit at 16, orbit from 32) instead of
    # downscaling one 256px bitmap.
    frames = {
        16: render_mark(16, orbit=False),
        32: render_mark(32, orbit=True),
        48: render_mark(48, orbit=True),
        256: render_mark(256, orbit=True),
    }
    sizes = sorted(frames)
    blobs = [png_bytes(frames[size]) for size in sizes]
    offset = 6 + 16 * len(sizes)
    out = bytearray(struct.pack("<HHH", 0, 1, len(sizes)))
    for size, blob in zip(sizes, blobs):
        stored = 0 if size >= 256 else size
        out += struct.pack("<BBBBHHII", stored, stored, 0, 0, 1, 32, len(blob), offset)
        offset += len(blob)
    for blob in blobs:
        out += blob
    path.write_bytes(out)


def rewrite_html() -> int:
    updated = 0
    for path in SAJU.rglob("*.html"):
        text = path.read_text(encoding="utf-8")
        if f"v={VERSION}" in text and "favicon.svg" in text:
            continue
        if "favicon.ico" not in text and "apple-touch-icon" not in text:
            continue
        pretty = "\n    <link rel=\"icon\"" in text
        replacement = PRETTY_ICON_BLOCK if pretty else ICON_BLOCK
        next_text, count = EXISTING_BLOCK.subn(replacement, text, count=1)
        if count == 0:
            continue
        if next_text != text:
            path.write_text(next_text, encoding="utf-8", newline="\n")
            updated += 1
    return updated


def main() -> None:
    write_png(SAJU / "favicon-16x16.png", 16, orbit=False)
    write_png(SAJU / "favicon-32x32.png", 32)
    write_png(SAJU / "favicon-48x48.png", 48)
    write_png(SAJU / "apple-touch-icon.png", 180)
    write_png(SAJU / "icon-192.png", 192)
    write_png(SAJU / "icon-512.png", 512)
    write_png(SAJU / "icon-512-maskable.png", 512, maskable=True)
    write_ico(SAJU / "favicon.ico")
    changed = rewrite_html()
    print(f"wrote icons under {SAJU}")
    print(f"updated {changed} html files")


if __name__ == "__main__":
    main()
