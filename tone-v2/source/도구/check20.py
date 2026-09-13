# -*- coding: utf-8 -*-
"""20개 산출물을 규격 대조한다.

말투 · 말버릇 실사용 · 체언 종결 비율 · 문장 길이.
전부 04 문서에서 기대값을 읽는다. 하드코딩하지 않는다.
"""
import io, json, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from spice import body_of, items_of
import voicecheck

DOC = Path("../revised/04-페르소나-상세규정.md")
raw = io.open(DOC, encoding="utf-8").read()

# 기대 말투 · 말버릇 · 체언 비율
SPEC = {}
for b in re.split(r"\n(?=##\s\d)", raw):
    m = re.match(r"##\s*(\d+)\.\s*(.+?)\s*`([a-z_]+)`", b)
    if not m:
        continue
    style = re.search(r"\|\s*\*\*말투\*\*\s*\|([^\n|]*)\|", b).group(1).replace("**", "")
    hm = re.search(r"^\*\*말버릇\*\*\s*(.*)$", b, re.M)
    SPEC[m.group(3)] = dict(
        n=int(m.group(1)), title=m.group(2).strip(),
        style=style.split("(")[0].split(".")[0].split("`")[0].strip(),
        habits=re.findall(r"`([^`]+)`", hm.group(1)) if hm else [])

# 체언 종결 배정 (축·리듬표)
PCT = {}
for m in re.finditer(r"^\|\s*(\d+)\s*\|.*?\|\s*\**(\d+)%\**\s*\|\s*$", raw, re.M):
    PCT[int(m.group(1))] = int(m.group(2))

def habit_core(h):
    """말버릇에서 고정부만 뽑는다. `~` 자리는 무엇이든 올 수 있다."""
    parts = [p for p in re.split(r"~+", h) if len(p.strip()) >= 2]
    return [re.escape(p.strip().rstrip(".")) for p in parts]

rows = json.load(io.open("index20.json", encoding="utf-8"))
print(f"{'서비스':<20}{'말투':<12}{'체언':>6}{'배정':>6}{'연속':>4}{'말버릇':>8}{'평균자':>7}  판정")
print("-" * 74)
bad = []
for r in rows:
    key = r["key"]; sp = SPEC[key]
    body = body_of(Path(f"full20/out/{key}.md"))
    items = items_of(body)
    sents = []
    for _, t in items:
        for x in re.split(r"(?<=[.!?])\s+|\n", t):
            x = x.strip()
            if (x and x not in sents and not x.startswith("#")
                    and not re.match(r"^(tokens used|[\d,]+)$", x)):
                sents.append(x)
    if not sents:
        continue
    exp = {"하게체·하네체":"하게체"}.get(sp["style"], sp["style"].split(" ")[0])
    cls = [voicecheck.classify(x, exp) for x in sents]
    from collections import Counter
    c = Counter(x for x in cls if x)
    top = c.most_common(1)[0][0] if c else "?"
    # 카탈로그형은 체언 종결이 최다인 것이 정상이다. 나머지 중 최다를 말투로 본다.
    if top == "체언형":
        rest = [(k2, v2) for k2, v2 in c.most_common() if k2 != "체언형"]
        if rest:
            top = rest[0][0]
    nom = sum(1 for x in cls if x == "체언형") / len(sents)
    want = PCT.get(sp["n"])
    used = sum(1 for h in sp["habits"]
               if all(re.search(p, body) for p in habit_core(h)) and habit_core(h))
    avg = sum(len(x) for x in sents) / len(sents)

    # 연속 체언 최대 길이 — §13-8의 진짜 지표
    run = best = 0
    for x in cls:
        run = run + 1 if x == "체언형" else 0
        best = max(best, run)

    CATALOG = {"today_fortune", "lucky_color"}   # §13-8 예외 — 전 항목이 판정형이다
    ok = []
    if best >= 3 and key not in CATALOG:
        ok.append(f"체언연속{best}")
    if key not in CATALOG and nom > 0.50:
        ok.append(f"체언{nom:.0%}>50%")
    STYLE_MAP = {"해요체": "해요체", "하게체·하네체": "하게체", "격식체": "격식체",
                 "반말체": "반말체", "반말체 · 카탈로그형": "반말체"}
    want_style = STYLE_MAP.get(sp["style"], "?")
    if want_style != top:
        ok.append(f"말투({top})")
    # §6 혼용 — 최다만 보면 못 잡는다. wedding_day 가 해요체에 `~습니다` 를 섞었다.
    mixed = {k2: v2 for k2, v2 in c.items() if k2 not in (want_style, "체언형")}
    if mixed:
        ok.append("혼용" + "".join(f"·{k2}{v2}" for k2, v2 in sorted(mixed.items())))
    if used == 0:
        ok.append("말버릇0")

    if ok:
        bad.append((key, ok))
    print(f"{key:<20}{sp['style'][:10]:<12}{nom:>5.0%}"
          f"{(str(want)+'%' if want is not None else '-'):>6}{best:>4}"
          f"{used:>4}/{len(sp['habits'])}{avg:>7.0f}  {'OK' if not ok else ' · '.join(ok)}")
print("-" * 74)
print(f"위반 {len(bad)}건")
