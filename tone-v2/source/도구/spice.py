#!/usr/bin/env python3
"""'매운맛'을 잰다.

운영자 요구: "냉정하지만 정확히 포인트를 짚어 방향과 결정에 영향을 주는 표현"

이걸 인상으로 판단하면 매번 답이 달라진다. 네 축으로 쪼개서 센다.

  1. 판정 시작   — 첫 문장이 완충어 없이 판정인가 (§13-1)
  2. 숫자 근거   — 비용·기간·개수가 있는가 (§13-4)
  3. 회피 지적   — 사용자가 안 보는 것을 짚는가 (§13-3)
  4. 행동 지시   — "그래서 뭘 하라는 건데"가 안 남는가 (§12)

그리고 반대 지표 하나를 함께 센다.

  5. 완곡 표현   — 매운맛을 깎는 말. 낮을수록 좋다
"""
import io
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

# 첫 문장을 무디게 만드는 것들
BUFFER = re.compile(r"(수 있어요|수 있습니다|수 있네|수 있어|것 같|편이에요|편입니다|"
                    r"일지도|듯해요|듯합니다)")
BUFFER_HEAD = re.compile(r"^(조금|다소|약간|어느 정도|아마|어쩌면|가능하면)")

# 숫자·기간·개수. 근거의 구체성.
NUMBER = re.compile(r"\d[\d,]*\s*(원|만원|개월|주|일|년|건|개|%|시간|분|살|차)")

# 회피·모순을 짚는 말. "A가 아니라 B"가 핵심 형태다.
AVOID = re.compile(r"(아니라|아니에요|아닙니다|아니네|아니야|대신|보다 먼저|먼저 볼|"
                   r"빼세요|빼게|빼|멈추|미루|보류|착각|반복|같은 자리|되돌아)")

# 다음 행동을 남기는 말
ACTION = re.compile(r"(하세요|보세요|정하세요|확인하세요|적으세요|요구하세요|남기세요|"
                    r"두세요|하십시오|확인하십시오|하게|보게|정하게|해봐|둬봐|봐|"
                    r"확인해요|정해요|해요\.$)")

# 매운맛을 깎는 상투어
SOFT = re.compile(r"(신중하게 생각|충분히 생각|생각해 보|고민해 보|"
                  r"노력해|천천히|여유를 가지|마음을 편히|좋을 것 같|괜찮을 거예요|"
                  r"응원|힘내|잘 될 거|지켜보|기다려 보)")

# 행동 지시. 앞선 목록은 너무 좁아 `받아요`·`쳐요`·`봐야 해요` 를 놓쳤다.
# 해요체/격식체/하게체/반말체의 권고·명령 종결을 넓게 잡는다.
ACTION_WIDE = re.compile(r"([가-힣]{1,4}(세요|십시오|하게|보게|해봐|둬봐)|"
                         r"[가-힣]{1,4}(아요|어요|여요|해요|쳐요|와요)\.|"
                         r"(으로 쳐|없는 것으로|먼저 확인|먼저 정|부터 정|부터 확인))")


def body_of(path):
    raw = io.open(path, encoding="utf-8", errors="replace").read()
    marks = list(re.finditer(r"^codex\s*$", raw, re.M))
    return raw[marks[-1].end():] if marks else raw


def items_of(body):
    found = re.findall(r"^###\s*([^\n]+)\n(.*?)(?=^###|^##\s|\Z)", body, re.M | re.S)
    seen, out = set(), []
    for title, text in found:
        key = title.strip()
        if key in seen:
            continue
        seen.add(key)
        out.append((key, text.strip()))
    return out


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
    judged = numbered = avoided = actioned = softened = 0

    for _, text in items:
        sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
        if not sents:
            continue
        head = sents[0]
        if not (BUFFER.search(head) or BUFFER_HEAD.search(head)):
            judged += 1
        if NUMBER.search(text):
            numbered += 1
        if AVOID.search(text):
            avoided += 1
        if ACTION.search(text) or ACTION_WIDE.search(text):
            actioned += 1
        if SOFT.search(text):
            softened += 1

    return {
        "n": n,
        "판정시작": judged / n,
        "숫자근거": numbered / n,
        "회피지적": avoided / n,
        "행동지시": actioned / n,
        "완곡표현": softened / n,
    }


def main():
    rows = []
    if len(sys.argv) > 1:
        # 파일을 직접 주면 그것만 잰다. 30항목 전량처럼 표본이 큰 것을 볼 때 쓴다.
        for arg in sys.argv[1:]:
            p = Path(arg)
            s = score(p)
            if s:
                rows.append((p.stem, "-", s))
    else:
        index = json.loads(io.open(HERE / "voice20" / "index.json", encoding="utf-8").read())
        for row in index:
            p = HERE / "voice20" / f"out-{row['key']}.md"
            if not p.exists():
                continue
            s = score(p)
            if s:
                rows.append((row["title"], row["style"], s))

    print(f"{'서비스':<22}{'말투':<6}{'판정':>6}{'숫자':>6}{'회피':>6}{'행동':>6}{'완곡':>6}  매움")
    print("-" * 78)
    totals = {k: 0.0 for k in ("판정시작", "숫자근거", "회피지적", "행동지시", "완곡표현")}
    for title, style, s in rows:
        # 매움 = 판정·숫자·회피·행동의 평균에서 완곡을 뺀다.
        spice = (s["판정시작"] + s["숫자근거"] + s["회피지적"] + s["행동지시"]) / 4 - s["완곡표현"]
        bar = "#" * round(max(0, spice) * 10)
        pad = " " * max(0, 22 - sum(2 if ord(c) > 0x2E80 else 1 for c in title))
        print(f"{title}{pad}{style:<6}"
              f"{s['판정시작']:>5.0%}{s['숫자근거']:>6.0%}{s['회피지적']:>6.0%}"
              f"{s['행동지시']:>6.0%}{s['완곡표현']:>6.0%}  {bar} {spice:.2f}")
        for k in totals:
            totals[k] += s[k]

    m = len(rows)
    print("-" * 78)
    avg = {k: v / m for k, v in totals.items()}
    spice = (avg["판정시작"] + avg["숫자근거"] + avg["회피지적"] + avg["행동지시"]) / 4 - avg["완곡표현"]
    print(f"{'평균':<20}{'':<6}"
          f"{avg['판정시작']:>5.0%}{avg['숫자근거']:>6.0%}{avg['회피지적']:>6.0%}"
          f"{avg['행동지시']:>6.0%}{avg['완곡표현']:>6.0%}  → {spice:.2f}")


if __name__ == "__main__":
    main()
