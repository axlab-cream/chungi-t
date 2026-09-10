# 운명상회 안드로이드 작업 공간

`Android_Hybrid_Google_Play_Master_Prompt.md` 15절 구조를 따른다.
서버 저장소와 분리된 폴더라 통째로 들어내 별도 저장소로 옮길 수 있다.

```
android/
  app-shell/            Capacitor 프로젝트 (기존 app/ 에서 이동)
  00-inputs/            프로젝트 입력값과 미확인 항목
  01-audit/             0단계 전수 조사
  02-design/            아키텍처·결제·데이터 설계
  03-plan/              TASK 보드와 위험 목록
  04-qa/                테스트 케이스·결과·증거
  05-store/             스토어 등록 자료
  06-release/           빌드·서명·업로드
  07-handover/          운영 인계
```

`android/` 는 `.vercelignore` 에 있어 서버 번들에 들어가지 않는다.

## 지금 상태

| 단계 | 상태 |
|---|---|
| 서비스 분석 | PASS — `01-audit/` |
| 아키텍처 결정 | **BLOCKED** — `02-design/ADR-001.md` 소유자 판단 대기 |
| 안드로이드 프로젝트 | PASS — `app-shell/` |
| 결제 서버 구현 | IN_PROGRESS — 단위 17개 통과, 실기기 미검증 |
| 릴리스 빌드 | BLOCKED — JDK·Android SDK 없음 |
| 실기기 QA | BLOCKED — 기기 없음 |
| 스토어 자료 | TODO |
| 심사 제출 | 미제출 |

## 서명 키와 비밀값

이 폴더에 넣지 않는다. `app-shell/android/keystore.properties` 는 `.gitignore` 에 있고
`keystore.properties.example` 만 저장소에 남는다.
