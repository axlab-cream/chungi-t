# -*- coding: utf-8 -*-
"""서비스 하나를 실제 목차로 전량 생성한다. 배치 프롬프트를 만들고 앞 배치를 이월한다.

  python mklong.py <서비스key> <목차파일명> <배치번호>

목차는 제작 쪽이 만들지 않는다(CLAUDE.md §3). `_시나리오/`에서 읽는다.
"""
import io, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from spice import body_of, items_of

KEY, DOC, IDX = sys.argv[1], sys.argv[2], int(sys.argv[3])
SRC = Path("../../_시나리오") / DOC
BASE = Path("full20") / f"{KEY}.md"
OUT = Path("longrun") / KEY; OUT.mkdir(parents=True, exist_ok=True)
BATCH = 2

# 안전 영역이 걸리는 대분류 — 정신건강·몸·돈 위기
SAFE_HINT = ("번아웃", "멘탈", "소진", "건강", "몸", "불안", "스트레스")

raw = io.open(SRC, encoding="utf-8").read()
m = re.search(r"^##\s.*대분류 > 중분류.*$", raw, re.M)
if not m:
    raise SystemExit(f"목차 섹션을 못 찾음: {DOC}")
nxt = re.search(r"^##\s", raw[m.end():], re.M)
sec = raw[m.end():m.end() + (nxt.start() if nxt else len(raw))]
# 섹션 안에 표가 여러 개다. **첫 표만** 목차다.
# (택일시리즈는 `상품|3번 변형`, 개운아이템은 `이렇게|이렇게는 안 됨` 표가 뒤에 붙어 있다.)
tables = re.findall(r"(?:^\|.*$\n?)+", sec, re.M)
sec = tables[0] if tables else sec

groups = []
for row in re.finditer(r"^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|[^|]*\|", sec, re.M):
    t, subs = row.group(1).strip(), row.group(2).strip()
    if t.startswith("---") or t == "대분류" or subs.startswith("---"):
        continue
    items = [re.sub(r"[*`]", "", x).strip() for x in subs.split(",") if x.strip()]
    if items:
        groups.append((t, items))

total = sum(len(i) for _, i in groups)
part = groups[(IDX-1)*BATCH:IDX*BATCH]
if not part:
    raise SystemExit("BATCH_DONE")
n = sum(len(i) for _, i in part)
nbatch = (len(groups) + BATCH - 1) // BATCH

used = []
for k in range(1, IDX):
    f = OUT / f"part{k:02d}.md"
    if not f.exists():
        continue
    for t, x in items_of(body_of(f)):
        if t.startswith("〔"):
            continue
        for s in re.split(r"(?<=[.!?])\s+|\n", x):
            s = s.strip()
            if 4 < len(s) <= 22 and s not in used and not s.startswith("#") \
                    and not re.match(r"^(tokens used|[\d,]+)$", s):
                used.append(s)

HABIT_OK = ("**이 묶음에서 말버릇을 한 번만 씁니다.** 전체에서 두세 번이면 충분합니다.\n"
            "나머지 항목은 말버릇 없이 이 인물의 결로만 씁니다.")
HABIT_NO = ("**이 묶음에서는 말버릇을 쓰지 마십시오.** 다른 묶음에서 이미 썼습니다.\n"
            "말버릇 없이 이 인물의 결로만 씁니다. 그게 진짜 시험입니다.")

base = io.open(BASE, encoding="utf-8").read()
head = base[:base.index("## 생성할 것")]
body = ["## 생성할 것", "",
        f"**{n}개 항목. 각 항목 정확히 5문장.** 소제목은 그대로 쓰십시오.",
        "**항목을 끝낼 때마다 문장을 세십시오.** 넷도 여섯도 아닌 다섯입니다.", "",
        f"## ★ 항목을 빠뜨리지 마십시오 — 이 묶음은 **{n}개**입니다", "",
        "계약 §2.1 — **제공된 목차를 임의로 누락하지 않습니다.** 하나라도 빠지면 계약 위반입니다.",
        f"다 쓴 뒤 소제목 수를 세십시오. **{n}개여야 합니다.**",
        "길다고 뒤쪽을 줄이지 마십시오. 마지막 항목까지 앞과 같은 밀도로 씁니다.", "",
        f"## ★ 긴 목차 규칙 — 이 서비스는 {total}항목입니다", "",
        (HABIT_OK if IDX in (1, max(2, nbatch - 1)) else HABIT_NO), "",
        "**체언 판정을 30% 안팎으로 유지하십시오.** 단 세 문장 연속은 금지입니다.",
        "항목이 많아지면 문장이 길어지고 판정이 사라집니다.",
        "다만 **체크리스트·금지 목록처럼 나열이 형식인 항목**은 연속 규칙을 적용하지 않습니다.",
        "그 경우에도 **마지막 두 문장은 이 서비스의 말투**로 닫습니다.", ""]
if used:
    body += ["## ★ 앞 묶음에서 이미 쓴 문장 — **다시 쓰지 마십시오(§5)**", "", "```"]
    body += used[-40:]
    body += ["```", "", "형태가 비슷해도 안 됩니다. **다른 사실로 새로 쓰십시오.**", ""]
if any(any(h in t for h in SAFE_HINT) for t, _ in part):
    body += ["> **이 묶음에 안전 영역이 있습니다.**",
             "> 체언 판정을 쓰지 않습니다(§13-6). 질병·수면장애를 단정하지 않습니다.",
             "> 위기 신호가 보이면 판정 대신 **확인과 연결**을 줍니다.", ""]
body += ["**항목마다 다른 사실을 씁니다.** 앞 항목의 문장·구문을 반복하면 §5 위반입니다.", ""]
for t, items in part:
    body.append(f"### 〔{t}〕")
    body += [f"### {it}" for it in items]
    body.append("")
body.append("해설 없이 본문만. 한국어.")
io.open(OUT / f"part{IDX:02d}.prompt.md", "w", encoding="utf-8", newline="\n").write(
    head + "\n".join(body))
print(f"  {KEY} part{IDX:02d}: {' / '.join(t for t,_ in part)}  ({n}항목 · 전체 {total} · 이월 {len(used[-40:])})")
