# UMSH photo-to-video pipeline MVP design

## 1. Goal

UMSH 영상 제작을 위해 "이미지 1장 -> 7초 세로 영상"을 안정적으로 반복 생산하는 내부 제작 파이프라인을 만든다.

이 설계의 핵심은 자체 영상 생성 모델을 만드는 것이 아니다. Higgsfield, Runway, Kling, Veo 같은 외부 모델을 교체 가능한 어댑터로 붙이고, UMSH에 필요한 프롬프트 품질, 배치 실행, 비용 통제, 결과 검수, 압축 다운로드를 자동화하는 제작 운영 시스템을 만든다.

## 2. Project classification

- Classification: `EXISTING_IMPROVEMENT`
- Product type: internal production tool
- Primary user: UMSH 콘텐츠 제작자
- Output: 7초 9:16 MP4 영상 묶음, ZIP 패키지, 생성 로그, 프롬프트 기록

## 3. MVP scope

MVP는 다음만 책임진다.

- 로컬 이미지 또는 웹 페이지 이미지 수집
- 컷 단위 장면 매니페스트 작성
- UMSH 스타일 영상 프롬프트 컴파일
- 4컷 또는 6컷 단위 배치 실행
- 모델별 예상 크레딧 계산 및 부족 시 실행 차단
- 생성 상태 추적
- 결과 MP4 다운로드
- ZIP 패키징
- 실패 원인 기록 및 재시도용 프롬프트 보정안 생성

MVP에서 제외한다.

- 자체 foundation video model 학습
- 결제 자동 구매
- 완전 자동 미적 검수
- 인물 동일성 100% 보장
- 다국어 자막/음성 합성 편집

## 4. Operating constraints learned from current production

현재 제작 경험상 반드시 시스템 요구사항으로 박아야 하는 조건이다.

- 기본 배치 크기: 4컷
- 옵션 배치 크기: 6컷
- 기본 영상 길이: 7초
- 기본 화면비: 9:16
- 기본 품질: 720p
- 기본 모델: quality preset은 `seedance_2_5`, budget preset은 `seedance_2_0_mini`
- UMSH 실사 원칙: 웹툰, 2D 일러스트, 애니메이션 캐릭터 느낌 금지
- 인물 연령: MZ 중에서도 기본 20대 후반에서 30대 초반 느낌, 요청 시 20대 명시
- 동일 인물 유지: 기준 얼굴 이미지를 scene reference로 반복 주입
- 구도 다양성: 정면, 3/4 정면, 옆모습 제한 비율을 관리
- 행동 다양성: 핸드폰만 보는 컷이 반복되지 않도록 scene action quota 적용
- 성별 다양성: 여성 단독, 남성 단독, 커플, 배경 인물 컷 비율 관리
- 안전 제약: 침대/샤워/수영장/의상 변경 컷은 성인 인물, 비노출, 광고용 라이프스타일 톤으로 제한
- 영상 내 텍스트: 자막, UI 텍스트, 로고, 워터마크 금지
- 사운드: 별도 요청이 없으면 환경음 포함

## 5. System architecture

```text
image sources
  -> asset intake
  -> scene manifest
  -> prompt compiler
  -> cost gate
  -> provider adapter
  -> job runner
  -> result downloader
  -> QA checklist
  -> zip packager
```

### 5.1 Asset intake

입력 이미지를 작업 폴더로 복사하고 원본 출처를 기록한다.

Supported sources:

- local file path
- attached temp image
- web page URL
- direct image URL

Output:

- `assets/source/{scene_id}.{ext}`
- `manifest/assets.json`

### 5.2 Scene manifest

모든 컷은 사람이 읽을 수 있는 JSON 또는 YAML로 관리한다.

```json
{
  "project_id": "marry-step-1-story",
  "batch_size": 4,
  "defaults": {
    "duration_seconds": 7,
    "aspect_ratio": "9:16",
    "quality": "720p",
    "model_preset": "quality",
    "sound": true,
    "style": "realistic live-action"
  },
  "identity_reference": {
    "image": "assets/identity/main-face.png",
    "description": "same Korean woman, natural real human face, not anime, not webtoon"
  },
  "scenes": []
}
```

Scene spec:

```json
{
  "scene_id": "05-pool",
  "source_image": "assets/source/05-pool.png",
  "subject": "woman",
  "age_range": "late 20s",
  "view": "front",
  "setting": "quiet boutique hotel pool at dusk",
  "action": "walks slowly beside the pool, turns to camera, soft breathing",
  "camera": "slow dolly-in, subtle handheld realism",
  "motion": "hair moves naturally, water reflections ripple, eyes blink once",
  "audio": "soft indoor pool ambience, quiet water movement",
  "hard_negative": ["webtoon", "anime", "cartoon", "phone-only action", "side profile"]
}
```

