# -*- coding: utf-8 -*-
import re
import quopri
import html as html_module
from pathlib import Path

path = Path(__file__).parent / "타이트사주 - 사주팔자, 연애운, 재물운, 궁합 분석.mhtml"
raw = path.read_bytes()

part_start = raw.find(b"<!DOCTYPE")
part_end = raw.find(b"------MultipartBoundary", part_start)
html_bytes = raw[part_start:part_end]
decoded = quopri.decodestring(html_bytes).decode("utf-8", errors="replace")

# Verify Korean
test = "너의 점사를 풀"
print(f"Search '{test}': {decoded.find(test)}")

# Strip scripts/styles
clean = re.sub(r"<script[^>]*>.*?</script>", "", decoded, flags=re.DOTALL | re.IGNORECASE)
clean = re.sub(r"<style[^>]*>.*?</style>", "", clean, flags=re.DOTALL | re.IGNORECASE)

# Extract sections by <section tags
sections = re.findall(r"<section[^>]*>(.*?)</section>", clean, flags=re.DOTALL | re.IGNORECASE)
print(f"Found {len(sections)} sections")

# Korean regex
korean_re = re.compile(r"[가-힣]+")

def extract_text_from_html(fragment):
  # Remove tags but keep structure markers
  texts = []
  # headings
  for m in re.finditer(r"<h([1-3])[^>]*>(.*?)</h\1>", fragment, re.DOTALL | re.IGNORECASE):
    inner = re.sub(r"<[^>]+>", "", m.group(2))
    inner = html_module.unescape(inner).strip()
    if inner:
      texts.append(("h" + m.group(1), inner))
  # buttons
  for m in re.finditer(r"<button[^>]*>(.*?)</button>", fragment, re.DOTALL | re.IGNORECASE):
    inner = re.sub(r"<[^>]+>", "", m.group(1))
    inner = html_module.unescape(inner).strip()
    if inner:
      texts.append(("button", inner))
  # paragraphs and spans with Korean
  for tag in ["p", "span", "li", "td", "th", "label", "a"]:
    for m in re.finditer(rf"<{tag}[^>]*>(.*?)</{tag}>", fragment, re.DOTALL | re.IGNORECASE):
      inner = re.sub(r"<[^>]+>", "", m.group(1))
      inner = html_module.unescape(inner).strip()
      if inner and korean_re.search(inner):
        texts.append((tag, inner))
  return texts

out_lines = ["# 타이트사주 Teaser Page - Extracted Content\n"]
out_lines.append(f"Source: {path.name}\n")
out_lines.append("## Section Order (HTML structure)\n")

section_labels = []
for i, sec in enumerate(sections):
  # detect section type from images/classes
  label_parts = []
  if "sales_video" in sec or "<video" in sec:
    label_parts.append("intro_video")
  if "01_intro_bg" in sec:
    label_parts.append("intro_visual")
  if "02_hero_character" in sec:
    label_parts.append("personality/hero")
  if "04_worry_bg" in sec:
    label_parts.append("worry")
  if "saju" in sec.lower() or "사주" in sec:
    label_parts.append("saju")
  if "daewoon" in sec.lower() or "대운" in sec:
    label_parts.append("daewoon")
  if "wealth" in sec.lower() or "재물" in sec:
    label_parts.append("wealth")
  if "romance" in sec.lower() or "연애" in sec:
    label_parts.append("romance")
  if "purchase" in sec.lower() or "결제" in sec or "구매" in sec:
    label_parts.append("purchase")
  if "review" in sec.lower() or "리뷰" in sec:
    label_parts.append("reviews")
  if "outro" in sec.lower():
    label_parts.append("outro")
  
  # extract img filenames for identification
  imgs = re.findall(r"teaser/([^\"?]+)", sec)
  if imgs:
    label_parts.extend(imgs[:3])
  
  label = f"section_{i+1}"
  if label_parts:
    label += f" ({', '.join(label_parts[:4])})"
  section_labels.append(label)
  out_lines.append(f"{i+1}. {label}\n")

out_lines.append("\n## Content by Section\n")

for i, (label, sec) in enumerate(zip(section_labels, sections)):
  texts = extract_text_from_html(sec)
  if not texts:
    continue
  out_lines.append(f"\n### {label}\n")
  seen = set()
  for tag, text in texts:
    # normalize whitespace
    text_norm = re.sub(r"\s+", " ", text).strip()
    if text_norm in seen:
      continue
    seen.add(text_norm)
    out_lines.append(f"- **{tag}**: {text_norm}\n")

# Also extract all unique Korean strings globally
out_lines.append("\n## All Unique Korean Text Strings\n")
all_korean = set()
# split by tags and get text nodes
plain = re.sub(r"<[^>]+>", "\n", clean)
plain = html_module.unescape(plain)
for line in plain.split("\n"):
  line = line.strip()
  if line and korean_re.search(line) and len(line) < 500:
    all_korean.add(line)

for s in sorted(all_korean, key=lambda x: (len(x), x)):
  out_lines.append(f"- {s}\n")

out_path = Path(__file__).parent / "extracted_content.md"
out_path.write_text("\n".join(out_lines), encoding="utf-8")
print(f"Written {out_path}")
