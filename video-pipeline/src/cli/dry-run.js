import { createDryRun, readManifestFile } from "../core/runWriter.js";

const args = parseArgs(process.argv.slice(2));

if (!args.manifest) {
  console.error("Usage: node src/cli/dry-run.js --manifest examples/marry-step-1.scenes.json [--strategy free_local|hybrid|paid_quality] [--batch-size 4|6] [--wan-profile balanced_7s|fast_check|final_7s]");
  process.exit(1);
}

try {
  const manifest = await readManifestFile(args.manifest);
  const result = await createDryRun(manifest, {
    strategy: args.strategy,
    batchSize: args.batchSize ? Number(args.batchSize) : undefined,
    wanProfile: args.wanProfile
  });
  console.log(JSON.stringify({
    runId: result.runId,
    outDir: result.outDir,
    zipPath: result.zipPath,
    cost: result.plan.cost,
    wan: result.plan.wan,
    warnings: result.plan.warnings
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
