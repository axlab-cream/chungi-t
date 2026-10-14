import { readManifestFile } from "../core/runWriter.js";
import { createPlan } from "../core/planner.js";

const args = parseArgs(process.argv.slice(2));

if (!args.manifest) {
  console.error("Usage: node src/cli/quality-check.js --manifest examples/marry-step-1.scenes.json [--min-score 80]");
  process.exit(1);
}

const minScore = Number(args.minScore || 80);

try {
  const manifest = await readManifestFile(args.manifest);
  const plan = createPlan(manifest, {
    strategy: args.strategy,
    batchSize: args.batchSize ? Number(args.batchSize) : undefined
  });
  const failed = plan.scenes.filter((scene) => scene.quality.score < minScore);
  const summary = {
    averageScore: plan.quality.averageScore,
    grade: plan.quality.grade,
    minScore,
    failed: failed.map((scene) => ({
      sceneId: scene.sceneId,
      score: scene.quality.score,
      grade: scene.quality.grade,
      warnings: scene.warnings
    }))
  };
  console.log(JSON.stringify(summary, null, 2));
  if (failed.length) process.exit(1);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

function parseArgs(values) {
  const parsed = {};
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (value.startsWith("--")) {
      parsed[value.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = values[i + 1];
      i += 1;
    }
  }
  return parsed;
}
