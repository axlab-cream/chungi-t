import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawn } from "node:child_process";

const browserPath = findBrowserPath();
const port = 9237;
const targetUrl = process.argv[2] || "http://localhost:4177";
const outDir = resolve(process.cwd(), "..", "영상", "_generated", "ui-smoke", timestampRunId());
const screenshotPath = join(outDir, "ui-smoke.png");

if (!existsSync(browserPath)) {
  console.error("브라우저 실행 파일을 찾을 수 없습니다.");
  process.exit(1);
}

await mkdir(outDir, { recursive: true });

const browser = spawn(browserPath, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${join(outDir, "profile")}`,
  "about:blank"
], { windowsHide: true });

try {
  const pageWsUrl = await createPage(targetUrl);
  const cdp = await connectCdp(pageWsUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await waitForLoad(cdp);

  const initial = await evalJson(cdp, getUiStateExpression());
  await click(cdp, "#compile");
  await delay(250);
  const afterCompile = await evalJson(cdp, getUiStateExpression());
  await click(cdp, "#checkComfy");
  await waitForUi(cdp, (state) => state.engineStatus.includes("실행 중") || state.engineStatus.includes("엔진 꺼짐"), 5000);
  const afterEngineCheck = await evalJson(cdp, getUiStateExpression());
  await click(cdp, "#dryRun");
  await waitForUi(cdp, (state) => state.output.includes("압축파일:") || state.status.includes("실패"), 8000);
  const afterDryRun = await evalJson(cdp, getUiStateExpression());

  const screenshot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));

  const result = {
    url: targetUrl,
    screenshotPath,
    checks: {
      pageLoaded: initial.title.includes("영상 제작기"),
      koreanButtons: initial.buttons.includes("예제 불러오기") && initial.buttons.includes("준비 압축파일"),
      compileWorked: afterCompile.status.includes("계산"),
      sceneRowsVisible: afterCompile.sceneRows >= 1,
      promptIsKorean: afterCompile.prompt.includes("[의도]") && afterCompile.prompt.includes("실사 영상") && afterCompile.prompt.includes("[참고 순서]"),
      referenceOrderVisible: afterCompile.prompt.includes("1차: 핀터레스트") && afterCompile.prompt.includes("2차: 소스방") && afterCompile.prompt.includes("3차: 힉스필드"),
      qualityVisible: afterCompile.metrics.some((value) => value.includes("점")),
      engineCheckWorked: afterEngineCheck.engineStatus.includes("실행 중") || afterEngineCheck.engineStatus.includes("엔진 꺼짐"),
      dryRunWorked: afterDryRun.status.includes("압축파일") && afterDryRun.output.includes("압축파일:")
    },
    initial,
    afterCompile,
    afterEngineCheck,
    afterDryRun
  };

  console.log(JSON.stringify(result, null, 2));
  const failed = Object.entries(result.checks).filter(([, ok]) => !ok);
  process.exit(failed.length ? 1 : 0);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  browser.kill();
}

async function createPage(url) {
  await waitForHttp(`http://127.0.0.1:${port}/json/version`);
  const res = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
  const data = await res.json();
  return data.webSocketDebuggerUrl;
}

async function connectCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolvePromise, reject) => {
    ws.addEventListener("open", resolvePromise, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolvePromise, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolvePromise(message.result || {});
    }
  });
  return {
    send(method, params = {}) {
      id += 1;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolvePromise, reject) => {
        pending.set(id, { resolvePromise, reject });
      });
    }
  };
}

async function waitForLoad(cdp) {
  for (let i = 0; i < 40; i += 1) {
    const state = await evalJson(cdp, "({ readyState: document.readyState, hasApp: Boolean(document.querySelector('#compile')) })");
    if (state.readyState === "complete" && state.hasApp) return;
    await delay(250);
  }
  throw new Error("화면 로드를 확인하지 못했습니다.");
}

async function click(cdp, selector) {
  await cdp.send("Runtime.evaluate", {
    expression: `document.querySelector(${JSON.stringify(selector)}).click()`,
    awaitPromise: true
  });
}

async function waitForUi(cdp, predicate, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const state = await evalJson(cdp, getUiStateExpression());
    if (predicate(state)) return state;
    await delay(250);
  }
  throw new Error("화면 상태가 제한 시간 안에 바뀌지 않았습니다.");
}

async function evalJson(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression: `JSON.stringify(${expression})`,
    returnByValue: true,
    awaitPromise: true
  });
  return JSON.parse(result.result.value);
}

function getUiStateExpression() {
  return `({
    title: document.title,
    h1: document.querySelector('h1')?.textContent || '',
    status: document.querySelector('#validState')?.textContent || '',
    buttons: Array.from(document.querySelectorAll('button')).map((button) => button.textContent.trim()),
    sceneRows: document.querySelectorAll('#sceneRows tr').length,
    metrics: Array.from(document.querySelectorAll('.summaryMetrics dd')).map((node) => node.textContent.trim()),
    prompt: document.querySelector('#promptPreview')?.textContent.slice(0, 620) || '',
    engineStatus: document.querySelector('#engineStatus')?.textContent || '',
    output: document.querySelector('#output')?.textContent || ''
  })`;
}

async function waitForHttp(url) {
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      await delay(250);
    }
  }
  throw new Error("브라우저 디버그 포트에 연결하지 못했습니다.");
}

function delay(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
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

function findBrowserPath() {
  const candidates = process.platform === "win32"
    ? [
      process.env.BROWSER_PATH,
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    ]
    : [
      process.env.BROWSER_PATH,
      "/snap/bin/chromium",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/usr/bin/google-chrome",
      "/usr/bin/microsoft-edge"
    ];
  return candidates.find((candidate) => candidate && existsSync(candidate)) || "";
}
