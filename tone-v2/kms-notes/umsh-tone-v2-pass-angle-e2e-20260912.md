# 운명상회 Tone V2 pass_angle 대표 E2E — 2026-09-12

## observation

새 합성 `pass_angle` 항목을 실제 provider, 기존 최대 2회 재시도, 결정적 검수, 격리 저장 경로로 실행했다. 최종 저장 상태는 `failed`였다. 첫 응답은 다음 판단 기준만 실패했고 두 번째 응답은 직접 답·입력 근거·다음 판단 기준을 통과했지만 장면 판별만 실패했다.

## decision

평가 Task 자체는 DONE으로 닫되 서비스 acceptance는 FAIL로 유지한다. 실패 원고를 complete로 올리거나 gate를 완화하지 않는다. 장면 판별 개선은 다음 승인 Task로 분리한다.

## artifact

- `tone-v2/evaluations/P01-pass-angle-e2e-20260912.json`
- record SHA-256: `c99b60c6828c001e54f6fbc1530caadac09e15fb5ae0e07caecb99e2823abec7`

## QA result

저장 레코드 재생 일치, 환경 격리 1/1, focused 58/58, compiler/task 7/7, 전체 673/673, typecheck, Vercel build, diff check PASS. 독립 검토가 지적한 모델 버전·문장 필드 불일치와 무관 자격증명 잔존 위험을 교정했다.

## lesson

실제 모델 호출 증거는 설정 별칭이 아니라 저장된 resolved model을 기록하고, 하네스의 첫 문장 배열과 진단용 선택 문장을 다른 필드로 분리해야 재현 가능하다. dotenv 이후에는 승인 provider 키·모델 선택자만 허용하고 다른 credential/integration 변수를 제거해야 합성 하네스의 격리 경계가 성립한다. `다음 복기에서`처럼 명시된 작업 맥락과 관찰 가능한 행동의 결합은 구체 장면 후보지만, 모든 행동문을 장면으로 인정하면 안 된다.

## relation

- ZIP-003-037~041
- `personal/carrotcap/notes/umsh-tone-v2-context-grounding-20260912.md`

## next_patch

복기·오답노트·마킹처럼 시험 리뷰 세션을 나타내는 좁은 경계를 추가하고, 대상 없는 일반 명령문과 추상 조언은 계속 실패시키는 테스트를 먼저 작성한다.
