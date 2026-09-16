# Closure Review — job_choice corpus 2.1.0

- task: `task-tone-v2-p05-job-choice-corpus-rag-release-candidate`
- decision: Approved with comments
- critical: 0
- major: 0
- minor: 0

## Review

- 사용자 확인 오퍼·근로 조건, 서버 계산값, 확인되지 않은 회사 현실과 상징 해석을 분리했다.
- 역할·조직·보상·통근·연락·건강·협상 조건, 고용주의 의도와 채용·경력 결과를 입력 없이 만들지 않는다.
- 자미두수 궁 이름은 계산된 자미 명반이 아니라 비교 질문의 관점임을 명시한다.
- 계약·노무·재무·건강 판단은 실제 문서와 관련 전문가 확인을 우선한다.
- 모든 사례는 `가상 사례:`로 표시하고 근거 없는 횟수·기간·마감·규모를 처방하지 않는다.
- 신규 리포트만 2.1.0 후보를 사용하며 기존 저장 리포트는 2.0.0 스냅샷을 유지한다.
- 후보 해시 불일치 시 닫힌 상태로 실패하고 registry 기반 롤백 경로가 명시돼 있다.

## Verification

- focused: 8/8
- related: 217/217 across 16 suites
- full: 871/871 across 120 suites
- typecheck: pass
- Vercel build: pass
- deterministic SHA-256: `e96e35e7d96ec14741ed0282316193d5fd5c49dcb735a88198df6095e0227c09`

## Comment

실제 공급자 출력 평가는 실행하지 않았으며 Production 배포와 고객 데이터 변경도 수행하지 않았다. 상태는 로컬 `candidate`이다.
