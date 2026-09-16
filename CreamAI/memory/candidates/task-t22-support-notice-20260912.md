# T22 지원 공지 버전 저장 패턴

## 재사용 결론

- 고객 콘텐츠는 초안 저장과 공개 발행을 분리한다. 초안은 관리자 API와 서버 전용 자격으로만 읽고, 공개 API는 published 상태의 명시적 DTO allowlist만 반환한다.
- 콘텐츠 위치는 초기 슬라이스에서 코드 소유 상수로 고정한다. 임의 placement, 링크, HTML을 받지 않으면 경로 주입과 공개 화면 오염 범위가 작아진다.
- 발행은 위치 단위 advisory lock 안에서 기존 published를 archived로 바꾸고 draft를 published로 승격한다. partial unique index가 활성 draft와 published를 각각 하나로 제한한다.
- 관리자 변경은 scope, idempotency, audit, checksum, revision CAS를 함께 적용한다. 서비스 역할 외 브라우저 역할에는 테이블/RPC 권한을 주지 않는다.
- 공개 콘텐츠가 없거나 저장소가 실패하면 기존 정적 문서를 유지하고 샘플/목업을 만들지 않는다.
- HTML `hidden`은 author CSS의 display 규칙에 의해 덮일 수 있다. 기존 디자인 시스템의 섹션 클래스를 재사용할 때 `[slot][hidden] { display: none !important; }` 또는 동등한 회귀 방어를 화면으로 확인한다.

## 검증 근거

- 구조화 파서, 저장소 요청 계약, 권한 SQL, 관리자 라우트, 고객 allowlist/null fallback 테스트.
- 운영 Supabase migration 적용 및 local/remote 버전 일치.
- Vercel Production 관리자 화면과 고객센터 빈 상태 브라우저 확인.
- 실제 공지 문구나 고객 데이터, 자격증명은 이 기록에 포함하지 않는다.
