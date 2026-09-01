# -*- coding: utf-8 -*-
import re, quopri, html
from pathlib import Path
path = Path(__file__).parent / "타이트사주 - 사주팔자, 연애운, 재물운, 궁합 분석.mhtml"
raw = path.read_bytes()
decoded = quopri.decodestring(raw[raw.find(b"<!DOCTYPE"):raw.find(b"------MultipartBoundary", raw.find(b"<!DOCTYPE"))]).decode("utf-8")

# Chapter labels (Chinese chars in sections)
print("=== CHAPTER LABELS ===")
for m in re.finditer(r"<p[^>]*>(.*?)</p>", decoded, re.DOTALL|re.I):
    t = html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip()
    if re.match(r"^[大運財物愛緣\d\s\-]+$", t) or t in ("大", "運", "財", "物"):
        print(repr(t))

# Find 년주 월주 etc
for kw in ["년주", "월주", "일주", "시주", "천간", "지지", "십성", "십이운성", "신살", "정인", "편인", "식신", "상관", "비견", "겁재", "을", "경", "신", "임", "계", "갑"]:
    if kw in decoded:
        print(f"FOUND: {kw}")

# Section between report preview and chapter_decoration
idx1 = decoded.find("26_date_preview")
idx2 = decoded.find("chapter_decoration_bg")
if idx1 and idx2:
    chunk = decoded[idx1:idx2]
    print("\n=== BETWEEN PREVIEW AND CHAPTER ===")
    for m in re.finditer(r"<p[^>]*>(.*?)</p>", chunk, re.DOTALL|re.I):
        t = html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip()
        if t and len(t) > 3:
            print(repr(t[:150]))

# Section 25
idx = decoded.find("27_last_saju_book")
idx2 = decoded.find("chapter_decoration_bg", idx)
chunk = decoded[idx:idx2]
print("\n=== SECTION 25 FULL ===")
for m in re.finditer(r"<(?:p|span|h[12])[^>]*>(.*?)</(?:p|span|h[12])>", chunk, re.DOTALL|re.I):
    t = html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip()
    if t:
        print(repr(t[:200]))

# Reviews full section with h2
idx = decoded.find("MZ범산도령 실제 리뷰")
chunk = decoded[idx:idx+15000]
print("\n=== REVIEWS FULL ===")
for m in re.finditer(r"<h2[^>]*>(.*?)</h2>", chunk, re.DOTALL|re.I):
    print("H2:", html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip())
for m in re.finditer(r"<p[^>]*>(.*?)</p>", chunk, re.DOTALL|re.I):
    t = html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip()
    t = re.sub(r"\s+", " ", t)
    if t:
        print("P:", t[:250])
for m in re.finditer(r"<a[^>]*>(.*?)</a>", chunk, re.DOTALL|re.I):
    t = html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip()
    if t and re.search(r"[가-힣]", t):
        print("A:", t)

# sticky CTA at bottom
print("\n=== ALL LINK TEXT ===")
for m in re.finditer(r"<a[^>]*>(.*?)</a>", decoded, re.DOTALL|re.I):
    t = html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip()
    if t and re.search(r"[가-힣]", t) and len(t) < 50:
        print(t)
