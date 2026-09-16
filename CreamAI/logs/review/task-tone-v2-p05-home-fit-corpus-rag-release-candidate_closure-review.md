# Closure Review — home_fit corpus 2.1.0

- task: `task-tone-v2-p05-home-fit-corpus-rag-release-candidate`
- decision: Approved with comments
- critical: 0
- major: 0
- minor: 0

## Review

- 사용자 관찰, 서버 제공 측정값, 미측정 항목과 풍수·오행 상징을 분리했다.
- 미측정 지형·채광·환기·소음·건물·방 수치를 유사 장소나 상징으로 보충하지 않는다.
- 풍수 상징으로 구조 안전, 사고, 건강, 수면 회복, 생산성, 재물, 관계, 부동산 가치 또는 계약 결과를 확정하지 않는다.
- 모든 사례는 `가상 사례:`로 표시하고 실제 점검·측정·전문가 판단이 필요한 결정 경계를 명시했다.
- 전용 `homeReadingCorpus` 경로도 저장된 코퍼스 스냅샷을 받도록 고쳐, 과거 리포트의 생성 프롬프트와 저장 원고 재검수가 최신 코퍼스로 새는 결함을 막았다.
- 신규 리포트만 2.1.0 후보를 사용하며 기존 저장 리포트는 2.0.0 해시를 유지한다.
- 후보 해시 불일치 시 닫힌 상태로 실패하고 registry 기반 롤백 경로가 명시돼 있다.

## Verification

- focused: 8/8
- related: 107/107
- full: 807/807 (112 suites)
- typecheck: pass
- Vercel build: pass

## Comment

실제 공급자 출력 평가는 실행하지 않았으며 Production 배포와 고객 데이터 변경도 수행하지 않았다. 따라서 상태는 배포 완료가 아니라 로컬 `candidate`이다.
