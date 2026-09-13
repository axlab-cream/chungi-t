#!/usr/bin/env python3
"""한 서비스 안에서 말투가 섞였는지 센다 (§6).

§13 이 예시를 해요체로만 제시하면, 하게체·격식체 서비스에서 문단 안에
해요체가 섞여 들어온다. 그걸 잡기 위한 검사다.

  python voicecheck.py <파일> <기대말투>
  기대말투: 해요체 | 하게체 | 격식체 | 반말체

문장 단위로 분류한다. 어미를 세는 방식은 반말체를 거의 못 잡는다 —
반말 종결은 `필요해`·`둬봐`·`단정해져`·`잘 맞아`처럼 형태가 너무 다양해서
목록으로 담기지 않는다. 그래서 **먼저 확실한 것부터 걸러내고 나머지를 반말로 본다.**
"""
import io
import re
import sys

# 확실한 것부터. 순서가 중요하다.
# `앞섭니다`·`낫습니다`처럼 ㅂ불규칙은 `습니다`로 안 끝난다. `~니다` 전체를 잡는다.
FORMAL = re.compile(r"([가-힣]니다|십시오)[.!?]?$")
# 해요체 종결은 `요` 앞에 용언 어간이 온다.
# 그냥 `요$` 로 잡으면 `필요.`·`중요.` 같은 명사가 해요체로 오인된다.
# `요` 종결은 거의 모든 용언 활용 뒤에 붙어서 **앞 글자를 목록화할 수 없다.**
# (`내요`·`나눠요`를 놓쳐 match_couple 을 체언 40%로 오측했다.)
# 그래서 `요$` 를 다 잡고, `요`로 끝나는 **명사만** 예외로 뺀다. 그쪽이 닫힌 목록이다.
NOUN_YO = re.compile(r"(필요|중요|주요|고요|동요|요요)[.!?]?$")
# `금지.`·`급여.`처럼 **한자어 명사**가 반말 어미 글자로 끝난다. 목록으로 뺀다.
NOUN_TAIL = re.compile(r"(금지|유지|정지|방지|중지|연기|급여|참여|관여|기여|통지|고지|공지|인지|의지|취지|처지|현지|각지|여지|이지|단지)[.!?]?$")
HAEYO = re.compile(r"[가-힣]요[.!?]?$|죠[.!?]?$")

HAGE = re.compile(r"(하게|보게|주게|말게|가게|오게|이네|하네|비치네|늦추네|아니네|살리네|"
                  r"죽네|보이네|일세|이군|겠군|하는군|이로군|것일세|하네만)[.!?]?$")
# 하게체 명령형 일반형. 위 목록에 없는 동사(`끊게`·`줄이게`)를 잡는다.
HAGE_GENERAL = re.compile(r"[가-힣]{2,}게[.!?]?$")
# `~네` 일반형(`낮네`·`틀렸네`·`내려갔네`). 하게체에도 반말 감탄에도 쓰여
# **기대 말투를 알 때만** 하게체로 센다. 모르면 반말로 둔다.
NE_GENERAL = re.compile(r"[가-힣]+네[.!?]?$")

# 체언형 = 종결어미 없이 명사·명사구로 끝난다. 반말과 헷갈리므로 따로 뺀다.
# 한국어 용언 종결에 거의 안 쓰이는 받침·글자로 끝나면 명사로 본다.
NOMINAL_TAIL = re.compile(r"[가-힣]*(날|것|점|중|편|각|안|법|일|돈|색|말|밤|낮|손해|보류|"
                          r"기준|조건|흐름|장치|카드|정리|확인|유지|충족|불가|없음|아님|"
                          r"필요|우선|미정|해당|상승각|방어선)[.!?]?$")

