# -*- coding: utf-8 -*-
import re, html
from pathlib import Path
decoded = Path("extracted_decoded.html").read_text(encoding="utf-8")

# Top level structure
body = decoded[decoded.find("<body"):decoded.find("</body>")]
# major blocks
blocks = []
for m in re.finditer(r"<(section|div)([^>]*class=\"[^\"]*relative[^\"]*\"[^>]*)>", body):
    tag = m.group(1)
    cls = m.group(2)
    start = m.start()
    # get id hints from nearby content
    snippet = body[start:start+500]
    hints = []
    for img in re.findall(r"teaser/([^\"?]+)", snippet):
        hints.append(img.split(".")[0])
    if hints:
        blocks.append((start, tag, hints[0]))

blocks.sort()
print("MAJOR BLOCKS (first 35):")
for i, (pos, tag, hint) in enumerate(blocks[:35]):
    print(f"{i+1}. <{tag}> {hint}")

# section 20 price area
idx = decoded.find("20_price_character")
print("\nSECTION 20:")
chunk = decoded[idx:idx+3000]
for m in re.finditer(r"<p[^>]*>(.*?)</p>", chunk, re.DOTALL|re.I):
    t = html.unescape(re.sub(r"<[^>]+>","",m.group(1))).strip()
    if t: print(repr(t))

# final sticky bar
idx = decoded.find("범산 도령에게 사주보기")
print("\nSTICKY CTA context:")
print(decoded[idx-200:idx+300])
