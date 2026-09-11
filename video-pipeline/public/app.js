const manifestEl = document.querySelector("#manifest");
const strategyEl = document.querySelector("#strategy");
const batchSizeEl = document.querySelector("#batchSize");
const wanProfileEl = document.querySelector("#wanProfile");
const errorEl = document.querySelector("#error");
const validStateEl = document.querySelector("#validState");
const sceneRowsEl = document.querySelector("#sceneRows");
const sceneCountEl = document.querySelector("#sceneCount");
const batchCountEl = document.querySelector("#batchCount");
const batchesEl = document.querySelector("#batches");
const warningsEl = document.querySelector("#warnings");
const promptPreviewEl = document.querySelector("#promptPreview");
const promptTitleEl = document.querySelector("#promptTitle");
const outputEl = document.querySelector("#output");
const projectTitleEl = document.querySelector("#projectTitle");
const projectMetaEl = document.querySelector("#projectMeta");
const strategyNoteEl = document.querySelector("#strategyNote");
const wanNoteEl = document.querySelector("#wanNote");
const coverageEl = document.querySelector("#coverage");
const sceneMetaEl = document.querySelector("#sceneMeta");
const engineStatusEl = document.querySelector("#engineStatus");
const basePath = detectBasePath();

const strategyNotes = {
  free_local: "크레딧을 쓰지 않습니다. 먼저 무료 영상 초안이나 카메라 움직임 초안을 만들 때 씁니다.",
  hybrid: "대부분은 무료 초안으로 만들고, 중요한 컷만 유료 고품질로 계산합니다.",
  paid_quality: "모든 컷을 유료 고품질로 계산합니다. 최종 제작 전에 비용을 확인할 때 씁니다."
};

const wanProfileNotes = {
  balanced_7s: "추천 기본값입니다. 7초 길이를 유지하면서 최종용보다 시간을 줄입니다.",
  fast_check: "짧은 확인용입니다. 얼굴이 흔들리는지, 구도가 맞는지 먼저 볼 때 씁니다.",
  final_7s: "품질 우선입니다. 1컷에 16분 이상 걸릴 수 있어 최종 후보에만 씁니다."
};

const labelMaps = {
  subject: {
    woman: "여성",
    man: "남성",
    couple: "커플",
    hands: "손/소품",
    bridge: "배경 컷",
    person: "인물"
  },
  view: {
    front: "정면",
    three_quarter_front: "살짝 정면",
    side: "옆모습",
    over_shoulder: "어깨 너머",
    detail: "부분 확대"
  },
  route: {
    "무료 초안": "무료 초안",
    "이미지 모션": "이미지 모션",
    "저가 유료": "저가 유료",
    "고품질 유료": "고품질 유료",
    "Free local draft": "무료 초안",
    "Image motion fallback": "이미지 모션",
    "Budget paid": "저가 유료",
    "Paid quality": "고품질 유료"
  },
  status: {
    completed: "완료",
    failed: "실패",
    planned: "대기"
  },
  model: {
    "comfyui-or-open-source": "로컬/무료 생성",
    "parallax-motion": "이미지 움직임",
    "seedance_2_0_mini-or-equivalent": "저가 유료 모델",
    "seedance_2_5-or-equivalent": "고품질 유료 모델"
  }
};

let currentPlan = null;
let selectedSceneId = null;

document.querySelector("#loadSample").addEventListener("click", loadSample);
document.querySelector("#compile").addEventListener("click", compile);
document.querySelector("#dryRun").addEventListener("click", dryRun);
document.querySelector("#renderMotion").addEventListener("click", renderMotion);
document.querySelector("#checkComfy").addEventListener("click", checkComfy);
document.querySelector("#copyPrompt").addEventListener("click", copyPrompt);
strategyEl.addEventListener("change", compile);
batchSizeEl.addEventListener("change", compile);
wanProfileEl.addEventListener("change", compile);
manifestEl.addEventListener("input", () => setStatus("수정됨", "warn"));

loadSample();

