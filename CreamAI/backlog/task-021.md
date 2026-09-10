---
task_id: task-021
status: active
active: true
owner: claude-pm
created: 2026-09-10
priority: P1
depends_on: [task-011, task-020]
resolves: [U35]
---
# task-021 — 정적 자산이 매 요청 함수를 거치고 캐시되지 않는다

## Purpose
운영 응답 헤더 실측(2026-09-10):

```
GET /assets/umsh-brand-logo.png   →  Cache-Control: public, max-age=0
                                     X-Vercel-Cache: MISS
                                     Content-Length: 1,607,763
GET /assets/chungi-asset-one.webp →  max-age=0 · MISS · 341,622 bytes
GET /css/policy.css              →  max-age=0 · MISS
```

**1.6MB PNG 가 매 요청 서버리스 함수를 거치고 엣지에 캐시되지 않는다.**
`X-Vercel-Id: icn1::iad1::…` 는 서울 엣지에서 버지니아 함수까지 왕복한다는 뜻이다.
`express.static` 에 `maxAge` 를 주지 않아 기본값 `max-age=0` 이 나가고, 그 헤더로는
Vercel CDN 이 응답을 보관하지 않는다.

정적 자산은 webp 446 · mp4 56 · png 52 · woff2 9 · ttf 3 개다. 전부 이 경로다.

## 왜 `immutable` 을 쓸 수 없나 (실측 근거)
| 참조 | 건수 |
| --- | --- |
| `/css/**`·`/js/**` 참조 전체 | **789** |
| 그중 `?v=` 버전 쿼리가 붙은 것 | **164 (21%)** |

**79% 가 버전 없는 URL 이다.** 브라우저에 긴 `max-age` 를 주면 배포 후에도 낡은
CSS·JS 를 계속 쓴다. 이미지·영상도 대부분 버전이 없다.

## 설계 — 브라우저는 짧게, 엣지는 길게
```
Cache-Control: public, max-age=300, s-maxage=31536000, stale-while-revalidate=86400
```
- `max-age=300` — 브라우저는 5분마다 재검증한다. 배포 후 낡은 자산을 오래 붙들지 않는다
- `s-maxage=31536000` — 엣지는 길게 보관한다. **Vercel 캐시는 배포 단위로 무효화되므로**
  자산 내용이 바뀌는 유일한 계기(배포)에 자동으로 갱신된다
- `stale-while-revalidate=86400` — 만료 직후 요청도 즉시 응답하고 뒤에서 갱신한다

이 전제("배포 단위 무효화")는 **배포 후 실측으로 확인해야 한다.** 확인 방법은
같은 자산을 두 번 요청해 `HIT` 이 되는지, 그리고 다음 배포 직후 다시 `MISS` 가 되는지다.

## Scope
- Implement:
  - 자산 마운트(`/assets`, `/css`, `/js`, `/cmdg/*`, `/love/*/assets`, `/place/home/assets`)에
    캐시 헤더 부여
  - HTML 은 건드리지 않는다 (라우트가 `sendFile` 로 보내며 배포 즉시 반영돼야 한다)
  - 회귀 테스트: 자산에 캐시 헤더가 있고 HTML 에는 긴 캐시가 붙지 않는다
- Do not implement:
  - `outputDirectory` + 파일시스템 우선 서빙으로의 전환 (U32) — 정적 노출이 다시 열릴
    위험이 있어 Preview 배포에서 따로 검증해야 한다
  - 자산 URL 에 버전 쿼리 일괄 추가 (789곳 수정 — 별건)

## Success Criteria
- [ ] 자산 응답에 `s-maxage` 가 실린다
- [ ] 두 번째 요청이 `X-Vercel-Cache: HIT`
- [ ] HTML 응답은 여전히 즉시 갱신된다
- [ ] `npm run typecheck` 0 오류, `npm test` 전수 통과 (현재 503)
- [ ] Codex 리뷰 Critical/Major 반영

## Risks
- **배포 단위 무효화 전제가 틀리면** 엣지가 낡은 자산을 1년 붙든다.
  → 배포 후 실측으로 확인한다. 틀리면 `s-maxage` 를 짧게(예: 3600) 내린다
- 인증이 필요한 응답에 캐시 헤더가 붙으면 다른 사용자에게 노출된다
  → 자산 마운트에만 적용하고 라우트·API 는 손대지 않는다
- 가드 404 응답이 캐시되면 자산 추가 후에도 404 가 유지될 수 있다
  → 가드 응답에는 캐시 헤더를 붙이지 않는다

## Verification Steps
- 로컬: 자산 응답 헤더 확인, HTML 응답 헤더 확인
- `npm run typecheck` / `npm test`
- 배포 후 운영: 같은 자산 2회 요청 → `MISS` 다음 `HIT`, 헤더 값 확인
- 다음 배포 직후 같은 자산 → `MISS` 로 돌아가는지 (배포 단위 무효화 확인)
