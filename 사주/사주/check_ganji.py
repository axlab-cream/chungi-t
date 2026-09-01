# -*- coding: utf-8 -*-
import re
from pathlib import Path
decoded = Path("extracted_decoded.html").read_text(encoding="utf-8")
idx = decoded.find("07_asset_2")
end = decoded.find("08_manseryeok", idx)
sub = decoded[idx:end]
chars = ["갑","을","병","정","무","기","경","신","임","계"]
for c in chars:
    if c in sub:
        print(c, sub.count(c))
for m in re.finditer(r"alt=\"([^\"]+)\"", sub):
    print("ALT", m.group(1))