### 5.3 Prompt compiler

프롬프트는 사람이 매번 새로 쓰지 않는다. scene spec을 아래 레이어로 합성한다.

1. Brand layer: UMSH 실사 광고 톤, 고급스럽지만 과장 없는 현실감
2. Identity layer: 동일 인물, 얼굴 구조 유지, 피부 질감, 자연스러운 눈/코/입
3. Scene layer: 장소, 행동, 소품, 감정
4. Motion layer: 7초 동안 가능한 작은 움직임 중심
5. Camera layer: dolly-in, push-in, parallax, handheld, rack focus
6. Audio layer: 환경음과 작은 동작음
7. Safety layer: 성인, 비노출, 선정적 연출 금지
8. Negative layer: 웹툰화, 손 왜곡, 얼굴 변형, 텍스트, 로고, 과도한 UI, 핸드폰 반복

Compiled prompt template:

```text
Create a 7-second vertical 9:16 realistic live-action video from the provided image.
Preserve the same person identity, facial structure, skin texture, hairstyle, outfit family, and scene continuity.

Subject: {subject}, {age_range}, same Korean real human identity as the reference.
View: {view}. Keep the face visible and front-facing unless the scene explicitly says otherwise.
Scene: {setting}.
Action: {action}.
Motion: {motion}.
Camera: {camera}.
Lighting: realistic practical lighting, natural skin detail, cinematic but not stylized.
Audio: {audio}.

Hard rules:
- no anime, no webtoon, no illustration, no doll-like face
- no captions, no readable text, no logos, no watermarks
- avoid phone-centered action unless the scene requires it
- natural hands, natural blinking, no morphing face
- adult, modest, commercial lifestyle tone
```

### 5.4 Cost gate

실행 전 예상 비용을 계산하고 잔여 크레딧과 비교한다.

Known estimates from current account tests:

- `seedance_2_5`, 7s, 9:16, 720p, audio, image-to-video: about 45.5 credits
- `seedance_2_0_fast`, 7s, 720p, audio: about 24.5 credits
- `seedance_2_0_mini`, 7s, 720p, audio: about 17.5 credits

Rules:

- 남은 크레딧보다 예상 총량이 크면 submit을 막는다.
- unlimited 모델은 UI 표시와 실제 API/MCP 지원 여부가 다를 수 있으므로 adapter capability check를 먼저 한다.
- 22컷 전체 실행 전에는 반드시 `estimated_total_credits`를 출력한다.
- 결제 또는 추가 크레딧 구매는 사용자 명시 승인 없이는 실행하지 않는다.

### 5.5 Provider adapter

Provider는 교체 가능하게 둔다.

Initial provider:

- Higgsfield

Future providers:

- Runway
- Kling
- Veo
- local open-source video model, if quality and cost become acceptable

Adapter interface:

```ts
interface VideoProvider {
  estimate(job: GenerationJob): Promise<CostEstimate>;
  submit(job: GenerationJob): Promise<ProviderJob>;
  poll(providerJobId: string): Promise<ProviderJobStatus>;
  download(providerJobId: string, outputPath: string): Promise<DownloadedAsset>;
}
```

### 5.6 Job runner

Runner는 컷을 4개 또는 6개 단위로 끊어서 실행한다.

Job states:

- `planned`
- `cost_checked`
- `submitted`
- `running`
- `completed`
- `failed`
- `downloaded`
- `qa_reviewed`
- `packaged`

Retry policy:

- credit failure: retry하지 않음
- moderation/rejection: safety layer 강화 후 1회 재시도
- webtoon/style drift: realism negative prompt 강화 후 1회 재시도
- face drift: identity reference와 face-preservation 문장 강화 후 1회 재시도
- phone overuse: action rewrite 후 재시도
- timeout: provider status 재조회 후 필요 시 재시도

### 5.7 QA checklist

자동 검수와 수동 검수를 같이 둔다.

Automated checks:

- 파일 존재
- 파일 크기 0 아님
- duration 약 7초
- 해상도와 화면비 확인
- zip 포함 여부
- manifest와 파일명 매칭

Manual review checklist:

- 실사 사람처럼 보이는가
- 웹툰/일러스트 느낌이 남아 있는가
- 동일 인물 얼굴이 유지되는가
- 정면/3/4 정면 비율이 충분한가
- 핸드폰만 보는 컷이 과도한가
- 남성 또는 커플 컷이 필요한 만큼 들어갔는가
- 손/팔/얼굴 변형이 있는가
- 영상 안에 글자, 로고, 워터마크가 있는가
- 침대/샤워/수영장/의상 컷이 과하게 선정적으로 흐르지 않는가

