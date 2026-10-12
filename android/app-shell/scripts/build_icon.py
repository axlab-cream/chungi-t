"""Rebuild the gold wordmark launcher icon from the 2048px brand logo.

The brand logo is one line (운명상회). The icon stacks it as 운명 / 상회.
The ㅅ of 상 grows out of the ㅇ of 명, so splitting leaves two cut stroke
ends; both are tapered to a point instead of being left blunt.

usage: python build_icon.py <repo root> <out dir>
"""
import math
import sys

import numpy as np
from PIL import Image, ImageFilter

BG = (10, 9, 8)
root, out = sys.argv[1], sys.argv[2]
src = np.array(Image.open(f"{root}/사주/assets/umsh-brand-logo.png").convert("RGBA")).astype(float)
src[src[..., 3] <= 2] = 0   # near-invisible specks around the logo
H, W = src.shape[:2]
yy, xx = np.mgrid[0:H, 0:W]

CUT = 986                   # where the ㅅ stroke leaves the ㅇ of 명
band = (yy >= 395) & (yy <= 445)
l1 = src.copy()
l1[..., 3] *= xx < 1010
# without the ㅅ stroke, the ㅣ of 명 should run straight into the ㅇ's outer
# curve: join its right edge (x 960 at y 418) to the ㅇ's (x 981 at y 442)
seam = (yy >= 418) & (yy <= 442)
edge = 960 + (yy - 418) * (21 / 24)
l1[..., 3] *= np.where(seam, np.clip(edge + 0.5 - xx, 0, 1), 1)
l1[..., 3] *= ~((yy >= 380) & (yy < 418) & (xx > 992))   # rest of the ㅅ stroke
l2 = src.copy()
l2[..., 3] *= ~((xx < CUT) | ((xx < 1010) & ~band))


def taper(img, box, tip_side, length_k):
    """Fade a cut stroke end inside box to a point. tip_side: 'left' or 'right'."""
    x0, y0, x1, y1 = box
    a = img[y0:y1, x0:x1, 3]
    ys, xs = np.where(a > 128)
    xs = xs + x0
    ys = ys + y0
    i = xs.argmin() if tip_side == "left" else xs.argmax()
    tx, ty = xs[i], ys[i]
    # tip y: centre of the cut face, not its corner
    face = np.abs(xs - tx) <= 1
    ty = ys[face].mean()
    sel = np.abs(xs - tx) >= (x1 - x0) * 0.8 if tip_side == "left" else np.abs(xs - tx) >= (x1 - x0) * 0.8
    fx, fy = xs[sel].mean(), ys[sel].mean()
    ux, uy = fx - tx, fy - ty
    n = math.hypot(ux, uy)
    ux, uy = ux / n, uy / n
    vx, vy = -uy, ux
    t = (xs - tx) * ux + (ys - ty) * uy
    v = (xs - tx) * vx + (ys - ty) * vy
    far = t > t.max() * 0.7
    half = (v[far].max() - v[far].min()) / 2
    centre_at = {}
    for ti, vi in zip(t.astype(int), v):
        lo, hi = centre_at.get(ti, (vi, vi))
        centre_at[ti] = (min(lo, vi), max(hi, vi))
    length = half * length_k
    by, bx = np.mgrid[y0:y1, x0:x1]
    T = (bx - tx) * ux + (by - ty) * uy
    V = (bx - tx) * vx + (by - ty) * vy
    C = np.zeros_like(T)
    for r in range(T.shape[0]):
        for c in range(T.shape[1]):
            lo, hi = centre_at.get(int(T[r, c]), (-half, half))
            C[r, c] = (lo + hi) / 2
    s = np.clip(T / length, 0, 1)
    k = np.clip(half * s ** 0.8 - np.abs(V - C) + 0.5, 0, 1)
    k[T > length] = 1
    img[y0:y1, x0:x1, 3] *= k
    return (tx, ty, round(half, 1), round(length, 1))


print("l2 tip", taper(l2, (CUT, 395, 1080, 446), "left", 4.5))


def to_img(arr):
    im = Image.fromarray(arr.clip(0, 255).astype(np.uint8), "RGBA")
    box = Image.fromarray(((arr[..., 3] > 60) * 255).astype(np.uint8)).getbbox()
    return im.crop(box)


g1, g2 = to_img(l1), to_img(l2)


def compose(size, plate, l1box, l2box):
    """Place each line so its bright-pixel box matches the old icon's."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(plate, (0, 0))
    for g, (bx0, bx1, by0, by1), anchor in ((g1, l1box, "left"), (g2, l2box, "right")):
        scale = (by1 - by0 + 1) / g.height
        w, h = round(g.width * scale), round(g.height * scale)
        r = g.resize((w, h), Image.LANCZOS)
        x = bx0 if anchor == "left" else bx1 + 1 - w
        canvas.alpha_composite(r, (x, by0))
    return canvas


full_plate = Image.new("RGBA", (1024, 1024), BG + (255,))
icon = compose(1024, full_plate, (187, 835, 192, 503), (169, 863, 517, 829))
fg_plate = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
fg_plate.paste(Image.new("RGBA", (730, 730), BG + (255,)), (147, 147))
fg = compose(1024, fg_plate, (281, 742, 284, 505), (269, 762, 516, 738))

sharpen = ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2)
icon = icon.convert("RGB").filter(sharpen)
icon.save(f"{out}/icon.png", optimize=True)
fg.filter(sharpen).save(f"{out}/icon-foreground.png", optimize=True)
icon.resize((512, 512), Image.LANCZOS).filter(sharpen).save(f"{out}/play-store-icon-512.png", optimize=True)
print("line sizes", g1.size, g2.size)
