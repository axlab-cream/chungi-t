# -*- coding: utf-8 -*-
"""예문 골격이 산출물에 얼마나 퍼졌는지 센다.

문장을 그대로 베끼는 일은 드물다. 퍼지는 건 **골격**이다 —
`확인된 건 답장 간격 하나예요` 를 주면 `확인된 건 ~ 하나예요` 가 15개 서비스로 번진다.
완전 일치만 검사하면 이걸 못 잡는다.

  python skeleton.py <출력폴더>
"""
import io, json, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from spice import body_of

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "full20/out9")

# 프롬프트에서 뽑은 예문의 골격. 내용어를 빼고 기능어만 남긴 것.
SKEL = [
    (r"확인된 건 .{0,20}(하나|둘|셋)?(예요|이에요)", "확인된 건 ~예요"),
    (r"남은 건 .{0,20}(하나|둘)?(예요|이에요)", "남은 건 ~예요"),
    (r"그건 이유가 아니라", "그건 이유가 아니라 ~"),
    (r"[가-힣]{2,10} 게 아니라 [가-힣]{2,10}", "A 게 아니라 B"),
    (r"[가-힣]{2,10}보다 [가-힣]{2,12}[이가] (커요|많아요|먼저)", "A보다 B가 커요"),
    (r"그래서 [가-힣 ]{2,15}(안|못) ", "그래서 ~ 안 ~"),
    (r"느낌만 남았", "느낌만 남았어요"),
    (r"[가-힣]{2,10}부터 (끊|보|정하|하)", "~부터 하세요"),
    (r"그래서 남은 게 뭐", "그래서 남은 게 뭐예요?"),
]

rows = json.load(io.open("index20.json", encoding="utf-8"))
print(f"대상: {OUT}\n")
print(f"{'골격':<26}{'쓰는 서비스':>6}   목록")
print("-" * 76)
total = 0
for pat, name in SKEL:
    who = []
    for r in rows:
        if re.search(pat, body_of(OUT / f"{r['key']}.md")):
            who.append(r["key"])
    total += len(who)
    flag = "  ← 과다" if len(who) >= 8 else ""
    print(f"{name:<26}{len(who):>6}   {', '.join(w[:12] for w in who[:5])}"
          f"{' …' if len(who) > 5 else ''}{flag}")
print("-" * 76)
print(f"골격 사용 연인원 {total} · 골격 {len(SKEL)}종 · 서비스당 평균 {total/len(rows):.1f}개")
