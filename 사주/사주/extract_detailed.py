# -*- coding: utf-8 -*-
import re
import quopri
import html as html_module
from pathlib import Path

path = Path(__file__).parent / "타이트사주 - 사주팔자, 연애운, 재물운, 궁합 분석.mhtml"
raw = path.read_bytes()
part_start = raw.find(b"<!DOCTYPE")
part_end = raw.find(b"------MultipartBoundary", part_start)
decoded = quopri.decodestring(raw[part_start:part_end]).decode("utf-8", errors="replace")

clean = re.sub(r"<script[^>]*>.*?</script>", "", decoded, flags=re.DOTALL | re.IGNORECASE)
clean = re.sub(r"<style[^>]*>.*?</style>", "", clean, flags=re.DOTALL | re.IGNORECASE)

sections = re.findall(r"<section[^>]*>(.*?)</section>", clean, flags=re.DOTALL | re.IGNORECASE)

def get_section_name(sec, idx):
    mapping = {
        "sales_video": "1. Intro Video",
        "01_intro_bg": "2. Intro Visual (너의 점사를 풀)",
        "02_hero_character": "3. Personality / Hero Character",
        "04_worry_bg": "4. Worry / Concern",
        "05_palza_bg": "5. Palja (팔자) Intro",
        "06_asset_1": "6. Personality Story",
        "07_asset_2": "7. Saju Table (사주팔자)",
        "08_manseryeok": "8. Manseryeok / Future Flow Teaser",
        "mzmudang_frame8": "9. Character Frame 8",
        "09_character_a": "10. Character A - Chapter Start",
        "union_decoration": None,
        "12_character_c": "12. Wealth Teaser Character",
        "13_wealth_bg": "13. Wealth Section Intro",
        "wealth_chart": "14. Wealth Chart",
        "16_character_d": "15. Romance Teaser Character",
        "16_romance_closeup": "16. Romance Closeup",
        "18_destiny_card": "17. Destiny Card (운명의 상대)",
        "19_character_outro": "18. Outro Character (복채)",
        "17_hand_bells": "19. Hand Bells / Value Prop",
        "21_hand_reach": "21. Hand Reach / Hesitation",
        "22_saju_radial": "22. Comparison - 얄팍한 사주",
        "24_comparison": "23. Comparison BG",
        "25_destiny_bg": "23. Destiny / Full Life Scope",
        "26_date_preview": "24. Report Preview",
        "27_last_saju_book": "25. Last Saju Book",
        "28_final_saju": "27. Final Saju BG",
    }
    for key, name in mapping.items():
        if key in sec and name:
            return name
    imgs = re.findall(r"teaser/([^\"?\.]+)", sec)
    if imgs:
        return f"{idx}. ({imgs[0]})"
    return f"{idx}. section"

def strip_tags(s):
    s = re.sub(r"<br\s*/?>", "\n", s, flags=re.I)
    s = re.sub(r"<[^>]+>", "", s)
    return html_module.unescape(s)

def extract_ordered_text(sec):
    """Walk through HTML and extract text nodes in order."""
    results = []
    # Remove svg content
    sec_no_svg = re.sub(r"<svg[^>]*>.*?</svg>", "", sec, flags=re.DOTALL | re.I)
    
    patterns = [
        (r"<h1[^>]*>(.*?)</h1>", "h1"),
        (r"<h2[^>]*>(.*?)</h2>", "h2"),
        (r"<h3[^>]*>(.*?)</h3>", "h3"),
        (r"<button[^>]*>(.*?)</button>", "button"),
        (r"<p[^>]*>(.*?)</p>", "p"),
        (r"<li[^>]*>(.*?)</li>", "li"),
        (r"<th[^>]*>(.*?)</th>", "th"),
        (r"<td[^>]*>(.*?)</td>", "td"),
        (r"<span[^>]*>(.*?)</span>", "span"),
        (r"<a[^>]*>(.*?)</a>", "a"),
    ]
    
    for pat, tag in patterns:
        for m in re.finditer(pat, sec_no_svg, re.DOTALL | re.I):
            text = strip_tags(m.group(1)).strip()
            text = re.sub(r"\n+", " ", text).strip()
            if text and re.search(r"[가-힣a-zA-Z0-9{}\[\]📮🚫💔🧧🪓💊🚨📈🧑🏻‍🦰🍎👹✂️🤫]", text):
                results.append((m.start(), tag, text))
    
    results.sort(key=lambda x: x[0])
    seen = set()
    ordered = []
    for _, tag, text in results:
        if text not in seen:
            seen.add(text)
            ordered.append((tag, text))
    return ordered

