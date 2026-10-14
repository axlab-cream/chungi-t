import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const defaultModelsDir = process.env.COMFYUI_MODELS_DIR || "/home/creamboss/project/comfyui-umsh/ComfyUI/models";

export async function getComfyUiStatus(baseUrl = process.env.COMFYUI_URL || "http://127.0.0.1:8188") {
  const url = baseUrl.replace(/\/$/, "");
  const models = await getComfyUiModelsStatus();
  try {
    const response = await fetch(`${url}/system_stats`, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) {
      return {
        ok: false,
        url,
        models,
        message: `ComfyUI 응답 오류: ${response.status}`
      };
    }
    const data = await response.json();
    const gpu = Array.isArray(data.devices) ? data.devices[0] : null;
    return {
      ok: true,
      url,
      version: data.system?.comfyui_version || "-",
      python: data.system?.python_version || "-",
      torch: data.system?.pytorch_version || "-",
      gpu: gpu?.name || "-",
      vramFreeGb: gpu?.vram_free ? roundGb(gpu.vram_free) : null,
      vramTotalGb: gpu?.vram_total ? roundGb(gpu.vram_total) : null,
      models,
      message: "ComfyUI 실행 중"
    };
  } catch (error) {
    return {
      ok: false,
      url,
      models,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function getComfyUiModelsStatus(modelsDir = defaultModelsDir) {
  const groups = [
    ["generation", "diffusion_models", "생성 모델"],
    ["text", "text_encoders", "문장 이해 모델"],
    ["imageReference", "clip_vision", "이미지 참고 모델"],
    ["vae", "vae", "영상 복원 모델"]
  ];
  const byGroup = {};

  for (const [key, folder, label] of groups) {
    const directory = join(modelsDir, folder);
    byGroup[key] = await readModelGroup(directory, label);
  }

  return {
    root: modelsDir,
    total: Object.values(byGroup).reduce((sum, group) => sum + group.count, 0),
    generation: byGroup.generation.count,
    text: byGroup.text.count,
    imageReference: byGroup.imageReference.count,
    vae: byGroup.vae.count,
    groups: byGroup
  };
}

async function readModelGroup(directory, label) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      if (!entry.name.endsWith(".safetensors")) continue;
      const filePath = join(directory, entry.name);
      const fileStat = await stat(filePath);
      files.push({
        name: entry.name,
        sizeGb: roundGb(fileStat.size)
      });
    }
    files.sort((a, b) => a.name.localeCompare(b.name));
    return { ok: true, label, directory, count: files.length, files };
  } catch (error) {
    return {
      ok: false,
      label,
      directory,
      count: 0,
      files: [],
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

function roundGb(bytes) {
  return Number((bytes / 1024 / 1024 / 1024).toFixed(1));
}
