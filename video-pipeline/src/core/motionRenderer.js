import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { createPlan } from "./planner.js";
import { createDryRun, packageRun } from "./runWriter.js";

export async function createMotionRun(manifestInput, options = {}) {
  const plan = createPlan(manifestInput, options);
  const dryRun = await createDryRun(plan.manifest, options);
  const videosDir = join(dryRun.outDir, "videos");
  await mkdir(videosDir, { recursive: true });

  const jobs = [];
  const manifestBaseDir = options.manifestPath ? dirname(resolve(options.manifestPath)) : process.cwd();

  for (const scene of plan.manifest.scenes) {
    const sourcePath = resolveSource(scene.sourceImage, manifestBaseDir);
    const outPath = join(videosDir, `${scene.sceneId}.mp4`);
    const job = {
      sceneId: scene.sceneId,
      sourceImage: sourcePath,
      output: outPath,
      status: "planned",
      error: null
    };

    if (!existsSync(sourcePath)) {
      job.status = "failed";
      job.error = `source image not found: ${sourcePath}`;
      jobs.push(job);
      continue;
    }

    try {
      await renderStillToVideo(sourcePath, outPath, {
        durationSeconds: scene.durationSeconds || plan.manifest.defaults.durationSeconds || 7,
        quality: scene.outputQuality || plan.manifest.defaults.outputQuality || plan.manifest.defaults.quality || "720p"
      });
      job.status = "completed";
    } catch (error) {
      job.status = "failed";
      job.error = error instanceof Error ? error.message : String(error);
    }
    jobs.push(job);
  }

  await writeFile(join(dryRun.outDir, "manifests", "motion-jobs.json"), `${JSON.stringify(jobs, null, 2)}\n`, "utf8");
  const motionZipPath = await packageRun(dryRun.outDir, `${plan.manifest.projectId}-${dryRun.runId}-motion.zip`);

  return {
    ...dryRun,
    zipPath: motionZipPath,
    jobs,
    completed: jobs.filter((job) => job.status === "completed").length,
    failed: jobs.filter((job) => job.status === "failed").length
  };
}

function resolveSource(sourceImage, baseDir) {
  if (!sourceImage) return "";
  return isAbsolute(sourceImage) ? sourceImage : resolve(baseDir, sourceImage);
}

function renderStillToVideo(sourcePath, outPath, options = {}) {
  const durationSeconds = options.durationSeconds || 7;
  const output = outputSettings(options.quality);
  const frames = Math.max(1, Math.round(Number(durationSeconds || 7) * 25));
  const vf = [
    `${output.preScale}`,
    `${output.crop}`,
    `zoompan=z='min(zoom+${output.zoomStep},${output.maxZoom})':d=${frames}:s=${output.size}:fps=25`,
    "format=yuv420p"
  ].join(",");

  const args = [
    "-y",
    "-loop", "1",
    "-i", sourcePath,
    "-f", "lavfi",
    "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-vf", vf,
    "-t", String(durationSeconds),
    "-shortest",
    "-c:v", "libx264",
    "-preset", output.preset,
    "-crf", output.crf,
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-movflags", "+faststart",
    outPath
  ];

  return new Promise((resolvePromise, reject) => {
    const child = spawn("ffmpeg", args, { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      if (code === 0 && existsSync(outPath)) resolvePromise(outPath);
      else reject(new Error(stderr || `ffmpeg exited with code ${code}`));
    });
  });
}

function outputSettings(quality) {
  if (String(quality).toLowerCase() === "1080p") {
    return {
      preScale: "scale=2160:3840:force_original_aspect_ratio=increase",
      crop: "crop=2160:3840",
      size: "1080x1920",
      zoomStep: "0.00028",
      maxZoom: "1.045",
      preset: "slow",
      crf: "17"
    };
  }
  return {
    preScale: "scale=1440:2560:force_original_aspect_ratio=increase",
    crop: "crop=1440:2560",
    size: "720x1280",
    zoomStep: "0.00045",
    maxZoom: "1.06",
    preset: "medium",
    crf: "23"
  };
}
