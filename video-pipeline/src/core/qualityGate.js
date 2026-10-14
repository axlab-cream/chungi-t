const REQUIRED_SECTIONS = ["보존", "움직임", "카메라", "조명", "소리", "금지"];

export function assessSceneQuality(scene, manifest, compiledPrompt) {
  const checks = [
    checkIdentity(scene, manifest),
    checkHumanStyle(scene, manifest, compiledPrompt),
    checkView(scene),
    checkPhone(scene),
    checkMotion(scene),
    checkCamera(scene),
    checkLighting(scene),
    checkAudio(scene, manifest),
    checkSafety(scene),
    checkPromptStructure(compiledPrompt)
  ];

  const penalty = checks.reduce((total, check) => total + check.penalty, 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));
  return {
    score,
    grade: gradeFor(score),
    label: labelFor(score),
    checks
  };
}

export function assessPortfolioQuality(rawScenes, plannedScenes) {
  const human = plannedScenes.filter((scene) => ["woman", "man", "couple"].includes(scene.subject));
  const front = human.filter((scene) => scene.view === "front" || scene.view === "three_quarter_front");
  const phone = rawScenes.filter((scene) => {
    const text = `${scene.setting || ""} ${scene.action || ""}`.toLowerCase();
    return scene.phoneAllowed === true || /phone|smartphone|mobile|핸드폰|휴대폰|스마트폰/.test(text);
  });
  const hasMan = human.some((scene) => scene.subject === "man" || scene.subject === "couple");
  const hasCouple = human.some((scene) => scene.subject === "couple");
  const averageScore = plannedScenes.length
    ? Math.round(plannedScenes.reduce((total, scene) => total + scene.quality.score, 0) / plannedScenes.length)
    : 0;

  return {
    averageScore,
    grade: gradeFor(averageScore),
    label: labelFor(averageScore),
    coverage: {
      humanCount: human.length,
      frontRatio: human.length ? roundRatio(front.length / human.length) : 0,
      phoneRatio: human.length ? roundRatio(phone.length / human.length) : 0,
      hasMan,
      hasCouple
    }
  };
}

function checkIdentity(scene, manifest) {
  if (!["woman", "man", "couple"].includes(scene.subject)) return pass("인물 없음");
  if (manifest.identityReference) return pass("기준 얼굴 있음");
  return fail("기준 얼굴 이미지가 없어 동일 인물 유지가 약합니다", 16);
}

function checkHumanStyle(scene, manifest, prompt) {
  const text = `${manifest.defaults?.style || ""} ${prompt || ""}`.toLowerCase();
  if (/실사|photoreal|realistic|live-action|real person|actual human/.test(text)) return pass("실사 기준 있음");
  return fail("실사 사람 기준이 약합니다", 14);
}

function checkView(scene) {
  if (scene.view === "front") return pass("정면");
  if (scene.view === "three_quarter_front") return pass("살짝 정면");
  if (scene.view === "side") return fail("옆모습은 얼굴 동일성이 흔들립니다", 18);
  return warn("정면성이 약할 수 있습니다", 8);
}

function checkPhone(scene) {
  const text = `${scene.setting || ""} ${scene.action || ""}`.toLowerCase();
  const mentionsPhone = /phone|smartphone|mobile|핸드폰|휴대폰|스마트폰/.test(text);
  if (!mentionsPhone && scene.phoneAllowed !== true) return pass("핸드폰 중심 아님");
  if (scene.phoneAllowed === true) return warn("핸드폰은 보조 소품으로 제한해야 합니다", 8);
  return fail("핸드폰 금지 컷에 핸드폰 표현이 있습니다", 14);
}

function checkMotion(scene) {
  if (hasText(scene.motion)) return pass("움직임 있음");
  return fail("움직임 설명이 부족합니다", 12);
}

function checkCamera(scene) {
  if (hasText(scene.camera)) return pass("카메라 있음");
  return fail("카메라 설명이 부족합니다", 10);
}

function checkLighting(scene) {
  const text = `${scene.setting || ""} ${scene.lighting || ""}`;
  if (/조명|빛|햇빛|네온|반사|촛불|lamp|light|sun|neon|reflection/i.test(text)) return pass("조명 단서 있음");
  return warn("조명 설명이 약합니다", 7);
}

function checkAudio(scene, manifest) {
  if (manifest.defaults?.sound === false) return pass("무음 설정");
  if (hasText(scene.audio)) return pass("소리 있음");
  return warn("소리 설명이 약합니다", 6);
}

function checkSafety(scene) {
  const text = `${scene.setting || ""} ${scene.action || ""}`.toLowerCase();
  const sensitive = /shower|bed|swimsuit|changing|slip|침대|샤워|수영복|옷갈아|슬립/.test(text);
  if (!sensitive) return pass("일반 컷");
  if (Array.isArray(scene.safetyNotes) && scene.safetyNotes.length) return pass("안전 문구 있음");
  return fail("침실/샤워/수영장/의상 컷은 단정한 안전 문구가 필요합니다", 18);
}

function checkPromptStructure(prompt) {
  const missing = REQUIRED_SECTIONS.filter((section) => !prompt.includes(section));
  if (!missing.length) return pass("프롬프트 구조 완성");
  return warn(`프롬프트 구조 누락: ${missing.join(", ")}`, missing.length * 4);
}

function hasText(value) {
  return typeof value === "string" && value.trim().length >= 8;
}

function pass(label) {
  return { status: "pass", label, penalty: 0 };
}

function warn(label, penalty) {
  return { status: "warn", label, penalty };
}

function fail(label, penalty) {
  return { status: "fail", label, penalty };
}

function gradeFor(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  return "D";
}

function labelFor(score) {
  if (score >= 90) return "최종 후보";
  if (score >= 80) return "테스트 가능";
  if (score >= 70) return "수정 권장";
  return "재작성 필요";
}

function roundRatio(value) {
  return Number(value.toFixed(2));
}
