# Tone V2 P04 pass_angle 전체 목차 계획

## Task

`task-tone-v2-p04-pass-angle-full-outline`

한 번에 이 Task만 수행한다. 52항목 전체 연결과 한 개의 고유 합성 실행을 하나의 수직 슬라이스로 검증한다. 실제 실행이 실패하면 검수 기준을 완화하지 않고 그 최초 결함을 다음 Task로 분리한다.

## Evidence and precedence

1. 목차 이름과 순서는 `tone-v2/source/산출물-실전/pass_angle/part01.md`~`part05.md`의 명시적 52항목 블록만 사용한다.
2. 각 파일의 모델 출력 예시, 가상 입력, 과거 통과 문장은 production 내용·RAG 자료로 재사용하지 않는다.
3. 공통/퍼소나 규칙은 현재 컴파일된 Tone V2 bundle과 production 결정적 review가 권위다.
4. 기존 완료 리포트·ID·소유권은 불변이며 격리된 새 synthetic version만 생성한다.

## Vertical slice

- [x] 다섯 source 블록의 파일 해시와 10/11/10/10/11 항목 분할을 증거화한다.
- [x] RED: 현재 7항목 대신 정확히 52항목, 고유 ID, 제목·그룹·순서를 요구하는 테스트를 추가한다.
- [x] 52항목 구조 정본을 별도 모듈로 만들고 report blueprint/classification/RAG/lens에 연결한다.
- [x] 순차 생성, bounded completed sibling carry, 최초 실패 뒤 후속 미호출, progress 52를 회귀 테스트한다.
- [x] focused/related/compiler/task/full/typecheck/build/diff를 검증한다.
- [x] 고유 version preflight 후 합성 입력으로 실제 provider 실행을 시작한다.
- [x] 완료 항목은 같은 full review로 replay하고 ID·상태·토큰·해시만 sanitized evidence에 남긴다. 이번 실행의 완료 항목은 0개이며 최초 실패 증거를 남겼다.
- [x] 독립 review 피드백을 반영하고 ProjectOps/KMS를 닫는다.

## Outcome

구조 전환은 PASS, 전체 실제 출력 acceptance는 FAIL이다. 첫 항목이 두 번 모두 품질 검수에 실패했고 이후 호출은 0건이다. 다음 결함 Task는 `task-tone-v2-p04-pass-angle-first-section-quality`로 분리했다.

## Stop conditions

- source 제목 수·순서가 52 계약과 다르면 provider를 호출하지 않는다.
- 항목 하나가 기존 최대 재시도 뒤 실패하면 이후 항목은 호출하지 않는다.
- credential, 운영 DB, 고객 데이터, 결제·인증 경로가 감지되면 실행을 중단한다.
- full success 전에는 `pass_angle` 또는 P04 전체 완료를 주장하지 않는다.

## Cost boundary

사용자가 기존 키 재사용과 이번 전체 목차 Task를 승인했다. 호출은 52항목을 상한으로 순차 수행하며 항목별 기존 최대 2회 재시도만 허용한다. 실패 뒤 추가 호출이나 다른 서비스 호출은 하지 않는다.
