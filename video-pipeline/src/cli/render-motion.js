import { createMotionRun } from "../core/motionRenderer.js";
import { readManifestFile } from "../core/runWriter.js";

const args = parseArgs(process.argv.slice(2));

if (!args.manifest) {
  console.error("Usage: node src/cli/render-motion.js --manifest path/to/scenes.json [--strategy free_local] [--batch-size 4|6]");
  process.exit(1);
}

try {
  const manifest = await readManifestFile(args.manifest);
  const result = await createMotionRun(manifest, {
    manifestPath: args.manifest,
    strategy: args.strategy,
    batchSize: args.batchSize ? Number(args.batchSize) : undefined
  });
  console.log(JSON.stringify({
    runId: result.runId,
    outDir: result.outDir,
    zipPath: result.zipPath,
    completed: result.completed,
    failed: result.failed,
    jobs: result.jobs
  }, null, 2));
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

