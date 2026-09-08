# 집 풍수 실제 생성 QA 및 PDF

## 요청과 범위
집 풍수 코퍼스 2.0.0의 실제 생성 검수와 PDF 제공. 기존 키 재사용. 실제 고객 저장 리포트는 읽거나 변경하지 않았다. 출생시간 미상·지형 미제공의 가상 입력으로 운영 생성 함수를 실행했다. 로그인/결제/서비스 PDF 다운로드 E2E가 아닌 별도 로컬 생성 검수다.

## 오류와 수정
초기 실제 생성에서 2번도 현관·침실·책상을 다시 설명했다. `src/prompt/service-system.ts`의 필수 용어 규칙이 전체 공간 나열을 강제하는 것을 발견했다. 집 풍수만 주제에 관련된 용어를 선택하도록 수정하고 생성 요청에 모든 문단의 구체적 소제목을 요구했다. 초기 출력은 output/home-generation-qa에 보존했다.

## 검수 결과
output/home-generation-qa-v2/generated.json: 10개 모두 실제 모델 gpt-5.5-2026-04-23 생성. 현관/집중력/살림은 한자 설명 검수 실패 후 각 1회 재시도로 통과. 기존 자동 형식 검수 통과가 편집 품질 통과를 의미하지 않는다.

45자 이상 정확히 같은 문장 중복 0건. 그러나 정화 소개 10개 전부 반복, 조용함/아침 피로 재소개, 9~10번 실행 조언 의미 중복이 남음. 일부 소제목과 문장 윤문, 수/토 보완을 개인 용신으로 오독하지 않도록 추가 편집 필요. **고객용 출시 품질 판정은 보완 필요**. 검수 JSON에 구체적 근거 기록. 본문을 수작업으로 고쳐 실제 출력처럼 보이게 하지 않았다.

## PDF
output/pdf/home-reading-generation-qa.pdf, 23쪽. 표지에 가상 검수 입력 및 개인 리포트 아님 명시. 검수 요약, 목차, 생성 본문 10개 포함. ReportLab/맑은 고딕 임베딩, pypdf 목차/텍스트 확인, Poppler 전체 페이지 렌더 접촉 시트와 표지/검수/본문 확대 육안 점검. 표지 검수 내용 넘침을 별도 페이지로 분리해 수정했다.

## 코드 검증과 배포
- 전체 테스트 364/364 통과, 29 suites, 타입 검사 통과.
- URL: https://chungi-bbq824qb5-ax-lab-cream.vercel.app (https://umsh.kr 별칭)
- Target: production / Status: READY
- Commit: eeccca4 + 기존 미커밋 변경 보존, 새 커밋 없음
- Framework: Express / Vercel Node function
- Build Duration: 15초 (전체 47초)
- Error scan: 배포 직후 --level error --since 5m 결과 No logs found. 무트래픽 구간의 제한된 확인.
- Drains: 미확인. Monitoring: 인증 사용자 E2E 미검증.

## 재사용
서비스 전용 지침뿐 아니라 최종 합성된 공통/필수 용어 규칙까지 실제 LLM 출력으로 검수해야 한다. 문자열 중복 검사만으로 의미 중복·개인화의 품질을 통과시키지 않는다.
