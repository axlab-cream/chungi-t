#!/usr/bin/env bash
# 서비스 축으로 병렬, 배치 축으로 순차 생성한다.
#
#   서비스끼리는 독립이라 동시에 돌려도 된다.
#   같은 서비스의 배치는 **앞 배치가 쓴 문장을 넘겨야** §5(고유성)가 지켜지므로 순차다.
#
#   ./runpar.sh                 4개 전부
#   ./runpar.sh pass_angle      하나만

set -u
cd "$(dirname "$0")"

declare -A DOC=(
  [pass_angle]="시험합격_대분류중분류_v1.md"
  [newyear_flow]="신년운세_대분류중분류_v1.md"
  [wedding_day]="택일시리즈_대분류중분류_v1.md"
  [lucky_color]="개운아이템_대분류중분류_v1.md"
)

run_one() {
  local k=$1 d=${DOC[$1]} i=1 out log="longrun/$1/_run.log"
  mkdir -p "longrun/$k"; : > "$log"
  while [ $i -le 12 ]; do
    out=$(PYTHONIOENCODING=utf-8 python mklong.py "$k" "$d" $i 2>&1)
    if echo "$out" | grep -q BATCH_DONE; then break; fi
    # 프롬프트 생성이 실패하면 **즉시 멈춘다.** 그냥 두면 빈 배치로 계속 돈다.
    if echo "$out" | grep -qE "Error|Traceback|SyntaxError"; then
      echo "[$k] part$i 프롬프트 생성 실패 — 중단" >> "$log"
      echo "$out" >> "$log"; return 1
    fi
    printf -v n2 "%02d" $i
    if [ ! -f "longrun/$k/part$n2.prompt.md" ]; then
      echo "[$k] part$i 프롬프트 파일 없음 — 중단" >> "$log"; return 1
    fi
    echo "$out" >> "$log"
    printf -v n "%02d" $i
    cat "longrun/$k/part$n.prompt.md" \
      | codex exec --skip-git-repo-check - > "longrun/$k/part$n.md" 2>&1
    i=$((i+1))
  done
  echo "[$k] 완료 $((i-1))배치" >> "$log"
}

targets=("${@:-pass_angle newyear_flow wedding_day lucky_color}")
[ $# -eq 0 ] && targets=(pass_angle newyear_flow wedding_day lucky_color)

for k in "${targets[@]}"; do
  rm -f "longrun/$k"/part0*.md 2>/dev/null
  run_one "$k" &
done
wait
echo "── 전부 완료 ──"
for k in "${targets[@]}"; do tail -1 "longrun/$k/_run.log"; done
