# 운명상회 고객 화면 키트

관리자 화면은 `MASTER.md`를 따른다. 이 문서는 고객 퍼널(소개 → 입력 → 티저 → 결제 → 목차 → 상세)의 **입력·버튼·선택**만 다룬다.

참고 원본은 `C:\Users\user\Desktop\preview.html`이다. 색·로고·캠페인 배너는 가져오지 않는다. 가져오는 것은 여백, 한 화면 한 CTA, 액센트 절제, 52px 터치다.

## 원칙

1. 서비스 팔레트는 페이지가 유지한다. 키트는 `--umsh-accent`로 포커스·선택 표시만 물린다.
2. 입력은 430px 프레임에서 1열이다. 이름|성별처럼 두 칸을 나란히 두지 않는다.
3. 예외는 `시간 + 모름`과 생년월일 `년·월·일` 세 칸이다. 네이티브 `type=date`는 OS가 미국식으로 그린다.
4. 단계 버튼은 폼·독 안에서 가로 100%, 높이 52px, radius 8px, 16px/700. `.primary-cta` `.next` `.submit-main` 도 같다. 독(`.bottom-actions` `.sticky-actions` `.form-actions`)은 1열이다.
5. `MY BASE` 같은 영문 눈머리는 고객에게 보이지 않는다.
6. 공용 GNB 버튼은 폼 밖이므로 키트가 키우지 않는다.
7. 화면 제목은 금지/절차가 아니라 **무엇을 얻는지**와 **왜 이 입력이 필요한지**를 말한다.
8. 제출 버튼 문구도 절차(`입력한 정보로…`)가 아니라 그 화면에서 얻는 결과 동사다. 공용 GNB가 있으면 독의 ‘이전’은 두지 않는다.

## 토큰

| 토큰 | 값 | 역할 |
| --- | --- | --- |
| `--umsh-field-height` | 52px | 입력 한 줄 (iOS 16px 줌 방지) |
| `--umsh-cta-height` | 52px | 단계 버튼 |
| `--umsh-field-radius` | 8px | 입력·버튼 |
| `--umsh-card-radius` | 12px | 패널 |
| `--umsh-stack-gap` | 14px | 필드 사이 |
| `--umsh-accent` | 페이지 지정 | 포커스·체크 |

## 파일

- 구현: `사주/css/umsh-kit.css`, `사주/js/umsh-ymd.js`
- 기존 페이지 진입: `사주/css/umsh-field.css` (`@import` 키트)
- 카탈로그: `/ui-kit/` (`사주/ui-kit/index.html`)

## 쓰지 않는 것

- SK 레드 `#EA1738`, 아이스 블루, 혜택 옐로
- 3열 상품 카드
- 페이지 전역 `button { min-height }` — 상단 GNB를 키운다