async function loadSample() {
  setBusy("예제를 불러오는 중...");
  const sample = await request(apiPath("/api/example"));
  manifestEl.value = JSON.stringify(sample, null, 2);
  strategyEl.value = sample.strategy || "free_local";
  batchSizeEl.value = String(sample.batchSize || 4);
  wanProfileEl.value = sample.defaults?.wanProfile || "balanced_7s";
  await compile();
}

async function compile() {
  errorEl.textContent = "";
  outputEl.textContent = "";
  updateStrategyNote();
  try {
    const manifest = JSON.parse(manifestEl.value);
    const plan = await request(apiPath("/api/plan"), {
      method: "POST",
      body: JSON.stringify({
        manifest,
        options: {
          strategy: strategyEl.value,
          batchSize: Number(batchSizeEl.value),
          wanProfile: wanProfileEl.value
        }
      })
    });
    currentPlan = plan;
    selectedSceneId = selectedSceneId && plan.scenes.some((scene) => scene.sceneId === selectedSceneId)
      ? selectedSceneId
      : plan.scenes[0]?.sceneId || null;
    renderPlan();
    setStatus("계산 완료", plan.warnings.length ? "warn" : "good");
    activateStep("stepCompile");
  } catch (error) {
    currentPlan = null;
    setStatus("JSON 오류", "error");
    errorEl.textContent = error.message || String(error);
  }
}

async function dryRun() {
  errorEl.textContent = "";
  setBusy("준비 압축파일을 만드는 중...");
  try {
    const manifest = JSON.parse(manifestEl.value);
    const result = await request(apiPath("/api/dry-run"), {
      method: "POST",
      body: JSON.stringify({
        manifest,
        options: {
          strategy: strategyEl.value,
          batchSize: Number(batchSizeEl.value),
          wanProfile: wanProfileEl.value
        }
      })
    });
    currentPlan = result.plan;
    renderPlan();
    activateStep("stepPackage");
    setStatus("압축파일 완료", "good");
    outputEl.textContent = [
      `작업 번호: ${result.runId}`,
      `저장 위치: ${result.outDir}`,
      `압축파일: ${result.zipPath}`,
      `예상 크레딧: ${result.plan.cost.estimatedCredits}`,
      `ComfyUI 설정: ${result.plan.wan?.label || "-"}`
    ].join("\n");
  } catch (error) {
    outputEl.textContent = "";
    setStatus("압축파일 실패", "error");
    errorEl.textContent = error.message || String(error);
  }
}

async function renderMotion() {
  errorEl.textContent = "";
  setBusy("무료 영상 초안을 만드는 중...");
  try {
    const manifest = JSON.parse(manifestEl.value);
    const result = await request(apiPath("/api/render-motion"), {
      method: "POST",
      body: JSON.stringify({
        manifest,
        options: {
          strategy: strategyEl.value,
          batchSize: Number(batchSizeEl.value),
          wanProfile: wanProfileEl.value
        }
      })
    });
    setStatus(result.failed ? "일부 실패" : "영상 완료", result.failed ? "warn" : "good");
    activateStep("stepPackage");
    outputEl.textContent = [
      `작업 번호: ${result.runId}`,
      `저장 위치: ${result.outDir}`,
      `압축파일: ${result.zipPath}`,
      `완료: ${result.completed}`,
      `실패: ${result.failed}`,
      "",
      ...result.jobs.map((job) => `${job.sceneId}: ${labelStatus(job.status)}${job.error ? ` - ${job.error}` : ""}`)
    ].join("\n");
  } catch (error) {
    outputEl.textContent = "";
    setStatus("영상 실패", "error");
    errorEl.textContent = error.message || String(error);
  }
}

async function checkComfy() {
  engineStatusEl.textContent = "확인 중...";
  engineStatusEl.className = "engineStatus";
  try {
    const status = await request(apiPath("/api/comfyui/status"));
    if (!status.ok) {
      engineStatusEl.className = "engineStatus warn";
      engineStatusEl.textContent = `엔진 꺼짐: ${status.message}`;
      return;
    }
    engineStatusEl.className = "engineStatus good";
    engineStatusEl.textContent = [
      `실행 중: ComfyUI ${status.version}`,
      `GPU: ${status.gpu}`,
      `남은 메모리: ${status.vramFreeGb}GB / ${status.vramTotalGb}GB`,
      `PyTorch: ${status.torch}`,
      modelStatusLine(status.models)
    ].join("\n");
  } catch (error) {
    engineStatusEl.className = "engineStatus warn";
    engineStatusEl.textContent = error.message || String(error);
  }
}