# 반말 종결로 흔한 마지막 글자. 위에서 안 걸러진 것 중 이걸로 끝나면 반말로 본다.
# 반말 명령형이 특히 잘 빠진다 — `빼.`·`골라.`·`켜.` 는 어간+어라서 목록이 안 닫힌다.
BANMAL_TAIL = re.compile(r"[가-힣]*(아|어|여|야|지|봐|줘|워|져|둬|내|쳐|셔|해|"
                         r"빼|라|자|와|켜|펴|려|겨|둘러|잖아|거야|이야|할걸)[.!?]?$")
# `~인 해.`·`~는 해.` 는 명사다. 관형형 뒤의 `해` 는 반말이 아니다.
NOUN_HAE = re.compile(r"[는은인을ㄹ의]\s*해[.!?]?$")

QUOTED = re.compile(r"[\"“][^\"”]{0,120}[\"”]")


def classify(sent, expected=None):
    s = sent.strip().rstrip("　 ")
    if not s:
        return None
    if FORMAL.search(s):
        return "격식체"
    if HAEYO.search(s) and not NOUN_YO.search(s):
        return "해요체"
    if HAGE.search(s) or HAGE_GENERAL.search(s):
        return "하게체"
    if expected == "하게체" and NE_GENERAL.search(s):
        return "하게체"
    if NOMINAL_TAIL.search(s):
        return "체언형"
    if BANMAL_TAIL.search(s) and not NOUN_HAE.search(s) and not NOUN_TAIL.search(s):
        return "반말체"
    # 위 어미 중 어느 것도 아니면 명사 종결로 본다.
    # 한국어 종결어미 집합은 닫혀 있고, 명사 종결(`~날.`·`12번.`·`~판.`)은 열려 있어서
    # **명사 쪽을 목록화하면 끝이 없다.** 어미 목록을 정확히 하고 나머지를 체언으로 두는 편이 맞다.
    # 기대 말투로 fallback 했더니 이번엔 `12번.` 이 해요체가 됐다.
    return "체언형"


def main():
    path, expected = sys.argv[1], sys.argv[2]
    raw = io.open(path, encoding="utf-8", errors="replace").read()
    marks = list(re.finditer(r"^codex\s*$", raw, re.M))
    body = raw[marks[-1].end():] if marks else raw

    # 소제목(질문층)은 손님의 속말이라 반말이 정상이다(§13-17). 화자의 말투가 아니므로 뺀다.
    body = re.sub(r"^#{1,6}\s.*$", "", body, flags=re.M)
    # 인용문 안의 반말도 손님의 속말이다.
    body = QUOTED.sub(" ", body)
    # 모델이 같은 응답을 두 번 찍는 경우가 있어 중복 문장은 한 번만 센다.
    sents, seen = [], set()
    for s in re.split(r"(?<=[.!?])\s+|\n+", body):
        s = s.strip()
        if not s or s in seen:
            continue
        seen.add(s)
        sents.append(s)

    counts, samples = {}, {}
    for s in sents:
        kind = classify(s)
        if not kind:
            continue
        counts[kind] = counts.get(kind, 0) + 1
        samples.setdefault(kind, s)

    # 체언형은 말투 중립이라 혼입 판정에서 제외한다(§13-5).
    voiced = {k: v for k, v in counts.items() if k != "체언형"}
    total = sum(voiced.values())

    print(f"{path}  (기대 말투: {expected})")
    for name in ("해요체", "하게체", "격식체", "반말체"):
        n = voiced.get(name, 0)
        share = f"{n / total * 100:4.0f}%" if total else "   -"
        mark = "  ←기대" if name == expected else ("  ⚠ 혼입" if n else "")
        print(f"   {name}  {n:3d}  {share}{mark}")
        if n and name != expected:
            print(f"        예: {samples[name][:70]}")
    print(f"   체언형  {counts.get('체언형', 0):3d}       (말투 중립 · 판정 제외)")

    other = total - voiced.get(expected, 0)
    if total == 0:
        print("   판정: 판정 불가 — 말투가 있는 문장을 찾지 못했습니다")
        return 2
    print(f"   판정: {'PASS' if other == 0 else f'FAIL — 다른 말투 {other}건 혼입'}")
    return 0 if other == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