# Also find divs with specific classes for table rows
def extract_saju_table(sec):
    rows = []
    # table headers - look for common saju labels
    labels = ["시주", "일주", "월주", "년주", "천간", "지지", "십성", "십이운성", "신살",
              "시주모름", "일간(나)", "편관", "정관", "편재", "정재", "병", "절", "목욕", "태",
              "망신살", "육해살", "장성살", "은", "경", "신", "임", "계", "갑", "을", "丙", "丁"]
    text = strip_tags(sec)
    for label in labels:
        if label in text:
            rows.append(label)
    return rows

out = []
out.append("# 타이트사주 Teaser/Result Page — Korean Text Extraction")
out.append("")
out.append("**Source:** `타이트사주 - 사주팔자, 연애운, 재물운, 궁합 분석.mhtml`")
out.append("**URL:** https://www.sajutight.me/mzmudang/teaser")
out.append("**Note:** `{d}` = dynamic user name placeholder; `d` = sample user data in saved snapshot")
out.append("")
out.append("---")
out.append("")
out.append("## HTML Section Order")
out.append("")
for i, sec in enumerate(sections):
    name = get_section_name(sec, i + 1)
    out.append(f"{i + 1}. **{name}**")

out.append("")
out.append("---")
out.append("")
out.append("## Section Content (ordered)")
out.append("")

for i, sec in enumerate(sections):
    name = get_section_name(sec, i + 1)
    texts = extract_ordered_text(sec)
    if not texts:
        continue
    out.append(f"### {name}")
    out.append("")
    for tag, text in texts:
        out.append(f"- [{tag}] {text}")
    out.append("")

# CTA buttons globally
out.append("---")
out.append("")
out.append("## CTA / Button Text")
out.append("")
for m in re.finditer(r"<button[^>]*>(.*?)</button>", clean, re.DOTALL | re.I):
    text = strip_tags(m.group(1)).strip()
    if text:
        out.append(f"- {text}")

# Chapter-like labels
out.append("")
out.append("## Chapter / Section Labels (headings)")
out.append("")
for m in re.finditer(r"<h[12][^>]*>(.*?)</h[12]>", clean, re.DOTALL | re.I):
    text = strip_tags(m.group(1)).strip()
    if text:
        out.append(f"- {text}")

# Saju table fixed labels from section 7
sec7 = sections[6] if len(sections) > 6 else ""
out.append("")
out.append("## Saju Table Fixed Labels")
out.append("")
for tag, text in extract_ordered_text(sec7):
    out.append(f"- {text}")

# Purchase package section
out.append("")
out.append("## Purchase / Package Section")
out.append("")
for i, sec in enumerate(sections):
    if "최종 복채" in sec or "나의 사주팔자" in sec:
        for tag, text in extract_ordered_text(sec):
            out.append(f"- [{tag}] {text}")

# Reviews section
out.append("")
out.append("## Reviews Section")
out.append("")
for i, sec in enumerate(sections):
    if "MZ범산" in sec or "실제 리뷰" in sec:
        for tag, text in extract_ordered_text(sec):
            out.append(f"- [{tag}] {text}")

# Destiny card labels
out.append("")
out.append("## Destiny Card Labels (운명의 상대)")
out.append("")
for i, sec in enumerate(sections):
    if "운명의 상대" in sec or "destiny_card" in sec:
        for tag, text in extract_ordered_text(sec):
            out.append(f"- [{tag}] {text}")

# Full content list section 26
out.append("")
out.append("## Full Report Contents List (section 26)")
out.append("")
for i, sec in enumerate(sections):
    if "착한 척은 그만해" in sec:
        for tag, text in extract_ordered_text(sec):
            if tag in ("li", "span", "p"):
                out.append(f"- {text}")

out_path = Path(__file__).parent / "teaser_korean_content.md"
out_path.write_text("\n".join(out), encoding="utf-8")
print(f"Written {out_path}")
