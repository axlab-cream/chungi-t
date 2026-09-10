# Review Report - task-011

## 1. Scope
- Task id: task-011
- Reviewed files: `src/server/app.ts`, `tests/unit/static-exposure.test.ts`, `사주/about.html`, `사주/portal.html`, `사주/privacy.html`, `사주/refund.html`, `사주/support.html`, `사주/terms.html`, `사주/사주/extracted_decoded.html`
- Review time: 2026-09-10T09:21:34Z

## 2. Verdict
- Changes requested
- Summary: 브랜드 변경과 JSON-LD 삽입은 정상이며, 알려진 확장자 및 단일 URL 디코딩 우회 차단도 적절합니다. 그러나 정적 루트 자체를 계속 전체 공개하는 deny-list 방식 때문에 내부 스크래핑 산출물 HTML이 여전히 공개됩니다.

## 3. Critical Issues
- [src/server/app.ts:708,733-734; 사주/사주/extracted_decoded.html:1] `extracted_decoded.html`은 차단 확장자에 포함되지 않아 `/사주/extracted_decoded.html`로 두 번째 정적 마운트에서 그대로 제공됩니다. 파일은 121,199 bytes의 외부 사이트 스크래핑 HTML입니다.
- Risk: 이번 조치의 “내부 산출물 정적 노출 차단” 목적이 충족되지 않습니다. 제3자 콘텐츠·수집 흔적의 공개는 저작권·운영상 위험도 남깁니다.
- Recommendation: 정적 루트 전체 공개를 계속해야 한다면 공개 가능한 경로/파일의 allow-list로 전환하거나, 최소한 이 산출물 및 동일 유형의 비웹 산출물을 정적 트리 밖으로 이동하고 회귀 테스트에 해당 URL을 추가하십시오.

## 4. Major Issues
- [src/server/app.ts:708-719] 확장자 deny-list는 미래의 내부 산출물 확장자 또는 웹 형식으로 저장된 산출물을 자동 보호하지 못합니다. 현재 발견된 `.html` 사례가 이를 입증합니다.
- Risk: `PROMPT.md` 등 현재 알려진 파일은 막아도, 다음 생성 도구가 `.html`, `.csv`, 확장자 없음 등의 파일을 만들면 즉시 공개됩니다.
- Recommendation: 정적 파일을 전용 public 디렉터리로 분리하거나, 서비스별 정적 디렉터리를 명시적으로 마운트하십시오. 저장소 내 산출물을 남길 경우 배포 산출물에서 제외하는 검증도 필요합니다.

## 5. Minor Issues
- [tests/unit/static-exposure.test.ts:51-79] 인코딩 우회 네 가지가 하나의 `it` 블록에 묶여 있습니다. 하나가 실패하면 나머지 변형의 결과가 보고되지 않습니다.
- Risk: 회귀 시 어느 변형이 다시 열렸는지 즉시 식별하기 어렵습니다.
- Recommendation: 각 URL 변형을 독립 테스트 케이스로 분리하십시오.

- [tests/unit/static-exposure.test.ts:103-119] “고객 노출 페이지” 검사 대상은 `사주/` 최상위 HTML 파일만이며, 실제 서비스 화면은 하위 디렉터리에 다수 존재합니다.
- Risk: 테스트 명칭과 보장 범위가 일치하지 않습니다. 이번 변경 대상 4개 파일에는 문제 없지만, 전역 브랜드 통일 회귀를 검출하지 못합니다.
- Recommendation: 전역 통일이 요구사항이면 재귀적으로 HTML을 수집하고, 코드 식별자·허용 JSON-LD를 구조적으로 제외하십시오.

## 6. Verification Gaps
- Gap: 정적 가드는 원본 경로와 한 번 디코딩한 경로를 검사하므로 `PROMPT%2Emd` 우회는 차단합니다. 경로 순회·대소문자·`%00`·이중 인코딩은 Express/send의 실제 배포 OS 경로 해석까지 포함한 테스트가 없습니다.
- Suggested check: 배포와 동일한 Linux 환경에서 URL 정규화, 이중 인코딩, `%00`, trailing slash/dot/space, 백슬래시 및 NTFS ADS 형태를 포함한 요청 매트릭스를 실행하고, 실제 파일 본문이 반환되지 않음을 확인하십시오.

- Gap: `.json`·`.txt`의 과잉 차단은 현재 세 예외만 검증합니다. 저장소 검색상 PWA manifest, `ads.txt`, `security.txt`, Apple App Site Association 등은 현재 참조되지 않아 즉시 회귀 증거는 없습니다. API 라우트도 현재 확장자 기반 URL 사용 증거는 찾지 못했습니다.
- Suggested check: 공개 예정 검증 파일과 PWA 도입 계획을 확정하고, 필요 시 명시 예외 및 API 확장자 경로 회귀 테스트를 추가하십시오.

- Gap: `about.html`과 `portal.html`의 JSON-LD는 각각 유효하게 파싱되었고 Organization에 `name: 운명상회`, `alternateName: UMSH`가 정확히 있습니다. 대량 삭제 사고의 잔존 손상은 현재 diff(+2/-1)와 JSON-LD 관점에서 발견되지 않았습니다.
- Suggested check: HTML 문서 전체 파싱 및 SEO 검증을 CI에서 유지하십시오.

## 7. Final Recommendation
- Next action: `extracted_decoded.html`의 공개 경로를 우선 차단하거나 배포 대상에서 제외한 뒤, deny-list가 아닌 공개 자산 allow-list/전용 public 디렉터리 구조로 정적 제공 방식을 강화하십시오. 그 후 보안 회귀 테스트에 해당 HTML 산출물과 배포 환경 URL 정규화 매트릭스를 추가하십시오.