function modelStatusLine(models) {
  if (!models) return "모델: 확인 안 됨";
  if (!models.total) return "모델: 생성 모델 0개";
  return [
    `모델: 전체 ${models.total}개`,
    `생성 ${models.generation}개`,
    `문장 ${models.text}개`,
    `이미지 참고 ${models.imageReference}개`,
    `복원 ${models.vae}개`
  ].join(" / ");
}

function renderPlan() {
  if (!currentPlan) return;

  const scenes = currentPlan.scenes || [];
  const selected = scenes.find((scene) => scene.sceneId === selectedSceneId) || scenes[0];

  projectTitleEl.textContent = currentPlan.manifest.title;
  projectMetaEl.textContent = labelStrategy(currentPlan.manifest.strategy);
  updateWanNote(currentPlan.wan);
  sceneCountEl.textContent = `${scenes.length}컷`;
  batchCountEl.textContent = `${currentPlan.batches.length}묶음`;
  document.querySelector("#metricTotal").textContent = currentPlan.cost.totalScenes;
  document.querySelector("#metricLocal").textContent = currentPlan.cost.localScenes;
  document.querySelector("#metricPaid").textContent = currentPlan.cost.paidScenes;
  document.querySelector("#metricCredits").textContent = currentPlan.cost.estimatedCredits;
  document.querySelector("#metricQuality").textContent = `${currentPlan.quality?.averageScore || 0}점`;

  sceneRowsEl.innerHTML = scenes.map((scene) => `
    <tr data-scene-id="${escapeHtml(scene.sceneId)}" class="${scene.sceneId === selectedSceneId ? "active" : ""}">
      <td>
        <div class="sceneName">
          <strong>${escapeHtml(scene.title)}</strong>
          <span>${escapeHtml(scene.sceneId)}</span>
        </div>
      </td>
      <td>${escapeHtml(labelSubject(scene.subject))}</td>
      <td>${escapeHtml(labelView(scene.view))}</td>
      <td>${qualityPill(scene.quality)}</td>
      <td><span class="routeTag">${escapeHtml(labelRoute(scene.providerLabel))}</span></td>
      <td>${scene.estimatedCredits}</td>
      <td>${qaPill(scene.warnings.length)}</td>
    </tr>
  `).join("");

  sceneRowsEl.querySelectorAll("tr").forEach((row) => {
    row.addEventListener("click", () => {
      selectedSceneId = row.dataset.sceneId;
      activateStep("stepReview");
      renderPlan();
    });
  });

  batchesEl.innerHTML = currentPlan.batches.map((batch) => `
    <div class="batchCard">
      <strong>${batch.batch}번째 묶음</strong>
      <span>${escapeHtml(batch.sceneIds.map((sceneId) => titleForScene(scenes, sceneId)).join(", "))}</span>
      <span>${batch.estimatedCredits} 크레딧 / 주의 ${batch.warningCount}개</span>
    </div>
  `).join("");

  warningsEl.innerHTML = currentPlan.warnings.length
    ? currentPlan.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")
    : `<li class="empty">주의할 점 없음</li>`;

  renderCoverage(scenes);
  renderSelectedScene(selected);
}

function renderSelectedScene(scene) {
  if (!scene) {
    promptTitleEl.textContent = "컷을 선택하세요";
    promptPreviewEl.textContent = "";
    sceneMetaEl.innerHTML = "";
    return;
  }

  promptTitleEl.textContent = scene.title;
  promptPreviewEl.textContent = scene.prompt;
  sceneMetaEl.innerHTML = [
    ["인물", labelSubject(scene.subject)],
    ["구도", labelView(scene.view)],
    ["방식", labelRoute(scene.providerLabel)],
    ["모델", labelModel(scene.model)],
    ["ComfyUI", scene.wanProfileLabel || "-"],
    ["길이", `${scene.durationSeconds}초`],
    ["크레딧", scene.estimatedCredits],
    ["품질", `${scene.quality?.score || 0}점 / ${scene.quality?.label || "-"}`]
  ].map(([label, value]) => `
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value)}</dd>
    </div>
  `).join("");
}

