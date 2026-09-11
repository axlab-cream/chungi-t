# 넥서스 완성도·속도 테스트

테스트 시각: 2026-09-05 KST

## 대상

- 고정 외부 주소: `https://nexus.crea-m.com/umsh-video/`
- 내부 직접 주소: `http://127.0.0.1:4177`
- 서버 경로: `/home/creamboss/project/umsh-video-pipeline`
- 실행 방식: user systemd `umsh-video-pipeline`

## 완성도 결과

| 항목 | 결과 |
|---|---|
| 서비스 상태 | `active`, `enabled` |
| HTTPS 응답 | `HTTP/2 200` |
| Node 문법 검사 | 통과 |
| CLI dry-run | 통과 |
| 브라우저 UI 테스트 | 통과 |
| 예제 불러오기 | 통과 |
| 다시 계산 | 통과 |
| 프롬프트 한글 표시 | 통과 |
| 준비 압축파일 생성 | 통과 |
| 1컷 영상 초안 렌더 | 통과 |
| 4컷 영상 초안 렌더 | 통과 |

브라우저 테스트 스크린샷:

```text
/home/creamboss/project/영상/_generated/ui-smoke/20260905-145735/ui-smoke.png
```

## 영상 결과

1컷 렌더 결과:

```text
/home/creamboss/project/영상/_generated/nexus-motion-benchmark/20260905-145521/videos/01-cafe-real-person.mp4
```

4컷 렌더 결과:

```text
/home/creamboss/project/영상/_generated/nexus-motion-4cut-benchmark/20260905-145712/videos/
```

검증값:

| 항목 | 값 |
|---|---|
| 해상도 | 720x1280 |
| 길이 | 7.000000초 |
| 프레임 | 175 |
| FPS | 25 |
| 4컷 완료 | 4/4 |
| 4컷 실패 | 0 |

## 속도 결과

| 테스트 | 결과 |
|---|---:|
| CLI dry-run | 0.08초 |
| 브라우저 전체 UI 테스트 | 1.02초 |
| 1컷 7초 mp4 렌더 | 0.83초 |
| 4컷 7초 mp4 렌더 | 3.10초 |
| 4컷 기준 컷당 렌더 | 약 0.78초 |

내부 API 평균:

| API | 평균 | 최소 | 최대 |
|---|---:|---:|---:|
| `/` | 6.3ms | 0.4ms | 28.0ms |
| `/api/example` | 0.5ms | 0.4ms | 0.7ms |
| `/api/plan` | 1.0ms | 0.5ms | 2.4ms |
| `/api/dry-run` | 2.1ms | 0.9ms | 5.9ms |

고정 외부 주소 평균:

| API | 평균 | 최소 | 최대 |
|---|---:|---:|---:|
| `/umsh-video/` | 483.5ms | 1.3ms | 2411.3ms |
| `/umsh-video/api/example` | 143.5ms | 0.9ms | 711.4ms |
| `/umsh-video/api/plan` | 1.6ms | 1.2ms | 1.9ms |
| `/umsh-video/api/dry-run` | 3.1ms | 1.8ms | 8.0ms |

고정 외부 주소에서 일부 요청은 DNS/TLS 구간이 튀었습니다. 앱 처리 자체는 내부 기준 밀리초 단위로 안정적입니다.

## 판단

현재 완성도는 “운영 가능한 내부 제작 도구” 기준으로 통과입니다.

다만 현재 영상 렌더는 정지 이미지 기반 카메라 움직임 초안입니다. 실제 생성형 인물 움직임, 표정 변화, 장면 전환 품질은 다음 단계에서 ComfyUI/Stable Diffusion 계열 워크플로우를 붙여야 평가할 수 있습니다.
