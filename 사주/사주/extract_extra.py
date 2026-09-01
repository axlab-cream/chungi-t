# -*- coding: utf-8 -*-
import re, quopri, html
from pathlib import Path
path = Path(__file__).parent / "타이트사주 - 사주팔자, 연애운, 재물운, 궁합 분석.mhtml"
raw = path.read_bytes()
decoded = quopri.decodestring(raw[raw.find(b"<!DOCTYPE"):raw.find(b"------MultipartBoundary", raw.find(b"<!DOCTYPE"))]).decode("utf-8")

print("=== BUTTONS ===")
for m in re.finditer(r"<button[^>]*>(.*?)</button>", decoded, re.DOTALL|re.I):
    t = html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip()
    if t:
        print(t)

print("\n=== REVIEWS AREA ===")
idx = decoded.find("MZ범산")
if idx > 0:
    chunk = decoded[idx:idx+12000]
    for m in re.finditer(r"<h2[^>]*>(.*?)</h2>", chunk, re.DOTALL|re.I):
        print("H2:", html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip())
    for m in re.finditer(r"<p[^>]*>(.*?)</p>", chunk, re.DOTALL|re.I):
        t = html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip()
        t = re.sub(r"\s+", " ", t)
        if len(t) > 15:
            print("P:", t[:300])

print("\n=== SECTION 25 (last saju book) ===")
idx = decoded.find("27_last_saju_book")
if idx > 0:
    chunk = decoded[idx:idx+5000]
    for m in re.finditer(r"<p[^>]*>(.*?)</p>", chunk, re.DOTALL|re.I):
        t = html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip()
        if t:
            print("P:", repr(t))

print("\n=== SECTION 28 / FOOTER ===")
# last section after final saju
idx = decoded.find("28_final_saju")
if idx > 0:
    chunk = decoded[idx:idx+15000]
    for m in re.finditer(r"<p[^>]*>(.*?)</p>", chunk, re.DOTALL|re.I):
        t = html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip()
        t = re.sub(r"\s+", " ", t)
        if t:
            print("P:", t[:200])
    for m in re.finditer(r"<span[^>]*>(.*?)</span>", chunk, re.DOTALL|re.I):
        t = html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip()
        if t and re.search(r"[가-힣]", t):
            print("SP:", t[:100])

print("\n=== SAJU TABLE FULL ===")
idx = decoded.find("07_asset_2")
chunk = decoded[idx:idx+20000]
for m in re.finditer(r"<p[^>]*>(.*?)</p>", chunk, re.DOTALL|re.I):
    t = html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip()
    if t:
        print("P:", t)

print("\n=== OTHER FIXED STRINGS ===")
for kw in ["누적 고객", "감사 후기", "나는솔로", "전체 리뷰", "타이트사주 고객센터", "카카오 채널", "읽음"]:
    if kw in decoded:
        # get context
        i = decoded.find(kw)
        ctx = decoded[i-50:i+100]
        t = html.unescape(re.sub(r"<[^>]+>", " ", ctx))
        print(f"{kw}: ...{t.strip()}...")
