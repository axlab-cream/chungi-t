# 운명상회 ZIP 전수 TASK와 원본 보존 검수

## observation
ZIP 82개 원본과 펼친 파일 SHA-256 82/82 일치, 추가 파일 0. 규격/인계 8파일, 도구 13, 프롬프트 20, 짧은 샘플 20, 긴 샘플 파트 21.
규격 비어 있지 않은 원문 전체를 1,500개 검토 단위에 보존했다. 제목/예시/역사 기록을 포함하므로 유효 규칙 수나 완료율로 사용하지 않는다.

## decision
사용자 승인에 따라 누락 자료는 ZIP 패턴으로 보강하되 출처를 SUPPLEMENT로 표시한다. 최신 04 정본을 따른다. 파일 존재와 코드 연결을 실제 출력 검수 성공으로 혼동하지 않는다.

## artifact
C:/Users/user/Desktop/chungi-t-tone-v2/tone-v2/EXECUTION-PLAN.md
C:/Users/user/Desktop/chungi-t-tone-v2/tone-v2/TASKS.md
C:/Users/user/Desktop/chungi-t-tone-v2/tone-v2/task-index.json
C:/Users/user/Desktop/chungi-t-tone-v2/tone-v2/source-verification.json
C:/Users/user/Desktop/chungi-t-tone-v2/tone-v2/decisions.md

## QA result
source verification 82/82 PASS. compiler/task-index tests 7/7 PASS. Daily/persistence tests 11/11 PASS after empty daily snapshot regression fix. Full regression 633/633 PASS, 100 suites, 134.5 seconds. Typecheck, vercel-build, diff whitespace checks PASS. Actual generated-report and production acceptance remain incomplete.

## lesson
문서의 절 전체를 최신 문구로 치환하면 비충돌 요구사항도 잃을 수 있다. 바뀐 배정만 교체하고 불변 조건을 테스트한다.
공통 pending 본문 제거는 규칙 기반 즉시완료 흐름에도 영향을 준다. 해당 생산자가 계산 본문을 명시적으로 저장해야 한다.
목차 누락 검사는 생성 결과만 세지 말고 원본 전체와 비교한다. 원문 검토 TASK에도 행 커버리지 검사를 둔다.

## relation
personal/carrotcap/notes/umsh-tone-v2-20260912.md

## next_patch
공통 §1~§3 1차 판독 기록 및 제작용 첫머리/내부용어 검사 반례를 연결했다. 두 검사의 실제 출력 전량 검수는 남아 있다. 나머지 규칙, 숫자 근거 검수, 템플릿 티저, 전체 실제 생성, 보강 감수 도구, 화면/인쇄, 서비스 부착은 미완료다.
