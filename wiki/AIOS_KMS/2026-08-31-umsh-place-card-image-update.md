# AIOS KMS 기록: UMSH PLACE 카드 이미지 교체

## Context

- 요청 위치: `https://chungi-t.vercel.app/` 포탈의 대표 상품 PLACE 카드
- 사용자 지정 이미지: `C:\Users\user\Downloads\ChatGPT Image 2026년 8월 31일 오후 07_54_18.png`
- 대상 파일: `사주/portal.html`, `사주/css/portal.css`

## Decision

원본 포스터에는 하단에 큰 제목 문구가 포함되어 있다. 포탈 대표 카드는 별도의 제목, 설명, 가격 UI를 올리는 구조이므로 원본 이미지를 그대로 넣지 않고, 인물·나침반·집 배경이 보이는 상단부만 카드용 WebP로 변환한다.

## Implementation

- 새 asset: `사주/사주/assets/umsh-place-card-bg.webp`
- PLACE 대표 카드에 `is-place` 클래스를 추가하고 이미지 경로를 새 asset으로 교체했다.
- 포탈 HTML에 PLACE 카드 이미지 preload를 추가했다.
- PLACE 카드 전용 opacity, brightness, object-position, shade, hover filter를 추가해 텍스트 가독성을 유지했다.
- CSS 캐시 버전 쿼리를 `20260831-place-card`로 갱신했다.

## Verification

- `npm run vercel-build`: 통과
- 운영 HTML: `umsh-place-card-bg.webp`, `is-place`, `20260831-place-card` 반영 확인
- 운영 asset: `https://chungi-t.vercel.app/assets/umsh-place-card-bg.webp` HTTP 200, `image/webp`, 145,922 bytes
- Vercel production: `dpl_D8N82LYDVJXoFze83gY1P21sbQLv`, Ready, alias `https://chungi-t.vercel.app`

## Reuse Rule

포탈 카드용 이미지는 원본 포스터의 텍스트 영역을 그대로 쓰지 않는다. 카드 UI가 별도 카피를 얹는 구조에서는 인물·상징물·배경만 남긴 crop asset을 만들고, 카드별 전용 shade로 가독성을 조정한다.