### 5.8 Packaging

완성 산출물은 하나의 ZIP으로 묶는다.

```text
영상/_generated/{project_id}/{run_id}/
  videos/
    01-scene-01-hero.mp4
    01-scene-02-concern.mp4
  sources/
    01-scene-01-hero.webp
  manifests/
    scenes.json
    jobs.json
    prompts.json
    qa.json
  README.md
  {project_id}-{run_id}.zip
```

ZIP에는 최소 다음을 포함한다.

- MP4 영상
- 원본 이미지
- 최종 프롬프트
- 모델/비용/상태 로그
- 실패 컷 목록

## 6. Data model draft

```ts
type ModelPreset = "quality" | "budget" | "test";

type SceneSubject = "woman" | "man" | "couple" | "hands" | "bridge";

type SceneView = "front" | "three_quarter_front" | "side" | "over_shoulder" | "detail";

interface ProjectManifest {
  projectId: string;
  title: string;
  batchSize: 4 | 6;
  identityReference?: string;
  defaults: GenerationDefaults;
  scenes: SceneSpec[];
}

interface GenerationDefaults {
  durationSeconds: 7;
  aspectRatio: "9:16";
  quality: "720p" | "1080p";
  modelPreset: ModelPreset;
  sound: boolean;
}

interface SceneSpec {
  sceneId: string;
  title: string;
  sourceImage: string;
  subject: SceneSubject;
  view: SceneView;
  ageRange: string;
  setting: string;
  action: string;
  camera: string;
  motion: string;
  audio: string;
  safetyNotes?: string[];
  negative?: string[];
}

interface GenerationJob {
  jobId: string;
  sceneId: string;
  provider: "higgsfield" | "runway" | "kling" | "veo";
  model: string;
  prompt: string;
  sourceImage: string;
  durationSeconds: number;
  aspectRatio: string;
  sound: boolean;
  status: string;
  providerJobId?: string;
  outputUrl?: string;
  localOutput?: string;
  error?: string;
}
```

## 7. CLI commands

초기 버전은 UI보다 CLI가 빠르다.

```powershell
node video-pipeline/create-manifest.js --input .\assets --project marry-step-1
node video-pipeline/compile-prompts.js --manifest .\runs\marry-step-1\scenes.json
node video-pipeline/estimate.js --manifest .\runs\marry-step-1\scenes.json --provider higgsfield
node video-pipeline/run.js --manifest .\runs\marry-step-1\scenes.json --batch-size 4 --provider higgsfield
node video-pipeline/package.js --run .\runs\marry-step-1\20260904-001
```

Dry-run은 실제 생성 없이 프롬프트와 비용만 만든다.

```powershell
node video-pipeline/run.js --manifest .\runs\marry-step-1\scenes.json --batch-size 4 --dry-run
```

## 8. Prompt quality rules

실사 실패를 줄이기 위한 기본 규칙이다.

- "beautiful anime girl"류 표현 금지
- "illustration", "webtoon", "fantasy art", "digital painting" 금지
- "real Korean woman in her late 20s", "photorealistic live-action", "natural skin texture" 명시
- 얼굴 동일성이 중요하면 "same identity as the reference image"를 prompt 상단과 hard rules에 반복
- 정면 컷은 "front-facing, looking toward camera" 명시
- 옆모습 방지는 "not profile view, not side view"를 negative에 추가
- 핸드폰 과다 방지는 scene별 `phone_allowed`를 둔다
- 남성 컷은 "real Korean man in his late 20s"로 명시하고 여성 프롬프트를 재사용하지 않는다
- 커플 컷은 남녀의 행동을 동시에 지정한다
- 움직임은 7초에 맞게 작고 확실한 동작으로 제한한다

Good motion examples:

- turns eyes from table to camera
- slowly lifts a cup, pauses, breathes
- male subject walks into frame and stops beside the window
- couple exchange a short glance across the table
- water ripples while subject adjusts robe edge modestly
- hand places a card on the table, candle flickers

Bad motion examples:

- dramatic dance
- full body spin
- complex choreography
- fast outfit change
- heavy magical transformation
- multiple camera cuts in one 7-second clip

## 9. Batch strategy

Default batch:

- 4컷씩 실행
- 배치마다 완료 후 QA
- 실패 컷은 다음 배치에 섞지 않고 별도 retry batch로 보낸다

