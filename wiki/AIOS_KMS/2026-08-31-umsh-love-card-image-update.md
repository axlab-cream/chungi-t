# AIOS KMS 기록: UMSH LOVE 카드 이미지 교체

## Context

- 요청 위치: `https://chungi-t.vercel.app/` 포탈의 대표 상품 LOVE 카드
- 사용자 지정 이미지: `C:\Users\user\Downloads\f9fc7b16-2563-416d-a5c7-0727adf87ba1.png`
- 대상 파일: `사주/portal.html`, `사주/css/portal.css`

## Decision

원본 PNG 전체를 그대로 카드 안에 넣으면 이미지 내부의 큰 제목과 포탈 카드의 제목/가격 텍스트가 중복된다. 따라서 인물, 하트 소품, 핑크 조명 분위기를 살리고 하단 내장 제목 영역은 제거한 카드용 WebP asset으로 변환한다.

## Implementation

- 새 asset: `사주/사주/assets/umsh-love-card-bg.webp`
- LOVE 대표 카드에 `is-love` 클래스를 추가하고 이미지 경로를 새 asset으로 교체했다.
- 포탈 HTML에 LOVE 카드 이미지 preload를 추가했다.
- LOVE 카드 전용 이미지 opacity, brightness, object-position, shade를 분리해 텍스트 가독성을 유지했다.
- CSS/JS 캐시 버전 쿼리를 `20260831-love-card`로 갱신했다.

## Verification

- `npm run typecheck`: 통과
- 로컬 서버: `http://localhost:8791/`
- `/assets/umsh-love-card-bg.webp`: HTTP 200, `image/webp`, 94,554 bytes
- Playwright CLI screenshot: `tmp/umsh-home-check.png`

## Reuse Rule

포탈 대표 카드 이미지를 교체할 때는 원본 포스터에 텍스트가 포함되어 있는지 먼저 확인한다. 카드 UI가 별도 제목/가격을 올리는 구조라면 원본을 그대로 쓰지 말고 카드용 crop asset을 만들어 중복 텍스트를 피한다.
