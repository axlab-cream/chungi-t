# -*- coding: utf-8 -*-
"""20개 산출물 전수 QA — 계약 §3(근거) · §4(문체·안전) 위반을 본다.

톤 지표(매움·모호함)와는 다른 층이다. 톤이 좋아도 계약을 어기면 못 나간다.
검사기가 아니라 **계약서**가 기준이다 — `운명상회 템플릿/00-SERVICE-GENERATION-CONTRACT.md`.

  python qa20.py <출력폴더>
"""
import io, json, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from spice import body_of, items_of
from inputs20 import DATA

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "full20/out6")

# ── §4 금지어. 단어가 아니라 **용법**으로 본다(§13-16).
#    `지급 확정 문서`는 인용이고, `확정입니다`는 해설자의 단정이다.
BANNED = [
    (r"무조건", "무조건"),
    (r"반드시", "반드시"),
    (r"100\s?%", "100%"),
    (r"망(한다|해요|합니다|할)", "망한다"),
    (r"확정(이에요|입니다|이야|됩니다|이네요|이라고|해요|해 드려요)", "확정(해설자 단정)"),
    (r"적중률", "적중률"),
    (r"정확도\s*\d+\s?%", "정확도 n%"),
]
# ── §4 안전: 건강·수명·법률·채용·투자 결과 단정
SAFETY = [
    (r"(병|질병|암|우울증|공황)[이가]?\s*(있|생기|올|와요|옵니다)", "질병 단정"),
    (r"(수명이|명이 짧|오래 못 살|오래 못 버티)", "수명 언급"),
    (r"(소송|승소|패소|위법|불법)[이가은는]?\s*(돼요|됩니다|이에요|입니다)", "법률 단정"),
    (r"(합격|불합격|채용)[이가은는]?\s*(돼요|됩니다|확실|보장)", "채용·합격 보장"),
    (r"(수익|수익률|오릅니다|오를 거예요|떨어집니다)", "투자 결과 단정"),
]
# ── §4 내부 용어 노출
INTERNAL = [(r"\bRAG\b", "RAG"), (r"\bKMS\b", "KMS"), (r"\bLLM\b", "LLM"),
            (r"\bDEM\b", "DEM"), (r"evidence_id", "evidence_id"),
            (r"calculated_fact", "calculated_fact"), (r"[a-z_]+\.(csv|json|md|py)", "파일명")]
# ── §10 미래·타인 마음 확정
FUTURE = [
    (r"(상대|그 사람|그분)[가은는이]?\s*[^.]{0,20}(좋아해요|좋아합니다|마음이 있어요|사랑해요)", "타인 마음 확정"),
    (r"\d{1,2}월에\s*(만나|생겨|옵니다|와요|돌아와)", "미래 사건 확정"),
    (r"(반드시|틀림없이|분명히)\s*[^.]{0,15}(해요|됩니다|와요)", "미래 확정"),
]
# ── §4 공포·죄책감
FEAR = [(r"(큰일|위험해요|늦으면 끝|돌이킬 수 없)", "공포"),
        (r"(당신 탓|본인 잘못이에요|자업자득)", "죄책감")]

NUM = re.compile(r"\d[\d,.]*\s*(만원|원|개월|주|일|시간|분|점|%|건|명|회|번|층|cm|m|살|세|kg)?")


def numbers(text):
    """숫자 토큰을 정규화해 뽑는다. 조사·단위 차이는 무시한다."""
    out = set()
    for m in re.finditer(r"\d[\d,]*(?:\.\d+)?", text):
        out.add(m.group(0).replace(",", ""))
    return out


def check(key):
    p = OUT / f"{key}.md"
    body = body_of(p)
    items = items_of(body)
    text = " ".join(t for _, t in items) if items else body
    text = re.sub(r"^(tokens used|[\d,]+)$", "", text, flags=re.M)

    hits = []
    for group, name in ((BANNED, "금지어"), (SAFETY, "안전"), (INTERNAL, "내부용어"),
                        (FUTURE, "확정"), (FEAR, "공포")):
        for pat, label in group:
            for m in re.finditer(pat, text):
                s = max(0, m.start() - 18)
                hits.append((name, label, text[s:m.end() + 12].strip()))

    # ── §3 근거: 본문 숫자가 입력에 있는가
    src = numbers(DATA[key]["inp"])
    # 서수·개수(1·2·3순위)와 연도는 서술 장치로 허용한다
    ALLOW = {"1","2","3","4","5","6","7","8","9","10","2026","2027","12","0"}
    # 입력값끼리의 가감(`320-210=110`)은 창작이 아니라 계산이다.
    # 다만 **계산의 두 항이 같은 문장에 보일 때만** 계산으로 인정한다.
    # 아무 두 값이나 빼면 우연히 맞는다 — 나이 38에서 걸음 8을 빼도 30이 나온다.
    sents = [x.strip() for x in re.split(r"(?<=[.!?])\s+|\n", text) if x.strip()]
    ints = sorted({int(x) for x in src if x.isdigit()})
    derived = set()
    # 계산의 두 항이 인접 문장에 나뉘는 건 정상이다 —
    # `340cm, 짐이 먼저예요. / 소파 260cm는 남는 폭 80cm를 먹어요.`
    for i in range(len(sents)):
        win = " ".join(sents[i:i + 2])
        here = {int(x) for x in numbers(win) if x.isdigit()} & set(ints)
        for a in here:
            for b in here:
                if a < b:
                    derived.update({str(b - a), str(a + b)})
    made = sorted(n for n in numbers(text)
                  if n not in src and n not in ALLOW and n not in derived)
    # 행동 지시에 붙은 수치인지 표시한다 — 판정 근거보다 죄가 가볍지만 §3 위반은 맞다.
    tagged = []
    for n in made:
        m = re.search(re.escape(n) + r"[^.]{0,25}(세요|하세요|보세요|해|십시오|할게요)", text)
        tagged.append((n, "처방" if m else "근거"))
    return hits, tagged, src