Alternative:

- 6컷씩 실행은 크레딧 충분하고 모델 상태 안정적일 때만 사용

For 22 scenes:

- batch 1: 1-4
- batch 2: 5-8
- batch 3: 9-12
- batch 4: 13-16
- batch 5: 17-20
- batch 6: 21-22

## 10. Cost strategy

현재 같은 22컷 전체 제작을 `seedance_2_5`로 돌리면 약 1001 credits가 필요하다.

```text
22 scenes * 45.5 credits = 1001 credits
```

Budget preset을 쓰면 다음 수준까지 내려갈 수 있다.

```text
22 scenes * 24.5 credits = 539 credits
22 scenes * 17.5 credits = 385 credits
```

운영 권장안:

- 테스트 1컷: budget preset
- 최종 주요 컷: quality preset
- 보조 컷: budget preset
- 크레딧 부족 시 전체 submit 전에 중단
- unlimited 모델은 실제 API 호출 가능 여부가 확인된 뒤에만 기본값으로 전환

## 11. Development phases

### Phase 1: local design and dry-run

- `video-pipeline/` 폴더 생성
- scene manifest schema 작성
- prompt compiler 작성
- cost estimator 작성
- dry-run output 생성
- ZIP packager 작성

Acceptance:

- 22컷 manifest를 읽고 4컷 단위 계획을 출력한다.
- 모든 컷의 최종 프롬프트가 파일로 저장된다.
- 비용 추정이 모델별로 나온다.
- dry-run ZIP이 생성된다.

### Phase 2: Higgsfield adapter

- Higgsfield submit wrapper
- status polling
- output URL 기록
- local download
- failed job retry 기록

Acceptance:

- 테스트 1컷을 제출하고 완료 상태를 기록한다.
- 완료 MP4를 로컬에 저장한다.
- 실패 시 reason과 retry prompt를 저장한다.

### Phase 3: production batch runner

- 4컷 배치 실행
- 배치별 중간 ZIP 생성
- 최종 ZIP 생성
- run summary 작성

Acceptance:

- 22컷을 4컷 단위로 끊어 실행할 수 있다.
- 결과가 `영상/_generated/{project_id}/{run_id}` 아래에 정리된다.
- 사용자가 바로 다운로드 가능한 ZIP을 받는다.

### Phase 4: lightweight review UI

- 로컬 HTML preview 생성
- 영상 grid
- scene prompt 보기
- QA 체크박스
- retry prompt copy

Acceptance:

- 제작자가 브라우저에서 전체 컷을 빠르게 검수할 수 있다.
- 실패 사유를 선택하면 다음 retry prompt가 자동 생성된다.

## 12. Implementation recommendation

초기 구현은 Node.js CLI가 적합하다.

Reasons:

- 현재 저장소에 Node 기반 검수 도구가 이미 있다.
- JSON manifest와 ZIP 패키징이 단순하다.
- PowerShell 환경에서 실행이 쉽다.
- 나중에 웹 UI로 감싸기 쉽다.

Proposed folder:

```text
C:/dev/cream/umsh/video-pipeline/
  package.json
  src/
    cli/
    core/
    providers/
    qa/
    package/
  templates/
    prompt-base.md
    prompt-negative.md
  examples/
    marry-step-1.scenes.json
```

Generated outputs:

```text
C:/dev/cream/umsh/영상/_generated/
```

## 13. Immediate next build target

가장 먼저 만들 기능은 "생성 실행 전 준비물"이다.

1. 22컷 manifest 작성
2. prompt compiler
3. cost estimator
4. dry-run ZIP packager

이 네 가지가 먼저 있어야 실제 크레딧을 쓰기 전에 품질과 비용을 확인할 수 있다.

첫 구현 완료 기준:

- `node video-pipeline/src/cli/dry-run.js --manifest examples/marry-step-1.scenes.json`
- `영상/_generated/marry-step-1/{run_id}/manifests/prompts.json` 생성
- `영상/_generated/marry-step-1/{run_id}/README.md` 생성
- `영상/_generated/marry-step-1/{run_id}/marry-step-1-{run_id}-dry-run.zip` 생성

## 14. Open decisions

- Higgsfield를 API로 직접 붙일지, Codex MCP 실행 도구를 운용 절차로 둘지 결정 필요
- 실제 비용 최적화는 unlimited 모델 호출 가능성 재확인 후 결정
- 성인 라이프스타일 컷의 허용 수위는 UMSH 광고 정책으로 별도 문구화 필요
- 웹 URL 이미지 수집은 페이지 구조가 바뀔 수 있으므로 실패 fallback이 필요

