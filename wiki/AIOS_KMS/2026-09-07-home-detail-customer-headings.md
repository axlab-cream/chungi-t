# 집 풍수 상세 고객용 문구 정리

원인: 문단 순서로 풀이/공간 신호/사주 겹침/풀이 5~10을 강제로 붙이고 제목을 두 번 노출. 검색용 ragTopics가 근거 카드로 노출됨.

수정: 원문 대괄호 소제목 유지. 없는 경우 원문 첫 문장을 소제목으로 올리고 나머지를 본문으로 표시. 문장 생략·중복 없음. 한 문장 문단은 해당 문장만 표시. 소수점 2.82를 문장 경계로 나누지 않음. 임의 번호/반복 라벨 삭제. ragTopics는 고객 근거·항목에서 제외. 작성 지침형 제목은 고객용 표현으로 변경.

검증: 관련 테스트 45개 통과, 14서비스 흐름 검사 통과, inline JavaScript 구문 검사 통과. 운영 HTTP 200 및 새 제목 코드/반복 라벨 제거 확인. 저장된 개인 해석이나 계산 내용은 변경하지 않음. 인증된 브라우저에서 해당 reportId를 직접 재열람한 검증은 아님.

## Deploy Result

- URL: https://chungi-kx98fkxhn-ax-lab-cream.vercel.app
- Alias: https://umsh.kr
- Target: production
- Status: 운영 HTML 반영 확인
- Commit: eeccca4 + 미커밋 변경
- Framework: Express / Vercel Node function
- Build Duration: 16초

## Post-Deploy Observability

- Error scan: 배포 직후 최근 5분 오류 로그 조회.
- Drains: 미확인.
- Monitoring: 운영 HTML 확인, 지속 모니터링 미검증.

재사용: 구조화된 원문 제목을 우선 사용하고, 제목이 없으면 번호 대신 원문 도입 문장을 사용한다. 작성 지침·검색 메타데이터는 고객용 근거가 아니다.
