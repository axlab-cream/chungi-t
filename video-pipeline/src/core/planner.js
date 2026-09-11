import { presetForScene } from "./presets.js";
import { compilePrompt } from "./promptCompiler.js";
import { normalizeReferenceOrder } from "./referenceOrder.js";
import { assessPortfolioQuality, assessSceneQuality } from "./qualityGate.js";
import { wanProfiles } from "./wanWorkflow.js";

export function normalizeManifest(input, overrides = {}) {
  const manifest = typeof input === "string" ? JSON.parse(input) : structuredClone(input);
  manifest.projectId = manifest.projectId || "umsh-video-project";
  manifest.title = manifest.title || manifest.projectId;
  manifest.batchSize = Number(overrides.batchSize || manifest.batchSize || 4);
  manifest.strategy = overrides.strategy || manifest.strategy || "free_local";
  manifest.defaults = {
    durationSeconds: 7,
    aspectRatio: "9:16",
    quality: "720p",
    sound: true,
    ageRange: "late 20s",
    style: "photorealistic live-action",
    wanProfile: overrides.wanProfile || manifest.defaults?.wanProfile || "balanced_7s",
    ...(manifest.defaults || {})
  };
  manifest.defaults.wanProfile = overrides.wanProfile || manifest.defaults.wanProfile || "balanced_7s";
  manifest.referenceOrder = normalizeReferenceOrder(manifest);
  manifest.scenes = Array.isArray(manifest.scenes) ? manifest.scenes : [];
  return manifest;
}

export function createPlan(input, overrides = {}) {
  const manifest = normalizeManifest(input, overrides);
  const plannedScenes = manifest.scenes.map((scene, index) => {
    const preset = presetForScene(manifest.strategy, scene);
    const duration = scene.durationSeconds || manifest.defaults.durationSeconds;
    const credits = Number((duration * preset.creditsPerSecond).toFixed(1));
    const warnings = warningsForScene(scene, manifest);
    const prompt = compilePrompt(manifest, scene);
    const quality = assessSceneQuality(scene, manifest, prompt);
    const qualityWarnings = quality.checks
      .filter((check) => check.status !== "pass")
      .map((check) => check.label);
    return {
      index: index + 1,
      sceneId: scene.sceneId || `scene-${index + 1}`,
      title: scene.title || scene.sceneId || `${index + 1}번 컷`,
      subject: scene.subject || "person",
      view: scene.view || "front",
      strategy: manifest.strategy,
      providerPreset: preset.id,
      providerLabel: preset.label,
      model: preset.model,
      durationSeconds: duration,
      wanProfile: manifest.defaults.wanProfile,
      wanProfileLabel: wanProfiles[manifest.defaults.wanProfile]?.label || wanProfiles.balanced_7s.label,
      estimatedCredits: credits,
      warnings: [...warnings, ...qualityWarnings],
      quality,
      prompt
    };
  });

  const batchSize = manifest.batchSize === 6 ? 6 : 4;
  const batches = [];
  for (let i = 0; i < plannedScenes.length; i += batchSize) {
    const scenes = plannedScenes.slice(i, i + batchSize);
    batches.push({
      batch: batches.length + 1,
      sceneIds: scenes.map((scene) => scene.sceneId),
      estimatedCredits: round(sum(scenes.map((scene) => scene.estimatedCredits))),
      warningCount: sum(scenes.map((scene) => scene.warnings.length))
    });
  }

  const portfolioQuality = assessPortfolioQuality(manifest.scenes, plannedScenes);
  const portfolioWarnings = warningsForPortfolio(manifest.scenes, plannedScenes);
  const estimatedCredits = round(sum(plannedScenes.map((scene) => scene.estimatedCredits)));

  return {
    manifest,
    scenes: plannedScenes,
    batches,
    cost: {
      totalScenes: plannedScenes.length,
      paidScenes: plannedScenes.filter((scene) => scene.estimatedCredits > 0).length,
      localScenes: plannedScenes.filter((scene) => scene.estimatedCredits === 0).length,
      estimatedCredits,
      strategy: manifest.strategy
    },
    wan: {
      profile: manifest.defaults.wanProfile,
      label: wanProfiles[manifest.defaults.wanProfile]?.label || wanProfiles.balanced_7s.label,
      expectedSecondsPerScene: wanProfiles[manifest.defaults.wanProfile]?.expectedSeconds || wanProfiles.balanced_7s.expectedSeconds,
      note: wanProfiles[manifest.defaults.wanProfile]?.note || wanProfiles.balanced_7s.note
    },
    quality: portfolioQuality,
    warnings: [...portfolioWarnings, ...plannedScenes.flatMap((scene) => scene.warnings.map((warning) => `${scene.sceneId}: ${warning}`))]
  };
}

function warningsForScene(scene, manifest) {
  const warnings = [];
  if (!manifest.identityReference && ["woman", "man", "couple"].includes(scene.subject)) {
    warnings.push("인물 컷인데 기준 얼굴 이미지가 없습니다");
  }
  if (scene.view === "side") warnings.push("옆모습은 얼굴 동일성이 흔들릴 수 있습니다");
  if (scene.phoneAllowed !== true && /phone|smartphone|mobile|핸드폰|휴대폰|스마트폰/i.test(`${scene.setting} ${scene.action}`)) {
    warnings.push("핸드폰 금지 컷인데 장면 문장에 핸드폰이 들어 있습니다");
  }
  if (/shower|bed|swimsuit|changing|slip|침대|샤워|수영복|옷갈아|슬립/i.test(`${scene.setting} ${scene.action}`) && !scene.safetyNotes?.length) {
    warnings.push("침대/샤워/수영장/의상 컷은 안전 문구가 필요합니다");
  }
  return warnings;
}

function warningsForPortfolio(rawScenes, scenes) {
  const warnings = [];
  const human = scenes.filter((scene) => ["woman", "man", "couple"].includes(scene.subject));
  const sideCount = human.filter((scene) => scene.view === "side").length;
  const phoneCount = rawScenes.filter((scene) => {
    const text = `${scene.setting || ""} ${scene.action || ""}`;
    return scene.phoneAllowed === true || /\bphone|smartphone|mobile\b/i.test(text);
  }).length;
  const hasMan = human.some((scene) => scene.subject === "man" || scene.subject === "couple");
  const hasCouple = human.some((scene) => scene.subject === "couple");
  if (human.length && sideCount / human.length > 0.25) warnings.push("옆모습 컷이 너무 많습니다");
  if (human.length && phoneCount / human.length > 0.3) warnings.push("핸드폰 중심 컷이 너무 많습니다");
  if (!hasMan) warnings.push("남성 또는 커플 컷이 없습니다");
  if (!hasCouple) warnings.push("커플 컷이 없습니다");
  return warnings;
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function round(value) {
  return Number(value.toFixed(1));
}