function renderCoverage(scenes) {
  const total = Math.max(1, scenes.length);
  const groups = [
    ["여성", scenes.filter((scene) => scene.subject === "woman").length],
    ["남성", scenes.filter((scene) => scene.subject === "man").length],
    ["커플", scenes.filter((scene) => scene.subject === "couple").length],
    ["정면", scenes.filter((scene) => scene.view === "front" || scene.view === "three_quarter_front").length],
    ["유료", scenes.filter((scene) => scene.estimatedCredits > 0).length]
  ];

  coverageEl.innerHTML = groups.map(([label, count]) => {
    const pct = Math.round((count / total) * 100);
    return `
      <div class="coverageItem">
        <span>${escapeHtml(label)}</span>
        <div class="meter"><span style="width:${pct}%"></span></div>
        <strong>${count}</strong>
      </div>
    `;
  }).join("");
}

function qaPill(count) {
  if (!count) return `<span class="statusPill good">통과</span>`;
  return `<span class="statusPill warn">${count}</span>`;
}

function qualityPill(quality) {
  const score = quality?.score || 0;
  const tone = score >= 90 ? "good" : score >= 80 ? "neutral" : "warn";
  return `<span class="statusPill ${tone}">${score}점 ${escapeHtml(quality?.grade || "")}</span>`;
}

async function copyPrompt() {
  if (!promptPreviewEl.textContent) return;
  await navigator.clipboard.writeText(promptPreviewEl.textContent);
  outputEl.textContent = "프롬프트를 복사했습니다.";
}

function labelSubject(value) {
  return labelMaps.subject[value] || value || "-";
}

function labelView(value) {
  return labelMaps.view[value] || value || "-";
}

function labelRoute(value) {
  return labelMaps.route[value] || value || "-";
}

function labelStatus(value) {
  return labelMaps.status[value] || value || "-";
}

function labelModel(value) {
  return labelMaps.model[value] || value || "-";
}

function labelStrategy(value) {
  if (value === "free_local") return "무료 초안";
  if (value === "hybrid") return "혼합";
  if (value === "paid_quality") return "유료 고품질";
  return value || "-";
}

function titleForScene(scenes, sceneId) {
  return scenes.find((scene) => scene.sceneId === sceneId)?.title || sceneId;
}

function updateStrategyNote() {
  strategyNoteEl.textContent = strategyNotes[strategyEl.value] || "";
  updateWanNote(currentPlan?.wan);
}

function updateWanNote(wan) {
  const base = wanProfileNotes[wanProfileEl.value] || "";
  if (!wan) {
    wanNoteEl.textContent = base;
    return;
  }
  const minutes = Math.max(1, Math.round((wan.expectedSecondsPerScene || 0) / 60));
  wanNoteEl.textContent = `${base} 예상: 1컷 약 ${minutes}분. ${wan.note || ""}`;
}

function setBusy(text) {
  validStateEl.textContent = text;
  validStateEl.className = "statusPill neutral";
}

function setStatus(text, tone = "neutral") {
  validStateEl.textContent = text;
  validStateEl.className = `statusPill ${tone}`;
}

function activateStep(id) {
  document.querySelectorAll(".step").forEach((step) => step.classList.remove("active"));
  document.querySelector("#" + id)?.classList.add("active");
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { "content-type": "application/json" },
    ...options
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || response.statusText);
  return data;
}

function apiPath(path) {
  return `${basePath}${path}`;
}

function detectBasePath() {
  const firstSegment = window.location.pathname.split("/").filter(Boolean)[0];
  return firstSegment === "umsh-video" ? "/umsh-video" : "";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
