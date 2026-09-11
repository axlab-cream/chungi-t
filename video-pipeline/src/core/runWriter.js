import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { createPlan } from "./planner.js";
import { buildWanWorkflows, wanProfiles } from "./wanWorkflow.js";

export async function createDryRun(manifestInput, options = {}) {
  const plan = createPlan(manifestInput, options);
  const runId = options.runId || timestampRunId();
  const root = resolve(process.cwd(), "..");
  const outDir = resolve(root, "영상", "_generated", plan.manifest.projectId, runId);
  const manifestDir = join(outDir, "manifests");

  await mkdir(manifestDir, { recursive: true });
  await writeJson(join(manifestDir, "scenes.json"), plan.manifest);
  await writeJson(join(manifestDir, "prompts.json"), plan.scenes.map((scene) => ({
    sceneId: scene.sceneId,
    title: scene.title,
    providerPreset: scene.providerPreset,
    model: scene.model,
      estimatedCredits: scene.estimatedCredits,
      quality: scene.quality,
      prompt: scene.prompt
  })));
  await writeJson(join(manifestDir, "batches.json"), plan.batches);
  await writeJson(join(manifestDir, "cost.json"), plan.cost);
  await writeJson(join(manifestDir, "reference-order.json"), plan.manifest.referenceOrder);
  await writeJson(join(manifestDir, "qa-checklist.json"), createQaChecklist(plan));
  await writeJson(join(manifestDir, "wan-profiles.json"), wanProfiles);
  await writeWanWorkflows(manifestDir, plan, options);
  await writeFile(join(outDir, "README.md"), createReadme(plan, runId), "utf8");

  const zipPath = await packageRun(outDir, `${plan.manifest.projectId}-${runId}-dry-run.zip`);

  return {
    runId,
    outDir,
    zipPath,
    plan
  };
}

async function writeWanWorkflows(manifestDir, plan, options) {
  const workflows = buildWanWorkflows(plan, options);
  const workflowDir = join(manifestDir, "comfyui-wan-workflows");
  await mkdir(workflowDir, { recursive: true });
  await writeJson(join(manifestDir, "comfyui-wan-workflows.json"), workflows.map((item) => ({
    sceneId: item.sceneId,
    title: item.title,
    profile: item.profile,
    profileLabel: item.profileLabel,
    expectedSeconds: item.expectedSeconds,
    note: item.note,
    workflowFile: `comfyui-wan-workflows/${item.sceneId}.json`
  })));
  for (const item of workflows) {
    await writeJson(join(workflowDir, `${item.sceneId}.json`), item.workflow);
  }
}

export async function packageRun(outDir, zipName) {
  const archiveName = process.platform === "win32" ? zipName : zipName.replace(/\.zip$/i, ".tar.gz");
  const archivePath = join(outDir, archiveName);
  await compressDirectory(outDir, archivePath);
  return archivePath;
}

export async function readManifestFile(path) {
  const content = await readFile(path, "utf8");
  return JSON.parse(content);
}

function createQaChecklist(plan) {
  return {
    required: [
      "Looks like photorealistic live-action, not webtoon/anime/illustration",
      "Same identity is preserved when identity reference is used",
      "Face is front or three-quarter front unless intentionally different",
      "No repeated phone-only action",
      "Male/couple coverage is present when needed",
      "Hands and fingers are natural",
      "No readable text, captions, logos, or watermarks",
      "Adult/modest/non-explicit tone for bedroom, shower, pool, changing scenes",
      "Duration is about 7 seconds",
      "Aspect ratio is 9:16"
    ],
    warnings: plan.warnings
  };
}

function createReadme(plan, runId) {
  return [
    `# ${plan.manifest.title}`,
    "",
    `작업 번호: ${runId}`,
    `제작 방식: ${labelStrategy(plan.manifest.strategy)}`,
    `한 번에 만들 컷 수: ${plan.manifest.batchSize}`,
    `전체 컷: ${plan.cost.totalScenes}`,
    `무료 컷: ${plan.cost.localScenes}`,
    `유료 컷: ${plan.cost.paidScenes}`,
    `예상 유료 크레딧: ${plan.cost.estimatedCredits}`,
    `평균 품질: ${plan.quality.averageScore}점 (${plan.quality.label})`,
    `Wan 추천 설정: ${plan.manifest.defaults?.wanProfile || "balanced_7s"}`,
    "",
    "## 참고 순서",
    "",
    ...plan.manifest.referenceOrder.map((item) => `- ${item.priority}차 ${item.label}: ${item.purpose}`),
    "",
    "## 묶음",
    "",
    ...plan.batches.map((batch) => `- ${batch.batch}번째 묶음: ${batch.sceneIds.join(", ")} (${batch.estimatedCredits} 크레딧)`),
    "",
    "## 주의할 점",
    "",
    ...(plan.warnings.length ? plan.warnings.map((warning) => `- ${warning}`) : ["- 없음"]),
    "",
    "## ComfyUI Wan 워크플로우",
    "",
    "- `manifests/wan-profiles.json`: 7초 최종용, 균형형, 빠른 확인용 설정",
    "- `manifests/comfyui-wan-workflows.json`: 컷별 워크플로우 목록",
    "- `manifests/comfyui-wan-workflows/{sceneId}.json`: ComfyUI API에 바로 넣을 수 있는 워크플로우",
    ""
  ].join("\n");
}

function labelStrategy(value) {
  if (value === "free_local") return "무료 초안";
  if (value === "hybrid") return "무료 초안 + 중요 컷만 유료";
  if (value === "paid_quality") return "전체 유료 고품질";
  return value || "-";
}

async function writeJson(path, data) {
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function timestampRunId() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join("");
}

function compressDirectory(sourceDir, archivePath) {
  if (existsSync(archivePath)) {
    return Promise.resolve(archivePath);
  }
  if (process.platform !== "win32") {
    return compressDirectoryWithTar(sourceDir, archivePath);
  }
  const parent = resolve(sourceDir, "..");
  const leaf = sourceDir.split(/[\\/]/).pop();
  const command = [
    "$ErrorActionPreference = 'Stop';",
    `Compress-Archive -Path ${quotePs(join(parent, leaf, "*"))} -DestinationPath ${quotePs(archivePath)} -Force`
  ].join(" ");

  return new Promise((resolvePromise, reject) => {
    const child = spawn("powershell", ["-NoProfile", "-Command", command], { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0 && existsSync(archivePath)) resolvePromise(archivePath);
      else if (code === 0) reject(new Error(`Compress-Archive completed but archive was not created: ${archivePath}`));
      else reject(new Error(stderr || `Compress-Archive exited with code ${code}`));
    });
  });
}

function compressDirectoryWithTar(sourceDir, archivePath) {
  const tempArchivePath = resolve(sourceDir, "..", `.${basename(archivePath)}.${process.pid}.tmp`);
  return new Promise((resolvePromise, reject) => {
    const child = spawn("tar", ["-czf", tempArchivePath, "-C", sourceDir, "."], { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", async (code) => {
      try {
        if (code !== 0) {
          reject(new Error(stderr || `tar exited with code ${code}`));
          return;
        }
        if (!existsSync(tempArchivePath)) {
          reject(new Error(`tar completed but archive was not created: ${tempArchivePath}`));
          return;
        }
        await rename(tempArchivePath, archivePath);
        resolvePromise(archivePath);
      } catch (error) {
        reject(error);
      }
    });
  });
}

function quotePs(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}
