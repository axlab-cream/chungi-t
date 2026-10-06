# 운명상회 영상 제작기

사진 1장을 바탕으로 7초 세로 영상 제작을 준비하는 내부 도구입니다.

이 도구는 기본적으로 유료 크레딧을 쓰지 않습니다. 먼저 컷 정보를 정리하고, 프롬프트를 만들고, 예상 비용을 계산하고, 결과물을 압축파일로 묶습니다.

## 화면 실행

```powershell
npm start
```

브라우저에서 엽니다.

```text
http://localhost:4177
```

## 준비 압축파일 만들기

```powershell
npm run dry-run
```

## 무료 영상 초안 만들기

작업표 안의 `sourceImage`가 실제 이미지 파일 경로를 가리킬 때 사용할 수 있습니다.

```powershell
node src/cli/render-motion.js --manifest examples/local-one-scene.test.json --strategy free_local --batch-size 4
```

이 기능은 `ffmpeg`로 7초짜리 간단한 카메라 움직임 영상을 만듭니다. 사람의 표정이나 몸동작을 새로 생성하는 방식은 아니며, 무료 초안이나 배경 컷에 적합합니다.

## 품질 검사

```powershell
npm run test:quality
```

컷마다 0-100점 품질 점수를 매깁니다. 기준은 힉스필드 테스트에서 반복적으로 중요했던 항목입니다. 실제 사람 느낌, 같은 얼굴 유지, 정면 구도, 손과 피부의 자연스러움, 작은 움직임, 카메라, 조명, 소리, 핸드폰 중심 방지, 안전 문구를 봅니다.

자세한 기준은 `docs/quality-upgrade.md`에 정리했습니다.

## ComfyUI 생성 모델

넥서스에는 Wan 2.1 이미지-투-비디오 체크포인트가 연결되어 있습니다. 화면의 `엔진 확인` 버튼을 누르면 생성 모델, 문장 이해 모델, 이미지 참고 모델, 영상 복원 모델 개수를 확인할 수 있습니다.

자세한 목록은 `docs/model-checkpoints.md`에 정리했습니다.

Wan 2.1 실제 생성 테스트 결과와 힉스필드 기준 비교는 `docs/wan-test-report.md`에 정리했습니다.

`준비 압축파일`에는 컷별 ComfyUI Wan 워크플로우가 함께 들어갑니다. 화면에서 `균형 7초`, `빠른 확인`, `최종 7초` 중 하나를 고르면 해당 설정으로 워크플로우가 생성됩니다.

## 저장 위치

```text
C:/dev/cream/umsh/영상/_generated/{작업ID}/{작업번호}/
```

## 넥서스 배포

넥서스 서버에 올릴 때는 `deploy/nexus.env`에 접속 정보를 넣고 배포 스크립트를 실행합니다.

```powershell
Copy-Item .\deploy\nexus.env.example .\deploy\nexus.env
notepad .\deploy\nexus.env
.\deploy\deploy-nexus.ps1
```

현재 확인된 서버 주소는 `192.168.0.21`입니다. SSH 계정명은 별도로 필요합니다.

외부 고정 주소는 아래입니다.

```text
https://nexus.crea-m.com/umsh-video/
```

## 제작 방식

- `무료 초안만`: 유료 크레딧을 쓰지 않습니다.
- `무료 초안 + 중요 컷만 유료`: 대부분은 무료 초안, 중요한 컷만 유료 계산.
- `전체 유료 고품질`: 모든 컷을 유료 고품질로 계산.

다음 단계는 설치된 Wan 2.1 모델로 1컷 7초 생성 테스트를 돌리고, 얼굴 동일성·손·실사감 기준에 맞춰 워크플로우를 고도화하는 것입니다.
