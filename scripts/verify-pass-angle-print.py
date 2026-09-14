import json
import re
import sys
from pathlib import Path

from pypdf import PdfReader


def compact(value: str) -> str:
    return re.sub(r"\s+", "", value or "")


record_path = Path(sys.argv[1]).resolve()
pdf_path = Path(sys.argv[2]).resolve()
record = json.loads(record_path.read_text(encoding="utf-8"))
sections = record.get("report", {}).get("sections", [])
reader = PdfReader(str(pdf_path))
pages = [(page.extract_text() or "") for page in reader.pages]
all_text = compact("\n".join(pages))

summary_titles = [
    compact(f"{section.get('category', '').rstrip('.。')} · {section.get('classification', '').rstrip('.。')}")
    for section in sections
]
title_matches = sum(title in all_text for title in summary_titles)
hook_matches = sum(compact(section.get("hook", "")) in all_text for section in sections)


def displayed_parts(section: dict) -> list[str]:
    hook = section.get("hook", "")
    interpretation = re.sub(
        r"^\[[^\]]+\]\s*", "", section.get("interpretation", "")
    ).strip()
    if hook and interpretation.startswith(hook):
        interpretation = interpretation[len(hook) :].strip()
    return [part.strip() for part in re.split(r"\n\s*\n", interpretation) if part.strip()]


def chunk_coverage(section: dict, width: int = 12) -> float:
    chunks: list[str] = []
    for part in displayed_parts(section):
        normalized = compact(part)
        chunks.extend(
            normalized[index : index + width]
            for index in range(0, len(normalized), width)
            if len(normalized[index : index + width]) >= 6
        )
    if not chunks:
        return 1.0
    return sum(chunk in all_text for chunk in chunks) / len(chunks)


body_coverage = [chunk_coverage(section) for section in sections]
blank_pages = [index + 1 for index, text in enumerate(pages) if len(compact(text)) < 20]

result = {
    "pages": len(pages),
    "expectedSections": len(sections),
    "titleMatches": title_matches,
    "hookMatches": hook_matches,
    "bodyCoverageMinimum": round(min(body_coverage), 4),
    "bodyCoverageAverage": round(sum(body_coverage) / len(body_coverage), 4),
    "sectionsBodyCoverageAtLeast90Percent": sum(value >= 0.9 for value in body_coverage),
    "blankPages": blank_pages,
    "fixedChromeAbsent": all(
        label not in all_text
        for label in map(compact, ["해석 신고", "보관함 열기", "운명상회 공통 하단"])
    ),
}
print(json.dumps(result, ensure_ascii=False, separators=(",", ":")))
