# -*- coding: utf-8 -*-
"""실제 목차로 만든 서비스들을 한 번에 검사한다.

2항목 샘플로는 §5(항목별 고유성)를 잴 수 없다. 항목이 둘뿐이면 겹칠 일이 없다.
**긴 목차에서만 진짜 시험이 된다.**
"""
import io, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from spice import body_of, items_of
import voicecheck as v

# 계약 §3·§4 패턴 — qa20.py 는 스크립트라 import 하면 통째로 돈다. 여기 따로 둔다.
CONTRACT = [
    r"무조건", r"반드시", r"100\s?%", r"망(한다|해요|합니다|할)",
    r"확정(이에요|입니다|이야|됩니다|이네요|이라고|해요)", r"적중률", r"정확도\s*\d+\s?%",
    r"(병|질병|암|우울증|공황)[이가]?\s*(있|생기|올|와요|옵니다)",
    r"(수명이|명이 짧|오래 못 살|오래 못 버티)",
    r"(합격|불합격|채용)[이가은는]?\s*(돼요|됩니다|확실|보장)",
    r"RAG", r"KMS", r"LLM", r"DEM",
    r"(상대|그 사람|그분)[가은는이]?\s*[^.]{0,20}(좋아해요|좋아합니다|마음이 있어요)",
    r"(큰일|위험해요|늦으면 끝|돌이킬 수 없)", r"(당신 탓|본인 잘못이에요|자업자득)",
]

# 계약 §2.1 — "제공된 풀이 리스트를 임의로 누락하지 않는다."
# 검사 항목인데 지금까지 아무 도구도 보지 않았다. 생성된 것만 세고 목차와 대조하지 않아서다.
DOC = {"pass_angle": "시험합격", "lucky_color": "개운아이템", "quit_fortune": "퇴사운",
       "newyear_flow": "신년운세", "wedding_day": "택일시리즈"}


def norm(t):
    """대조용 정규화. 괄호 주석은 **제작 지침이지 항목명이 아니다.**

    목차의 `새해에 두면 좋은 마음가짐 (※ 종교 의례로 흐르지 않게)` 에서
    괄호 안은 만드는 사람에게 주는 말이다. 산출물 소제목에는 안 들어가는 게 맞다.
    문자열을 그대로 비교했더니 멀쩡한 항목이 누락으로 잡혔다.
    """
    t = re.sub(r"[（(\[][^）)\]]*[）)\]]", "", t)      # 괄호 주석
    t = re.sub(r"[·※*`\"'‘’“”]", "", t)              # 장식 기호
    return re.sub(r"\s+", "", t).strip()


def index_items(key):
    """목차 파일에서 중분류 전체를 읽는다. 제작 쪽이 만들지 않는다(CLAUDE.md §3)."""
    f = Path("../../_시나리오") / f"{DOC[key]}_대분류중분류_v1.md"
    if not f.exists():
        return []
    raw = io.open(f, encoding="utf-8").read()
    m = re.search(r"^##\s.*대분류 > 중분류.*$", raw, re.M)
    if not m:
        return []
    nxt = re.search(r"^##\s", raw[m.end():], re.M)
    sec = raw[m.end():m.end() + (nxt.start() if nxt else len(raw))]
    tb = re.findall(r"(?:^\|.*$\n?)+", sec, re.M)
    sec = tb[0] if tb else sec
    out = []
    for row in re.finditer(r"^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|[^|]*\|", sec, re.M):
        a, b = row.group(1).strip(), row.group(2).strip()
        if a.startswith("---") or a == "대분류" or b.startswith("---"):
            continue
        out += [re.sub(r"[*`]", "", x).strip() for x in b.split(",") if x.strip()]
    return out


STYLE = {"pass_angle": "반말체", "lucky_color": "해요체", "quit_fortune": "해요체",
         "newyear_flow": "해요체", "wedding_day": "해요체"}
# 프롬프트 꼬리가 본문에 새어 나온다 — `해설 없이 본문만. 한국어.` 의 잔재.
NOISE = re.compile(r"^(tokens used|[\d,]+|OpenAI Codex.*|workdir:.*|--+|한국어\.?|해설 없이.*)$")

print(f"{'서비스':<16}{'목차':>5}{'생성':>5}{'누락':>5}{'5문장':>6}{'문장중복':>8}"
      f"{'체언':>6}{'연속':>5}{'말투이탈':>8}{'계약':>5}")
print("-" * 70)
missing_all = {}
tot = {}
for key, style in STYLE.items():
    d = Path("longrun") / (key if key != "quit_fortune" else "quit2")
    parts = [p for p in sorted(d.glob("part0*.md")) if ".prompt" not in p.name]
    if not parts:
        continue
    items, seen, dup = [], {}, 0
    for p in parts:
        for title, text in items_of(body_of(p)):
            if title.startswith("〔"):
                continue
            ss = []
            for x in re.split(r"(?<=[.!?])\s+|\n", text):
                x = x.strip()
                if x and x not in ss and not x.startswith("#") and not NOISE.match(x):
                    ss.append(x)
            if ss:
                items.append((title, ss))
    for title, ss in items:
        for s in ss:
            if s in seen:
                dup += 1
            else:
                seen[s] = title
    firsts = [ss[0] for _, ss in items]
    fdup = len(firsts) - len(set(firsts))
    nom = run_max = mixed = badlen = 0
    ntot = 0
    for title, ss in items:
        cls = [v.classify(x, style) for x in ss]
        nom += sum(1 for c in cls if c == "체언형")
        ntot += len(ss)
        r = 0
        for c in cls:
            r = r + 1 if c == "체언형" else 0
            run_max = max(run_max, r)
        mixed += sum(1 for c in cls if c not in (style, "체언형"))
        if len(ss) != 5:
            badlen += 1
    T = " ".join(" ".join(ss) for _, ss in items)
    con = sum(len(re.findall(pat, T)) for pat in CONTRACT)
    # 계약 §2.1 — 목차 대조. 임의 누락은 위반이다.
    want = index_items(key)
    got = {norm(t) for t, _ in items}
    miss = [w for w in want if norm(w) not in got]
    if miss:
        missing_all[key] = miss
    print(f"{key:<16}{len(want):>5}{len(items):>5}{len(miss):>5}{badlen:>6}{dup:>8}"
          f"{nom/ntot:>5.0%}{run_max:>5}{mixed:>8}{con:>5}")
    tot[key] = (len(want), len(items), len(miss), badlen, dup, run_max, mixed, con)
print("-" * 70)
g = lambda i: sum(t[i] for t in tot.values())
print(f"{'합계':<16}{g(0):>5}{g(1):>5}{g(2):>5}{g(3):>6}{g(4):>8}"
      f"{'':>6}{'':>5}{g(6):>8}{g(7):>5}")
if missing_all:
    print("\n── §2.1 누락 항목 (계약 위반) ──")
    for k, ms in missing_all.items():
        for m_ in ms:
            print(f"  {k}: 「{m_}」")
