export const wanProfiles = {
  final_7s: {
    id: "final_7s",
    label: "최종 7초",
    width: 480,
    height: 832,
    frames: 81,
    fps: 12,
    steps: 20,
    cfg: 6,
    shift: 8,
    weightDtype: "default",
    sampler: "uni_pc",
    scheduler: "simple",
    expectedSeconds: 981,
    note: "품질 우선. 1컷 약 16분 이상 걸릴 수 있습니다."
  },
  balanced_7s: {
    id: "balanced_7s",
    label: "균형 7초",
    width: 480,
    height: 832,
    frames: 81,
    fps: 12,
    steps: 16,
    cfg: 5.5,
    shift: 8,
    weightDtype: "fp8_e4m3fn",
    sampler: "uni_pc",
    scheduler: "simple",
    expectedSeconds: 720,
    note: "운영 후보. 얼굴 보존을 유지하면서 시간을 줄이는 기본 개선안입니다."
  },
  fast_check: {
    id: "fast_check",
    label: "빠른 확인",
    width: 480,
    height: 832,
    frames: 33,
    fps: 12,
    steps: 12,
    cfg: 6,
    shift: 8,
    weightDtype: "fp8_e4m3fn",
    sampler: "uni_pc",
    scheduler: "simple",
    expectedSeconds: 190,
    note: "구도와 얼굴 흔들림 확인용입니다. 최종 영상 길이는 아닙니다."
  }
};

const wanNegative = [
  "cartoon",
  "webtoon",
  "anime",
  "illustration",
  "painted style",
  "plastic skin",
  "over-smoothed face",
  "face morphing",
  "different person",
  "identity drift",
  "distorted hands",
  "extra fingers",
  "missing fingers",
  "merged fingers",
  "warped cup",
  "warped props",
  "large gesture",
  "walking away from frame",
  "talking mouth",
  "fast zoom",
  "scene cut",
  "caption",
  "readable text",
  "logo",
  "watermark",
  "horror mood",
  "sexualized pose",
  "revealing clothing"
];

export function buildWanWorkflows(plan, options = {}) {
  const profileId = options.wanProfile || plan.manifest.defaults?.wanProfile || "balanced_7s";
  const profile = wanProfiles[profileId] || wanProfiles.balanced_7s;
  return plan.scenes.map((scene) => ({
    sceneId: scene.sceneId,
    title: scene.title,
    profile: profile.id,
    profileLabel: profile.label,
    expectedSeconds: profile.expectedSeconds,
    note: profile.note,
    workflow: buildWanWorkflow(scene, profile, options)
  }));
}

export function buildWanWorkflow(scene, profile = wanProfiles.balanced_7s, options = {}) {
  const sourceImageName = options.sourceImageName || `${scene.sceneId}.png`;
  const seed = Number(options.seed || stableSeed(scene.sceneId));
  const positive = hardenWanPositive(scene);
  const negative = uniqueWords([scene.negativePrompt, wanNegative.join(", ")]).join(", ");
  const prefix = options.filenamePrefix || `umsh_wan_${scene.sceneId}_${profile.id}`;

  return {
    "1": { class_type: "LoadImage", inputs: { image: sourceImageName } },
    "2": { class_type: "CLIPVisionLoader", inputs: { clip_name: "clip_vision_h.safetensors" } },
    "3": { class_type: "CLIPVisionEncode", inputs: { clip_vision: ["2", 0], image: ["1", 0], crop: "none" } },
    "4": { class_type: "VAELoader", inputs: { vae_name: "wan_2.1_vae.safetensors" } },
    "5": { class_type: "CLIPLoader", inputs: { clip_name: "umt5_xxl_fp8_e4m3fn_scaled.safetensors", type: "wan" } },
    "6": { class_type: "CLIPTextEncode", inputs: { clip: ["5", 0], text: positive } },
    "7": { class_type: "CLIPTextEncode", inputs: { clip: ["5", 0], text: negative } },
    "8": {
      class_type: "WanImageToVideo",
      inputs: {
        positive: ["6", 0],
        negative: ["7", 0],
        vae: ["4", 0],
        width: profile.width,
        height: profile.height,
        length: profile.frames,
        batch_size: 1,
        clip_vision_output: ["3", 0],
        start_image: ["1", 0]
      }
    },
    "9": {
      class_type: "UNETLoader",
      inputs: {
        unet_name: "wan2.1_i2v_480p_14B_fp16.safetensors",
        weight_dtype: profile.weightDtype
      }
    },
    "10": { class_type: "ModelSamplingSD3", inputs: { model: ["9", 0], shift: profile.shift } },
    "11": {
      class_type: "KSampler",
      inputs: {
        model: ["10", 0],
        seed,
        steps: profile.steps,
        cfg: profile.cfg,
        sampler_name: profile.sampler,
        scheduler: profile.scheduler,
        positive: ["8", 0],
        negative: ["8", 1],
        latent_image: ["8", 2],
        denoise: 1
      }
    },
    "12": { class_type: "VAEDecode", inputs: { samples: ["11", 0], vae: ["4", 0] } },
    "13": {
      class_type: "SaveWEBM",
      inputs: {
        images: ["12", 0],
        filename_prefix: prefix,
        codec: "vp9",
        fps: profile.fps,
        crf: 18
      }
    }
  };
}

export function hardenWanPositive(scene) {
  const parts = [
    "photorealistic Korean live-action image-to-video shot",
    "same exact person as the input image, preserve face identity across every frame",
    "preserve natural Korean facial structure, eyes, nose, mouth, jawline, skin texture, hair length, outfit, body proportions",
    "front-facing or three-quarter-front face, avoid side profile",
    "subtle blink, tiny eye movement, small breathing motion, minimal hand movement only",
    "hands keep five natural fingers, no finger merging, no prop warping",
    "real camera exposure, realistic pores, natural fabric texture, no doll-like smoothness",
    "single continuous shot, no scene cut, no sudden pose change",
    scene.setting,
    scene.action,
    scene.motion,
    scene.camera,
    scene.lighting,
    "restrained cinematic motion, vertical 9:16 mobile advertisement"
  ];
  return parts.filter(Boolean).join(", ");
}

function uniqueWords(values) {
  return [...new Set(values.filter(Boolean).join(", ").split(",").map((item) => item.trim()).filter(Boolean))];
}

function stableSeed(value) {
  const text = String(value || "umsh");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}
