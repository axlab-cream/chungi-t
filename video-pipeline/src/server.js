import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { createPlan } from "./core/planner.js";
import { createDryRun } from "./core/runWriter.js";
import { createMotionRun } from "./core/motionRenderer.js";
import { getComfyUiStatus } from "./core/comfyuiClient.js";

const port = Number(process.env.PORT || 4177);
const publicDir = resolve(process.cwd(), "public");
const examplePath = resolve(process.cwd(), "examples", "marry-step-1.scenes.json");

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    if (req.method === "GET" && url.pathname === "/api/example") {
      return sendJson(res, JSON.parse(await readFile(examplePath, "utf8")));
    }
    if (req.method === "POST" && url.pathname === "/api/plan") {
      const body = await readJson(req);
      return sendJson(res, createPlan(body.manifest, body.options || {}));
    }
    if (req.method === "GET" && url.pathname === "/api/comfyui/status") {
      return sendJson(res, await getComfyUiStatus());
    }
    if (req.method === "POST" && url.pathname === "/api/dry-run") {
      const body = await readJson(req);
      const result = await createDryRun(body.manifest, body.options || {});
      return sendJson(res, {
        runId: result.runId,
        outDir: result.outDir,
        zipPath: result.zipPath,
        plan: result.plan
      });
    }
    if (req.method === "POST" && url.pathname === "/api/render-motion") {
      const body = await readJson(req);
      const result = await createMotionRun(body.manifest, body.options || {});
      return sendJson(res, {
        runId: result.runId,
        outDir: result.outDir,
        zipPath: result.zipPath,
        completed: result.completed,
        failed: result.failed,
        jobs: result.jobs
      });
    }
    return serveStatic(url.pathname, res);
  } catch (error) {
    sendJson(res, { error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

server.listen(port, () => {
  console.log(`UMSH Video Pipeline running at http://localhost:${port}`);
});

async function readJson(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  return JSON.parse(body || "{}");
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data, null, 2));
}

async function serveStatic(pathname, res) {
  const cleanPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = resolve(publicDir, `.${cleanPath}`);
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("접근할 수 없습니다");
    return;
  }
  if (!existsSync(filePath)) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("파일을 찾을 수 없습니다");
    return;
  }
  const contentType = contentTypeFor(filePath);
  res.writeHead(200, { "content-type": contentType });
  const stream = createReadStream(filePath);
  stream.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    }
    res.end("파일을 읽을 수 없습니다");
  });
  stream.pipe(res);
}

function contentTypeFor(filePath) {
  const ext = extname(filePath);
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  return "application/octet-stream";
}
