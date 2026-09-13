#!/usr/bin/env python3
"""§17 어휘층을 검사한다.

문장 구조가 매워도 어휘가 낡으면 늙은 글이 된다.
그리고 세대 어휘는 서비스마다 배정이 다르다 — 천명사주에 `텅장`이 들어가면 캐릭터가 깨진다.

  python lexicon.py <파일> [서비스key]
"""
import io
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from spice import body_of  # noqa: E402

# 17-2 문어체 — 어미가 구어여도 이게 들어가면 글이 늙는다
LITERARY = ["흔적", "선명", "양상", "여실히", "자아내", "기인하", "노정",
            "다름 아니", "라 할 수 있", "인 셈이", "그러한", "이러한", "그러므로",
            "임하", "도모하", "영위하", "향유하", "견지하", "부합하", "수반되"]

# 17-1 1층 밈·유행어 — 6개월~1년이면 낡는다. 전 서비스 금지
MEME = ["킹받", "어쩔티비", "중꺾마", "갑분싸", "낄끼빠빠", "TMI", "레게노",
        "억텐", "핵인싸", "existed", "노잼", "꿀잼", "실화냐", "인정?"]

# 17-3 서비스별 배정 — **04 문서에서 읽는다.**
# 하드코딩했더니 제한 등급 9개가 통째로 빠져 오탐 4건이 났다.
DOC = HERE.parent / "revised" / "04-페르소나-상세규정.md"
ASSIGNED, BAN_ALL = {}, {"saju_master", "job_choice", "home_fit"}
_raw = io.open(DOC, encoding="utf-8").read()
for _m in re.finditer(r"^\|\s*`([a-z_]+)`[^|\n]*\|([^|\n]+)\|", _raw, re.M):
    _k, _v = _m.group(1), re.sub(r"\*\*", "", _m.group(2))
    if _k in ASSIGNED or "이유" in _v or "캐릭터의 전부" in _v:
        continue
    ASSIGNED[_k] = [w.strip() for w in _v.split("·") if w.strip()]

# 어느 서비스엔가 배정된 전체 세대 어휘 풀. 여기 있는데 이 서비스 배정이 아니면 위반.
POOL = sorted({w for ws in ASSIGNED.values() for w in ws})


def main():
    path = Path(sys.argv[1])
    key = sys.argv[2] if len(sys.argv) > 2 else None
    body = body_of(path)
    body = re.sub(r"^#{1,6}\s.*$", "", body, flags=re.M)

    lit = [w for w in LITERARY if w in body]
    meme = [w for w in MEME if w in body]

    allowed = ASSIGNED.get(key, []) if key else []
    used = [w for w in POOL if w in body]
    ok_used = [w for w in used if w in allowed]
    bad_used = [w for w in used if w not in allowed]

    print(f"{path.name}" + (f"  (서비스 {key})" if key else "  (서비스 미지정)"))
    print(f"  문어체         {len(lit)}건 {'통과' if not lit else '위반: ' + ', '.join(lit)}")
    print(f"  밈·유행어(1층)  {len(meme)}건 {'통과' if not meme else '위반: ' + ', '.join(meme)}")
    if key:
        print(f"  배정 어휘 사용  {len(ok_used)}개 {', '.join(ok_used) if ok_used else '(없음)'}")
        note = ""
        if len(ok_used) == 0:
            note = "  ← 요즘 말이 하나도 없다"
        elif len(ok_used) > 3:
            note = "  ← 도배(§17-4 항목당 1~2개)"
        print(f"  {'':14}{note}")
        print(f"  미배정 어휘     {len(bad_used)}건 "
              f"{'통과' if not bad_used else '위반: ' + ', '.join(bad_used)}")
    else:
        print(f"  세대 어휘 사용  {', '.join(used) if used else '(없음)'}")

    failed = bool(lit or meme or (key and bad_used))
    print(f"  판정: {'FAIL' if failed else 'PASS'}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
