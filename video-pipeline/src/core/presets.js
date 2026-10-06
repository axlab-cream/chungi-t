export const providerPresets = {
  free_local: {
    id: "free_local",
    label: "무료 초안",
    provider: "local",
    model: "comfyui-or-open-source",
    creditsPerSecond: 0,
    notes: "유료 크레딧을 쓰지 않습니다. 로컬 생성이나 무료 초안에 사용합니다."
  },
  image_motion: {
    id: "image_motion",
    label: "이미지 모션",
    provider: "local",
    model: "parallax-motion",
    creditsPerSecond: 0,
    notes: "유료 크레딧을 쓰지 않습니다. 배경 컷이나 부분 확대 컷에 적합합니다."
  },
  paid_budget: {
    id: "paid_budget",
    label: "저가 유료",
    provider: "paid",
    model: "seedance_2_0_mini-or-equivalent",
    creditsPerSecond: 2.5,
    notes: "저가 유료 모델을 기준으로 한 대략적인 계산입니다."
  },
  paid_quality: {
    id: "paid_quality",
    label: "고품질 유료",
    provider: "paid",
    model: "seedance_2_5-or-equivalent",
    creditsPerSecond: 6.5,
    notes: "고품질 유료 모델을 기준으로 한 대략적인 계산입니다."
  }
};

export function presetForScene(strategy, scene) {
  if (strategy === "paid_quality") return providerPresets.paid_quality;
  if (strategy === "hybrid") {
    return scene.final === true || scene.subject === "couple"
      ? providerPresets.paid_quality
      : providerPresets.free_local;
  }
  if (scene.subject === "bridge" || scene.subject === "hands") return providerPresets.image_motion;
  return providerPresets.free_local;
}
