# 집 풍수 코퍼스 2.0.0 및 생성 규칙

## 변경 범위

집 풍수 전용 10개 지식 블록(hfit-001~010)을 전부 재작성했다. 다른 서비스 코퍼스와 기존 저장된 개인 리포트는 이번 작업에서 수정하지 않았다.

- 전체 배치 요약은 home-fit-overall 전용.
- 2~10번은 주변 환경 / 명리 상징 / 수면 경험 / 출입 / 업무 전환 / 살림 관리 / 공동 사용 합의 / 실행 우선순위 / 의사결정 정보로 분리.
- 고객용 advice에는 작성 지침을 넣지 않음. risk/condition 등은 작성 판단용 메타데이터.
- 생활 예시는 실제 지역 사건이나 고객 경험으로 꾸미지 않음. 검증된 지역 사례 검색 기능은 새로 추가하지 않음.
- 오행·배치가 건강·생산성·재산 결과를 유발한다는 단정 제거. 편한 조건은 유지, 불편한 경우만 선택 가능한 대안 제시.

## 실행 연결

home-reading-corpus.ts가 section.id와 hfit 블록을 1:1로 연결한다. 없는 항목/누락 코퍼스는 실패 처리해 관련 없는 블록으로 대체하지 않는다. 집 풍수 sectionPrompt는 기존 검색 결과 대신 해당 블록을 사용하고, 예전 hook/interpretation 초안을 모델 입력에서 제외한다. context와 featureJson에 근거해 새 본문을 쓰도록 한다. 타 서비스의 기존 검색 경로 유지.

코퍼스와 registry 버전 2.0.0, 프롬프트 manifest 글자 수 갱신.

## 검증 범위

10개 블록 라우팅·고객 문구·조건부 예시 검사, 타입 검사, 프롬프트 가이드 20개 및 흐름 검사 14개 통과. 실제 LLM 10항목 재생성 검수나 개인 저장 리포트 교체는 수행하지 않았다. 기존 리포트는 자동 변경되지 않음.

## 재사용 원칙

질문별로 코퍼스를 분리했더라도 검색이 공통 키워드로 다시 섞으면 중복이 재발할 수 있다. 전용 항목 매핑을 테스트하고, 과거 초안이 새 지침을 덮어쓰지 않도록 생성 입력에서 분리한다.

## 최종 검증 및 배포

- 전체 테스트: 29 suites / 363 tests / 363 pass / 0 fail.
- URL: https://chungi-c43ov4ml5-ax-lab-cream.vercel.app (운영 별칭 https://umsh.kr)
- Target: production
- Status: READY (CLI 배포 완료 및 별칭 연결 확인)
- Commit: eeccca4 + 기존 미커밋 작업 포함. 새 커밋 생성 없음.
- Framework: Express / Vercel Node function
- Build Duration: 14초 (전체 배포 46초). 원격 타입 검사 통과.
- Error scan: 배포 직후 `vercel logs --level error --since 5m --no-follow` 결과 No logs found. 장시간 무오류를 의미하지 않음.
- Drains: 확인하지 않음.
- Monitoring: 공개 집 풍수 시작 페이지 HTTP 200. 로그인된 사용자 생성 흐름 및 신규 10개 LLM 본문은 미검증.
- 기존 키와 저장 리포트는 변경하지 않음. 새 생성 요청부터 적용.
