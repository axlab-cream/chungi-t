# -*- coding: utf-8 -*-
import re
import quopri
from pathlib import Path

path = Path(__file__).parent / "타이트사주 - 사주팔자, 연애운, 재물운, 궁합 분석.mhtml"
raw = path.read_bytes()

part_start = raw.find(b"<!DOCTYPE")
part_end = raw.find(b"------MultipartBoundary", part_start)
html_bytes = raw[part_start:part_end]
decoded = quopri.decodestring(html_bytes).decode("utf-8", errors="replace")

out_path = Path(__file__).parent / "extracted_decoded.html"
out_path.write_text(decoded, encoding="utf-8")
print(f"Written {len(decoded)} chars to {out_path}")
