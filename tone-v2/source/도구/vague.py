#!/usr/bin/env python3
"""모호함을 센다.

§13-1은 완충어(`~수 있어요`)만 막는다. 그런데 완충어가 없어도 안 아픈 문장이 있다.
**설명조**다.

  "돈이 안 모이는 이유는 …때문이에요."      ← 해설. 화자가 뒤로 물러서 있다
  "아끼는 게 아니에요. 순서가 틀린 거예요."   ← 판정. 화자가 정면에 있다

설명조는 문법적으로 단정이지만 **사용자를 때리지 않는다.**
'왜 그런지'를 설명할 뿐 '무엇이 틀렸는지'를 말하지 않기 때문이다.
"""
import io
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from spice import body_of, items_of  # noqa: E402

# 설명조 — 원인을 해설하는 종결. 판정이 아니다.
EXPLAIN = re.compile(r"(때문이에요|때문입니다|때문이야|"
                     r"있어서예요|있어서입니다|있어서야|"
                     r"라서예요|라서 그래요|이라서요|"
                     r"인 이유는|이유는 .{0,30}(예요|입니다|이에요))")

# 정면 부정 — 사용자의 자기 인식을 뒤집는다. 가장 아픈 형태.
DENY = re.compile(r"(아니에요|아닙니다|아니야|아니네|아닐세|아니라|"
                  r"(?<=게 )아니|(?<=건 )아니|"
                  r"틀[렸려린]|틀립니다|반대[예입]|착각|잘못 (보|알)|"
                  r"(?<!고 )있는 게 아니)")

# 남은 완충
HEDGE = re.compile(r"(수 있어요|것 같|편이에요|듯|아마|대체로|어느 정도|웬만하면|"
                   r"조금|다소|약간|가급적|되도록)")


def score(path):
    items = items_of(body_of(path))
    if not items:
        # 소제목이 없는 단일 출력(결 시험 등)은 본문 전체를 한 항목으로 본다.
        body = body_of(path)
        lines = [l.strip() for l in body.splitlines()
                 if l.strip() and not l.startswith("#")
                 and not re.match(r"^(tokens used|[\d,]+)$", l.strip())]
        if not lines:
            return None
        items = [("", " ".join(lines))]
    n = len(items)
    exp = deny = hedge = 0
    for _, text in items:
        sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
        if not sents:
            continue
        if EXPLAIN.search(sents[0]):
            exp += 1
        if DENY.search(text):
            deny += 1
        if HEDGE.search(text):
            hedge += 1
    return {"n": n, "설명조": exp / n, "정면부정": deny / n, "완충": hedge / n}


rows = []
for arg in sys.argv[1:]:
    p = Path(arg)
    s = score(p)
    if s:
        rows.append((p.stem.replace("out-", ""), s))

print(f"{'대상':<22}{'설명조':>8}{'정면부정':>10}{'완충':>8}")
print("-" * 50)
tot = {"설명조": 0.0, "정면부정": 0.0, "완충": 0.0}
for name, s in rows:
    pad = " " * max(0, 22 - sum(2 if ord(c) > 0x2E80 else 1 for c in name[:18]))
    print(f"{name[:18]}{pad}{s['설명조']:>7.0%}{s['정면부정']:>10.0%}{s['완충']:>8.0%}")
    for k in tot:
        tot[k] += s[k]
m = len(rows)
print("-" * 50)
print(f"{'평균':<20}  {tot['설명조']/m:>7.0%}{tot['정면부정']/m:>10.0%}{tot['완충']/m:>8.0%}")
