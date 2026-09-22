# 올해 연애운 목차별 실사 이미지 v1

## 목적

`love_this_year` 저장 해석의 대표 표지와 10개 목차에, 같은 그림을 반복하지 않는 실사형 장면을 제공한다.

## 공통 아트 디렉션

- 참조: `01-frontface-window-poster.webp`
- 자연광 창가, 아이보리·연핑크·뮤트 로즈, 실제 인물 질감
- 16:10 가로 배너, 모바일 중앙 크롭에서도 주제가 남는 구도
- 인쇄물 글자·로고·워터마크·일러스트·점성술 소품은 제외

## 목차와 자산

| 목차 | 자산 | 장면 |
| --- | --- | --- |
| 대표 썸네일 | `00-year-love-report-hero-v1.png` | 창가에서 소개 연락을 살피는 리포트 표지 |
| 올해 연애 가능성 | `01-love-possibility-window-v1.png` | 창가에서 소개 연락을 살피는 장면 |
| 내 연애 성향과 끌림 구조 | `02-attraction-cafe-v1.png` | 카페 첫 대화 |
| 도화가 강하게 들어오는 시기 | `03-social-signal-bookshop-v1.png` | 모임에 합류하는 장면 |
| 배우자성으로 보는 인연 유형 | `04-introduction-brunch-v1.png` | 지인을 통한 소개 |
| 만남이 생기기 쉬운 월별 흐름 | `05-monthly-calendar-v1.png` | 약속을 만드는 생활 리듬 |
| 관계가 진전되는 타이밍 | `06-relationship-timing-riverside-v1.png` | 만남 뒤 산책 대화 |
| 놓치기 쉬운 신호와 실수 패턴 | `07-signal-check-window-v1.png` | 답장보다 행동을 점검하는 장면 |
| 상대방 사주 입력 시 궁합 흐름 | `08-compatibility-cards-v1.png` | 두 기준을 나란히 보는 장면 |
| 상대와 나의 감정 온도 차이 | `09-emotional-temperature-cafe-v1.png` | 대화 속도를 살피는 장면 |
| 연애 성사 전략 | `10-action-step-doorway-v1.png` | 실제 만남으로 나서는 장면 |

## 배치 계약

`사주/data/longform-blocks.json`의 `love_this_year.sectionImages`가 목차 `order` 1~10과 같은 순서로 연결된다. 대표 썸네일은 `06-step-6_1-report-detail/index.html`의 `#hero-image`에 직접 연결한다. 다른 서비스에는 영향을 주지 않는다.

## 회원별 적용 범위

대표 썸네일과 목차별 장면은 올해 연애운 서비스의 공용 화면 템플릿 자산이다. `reportId`별로 저장하거나 개인값으로 분기하지 않으므로, 배포된 템플릿은 기존·신규 회원의 같은 서비스 상세 화면에 동일하게 적용된다. 해석 본문과 이름·생년월일시 등 개인 데이터는 이미지 자산에 포함하지 않는다.