rows = json.load(io.open("index20.json", encoding="utf-8"))
print(f"대상: {OUT}\n")
print(f"{'서비스':<20}{'금지어':>6}{'안전':>5}{'내부':>5}{'확정':>5}{'공포':>5}{'출처불명 숫자':>14}")
print("-" * 68)
tot = {"금지어": 0, "안전": 0, "내부용어": 0, "확정": 0, "공포": 0}
detail = []
madecnt = 0
for r in rows:
    hits, made, src = check(r["key"])
    c = {k: sum(1 for h in hits if h[0] == k) for k in tot}
    for k in tot:
        tot[k] += c[k]
    madecnt += len(made)
    if hits or made:
        detail.append((r["key"], hits, made))
    print(f"{r['key']:<20}{c['금지어']:>6}{c['안전']:>5}{c['내부용어']:>5}"
          f"{c['확정']:>5}{c['공포']:>5}"
          f"{(', '.join(f'{n}({t})' for n, t in made) if made else '—'):>14}")
print("-" * 68)
print(f"{'합계':<20}{tot['금지어']:>6}{tot['안전']:>5}{tot['내부용어']:>5}"
      f"{tot['확정']:>5}{tot['공포']:>5}{madecnt:>14}")

if detail:
    print("\n── 상세 ──")
    for key, hits, made in detail:
        print(f"\n▪ {key}")
        for name, label, ctx in hits:
            print(f"   [{name}·{label}] …{ctx}…")
        if made:
            for n, t in made:
                print(f"   [§3·{t}] 입력에 없는 숫자 {n}")


# ══════════════════════════════════════════════════════════════
# 구조 QC — 계약 위반은 아니지만 납품 전에 막아야 하는 것들
# ══════════════════════════════════════════════════════════════
print("\n\n── 구조 QC ──\n")
print(f"{'서비스':<20}{'항목':>4}{'문장':>8}{'중복':>5}{'완충시작':>9}{'평균자':>7}  판정")
print("-" * 62)

BUFFER_HEAD = re.compile(r"^(조금|다소|약간|아마|대체로|어느 정도|웬만하면|되도록|"
                         r"신중하게|천천히|우선은|일단은)")
BUFFER_END = re.compile(r"(수 있어요|것 같아요|편이에요|듯해요|보여요)[.!?]?$")

bad = 0
for r in rows:
    body = body_of(OUT / f"{r['key']}.md")
    items = items_of(body)
    counts, dup, buf, lens = [], 0, [], []
    seen_all = set()
    for title, t in items:
        ss = []
        for x in re.split(r"(?<=[.!?])\s+|\n", t):
            x = x.strip()
            if not x or x.startswith("#") or re.match(r"^(tokens used|[\d,]+)$", x):
                continue
            if x in ss:                      # 항목 안 중복
                dup += 1
                continue
            if x in seen_all:                # 항목 간 중복 (§5 고유성)
                dup += 1
            seen_all.add(x)
            ss.append(x)
        if not ss:
            continue
        counts.append(len(ss))
        lens += [len(x) for x in ss]
        if BUFFER_HEAD.search(ss[0]) or BUFFER_END.search(ss[0]):
            buf.append(title[:10])

    prob = []
    if len(items) != 2:
        prob.append(f"항목{len(items)}개")
    if any(c < 4 or c > 5 for c in counts):
        prob.append(f"문장수{counts}")
    if dup:
        prob.append(f"중복{dup}")
    if buf:
        prob.append("완충시작:" + ",".join(buf))
    if prob:
        bad += 1
    avg = sum(lens) / len(lens) if lens else 0
    print(f"{r['key']:<20}{len(items):>4}{str(counts):>8}{dup:>5}"
          f"{len(buf):>9}{avg:>7.0f}  {'OK' if not prob else ' · '.join(prob)}")
print("-" * 62)
print(f"구조 위반 {bad}건")
