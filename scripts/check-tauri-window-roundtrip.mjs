import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  open,
  readFile,
  realpath,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const appIdentifier = "com.damon.jijirululing";
const debugBinary = path.join(projectRoot, "src-tauri/target/debug/jiji-rululing");
const helperSource = path.join(scriptDirectory, "tauri-window-roundtrip-helper.swift");
const actualPersistencePath = path.join(
  os.homedir(),
  "Library/Application Support",
  appIdentifier,
  "persistence.v1.json",
);
const sizeTolerance = 24;
const positionTolerance = 4;
const shouldBuild = !process.argv.includes("--skip-build");
const keepScreenshots = !process.argv.includes("--no-screenshots");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const auditDirectory = path.join(projectRoot, "artifacts/tauri-window-roundtrip", timestamp);
const tempHome = await mkdtemp(path.join(os.tmpdir(), "jiji-rululing-tauri-window-roundtrip-"));
const tempPersistencePath = path.join(
  tempHome,
  "Library/Application Support",
  appIdentifier,
  "persistence.v1.json",
);
const helperBinary = path.join(auditDirectory, "tauri-window-roundtrip-helper");
const debugLogPath = path.join(auditDirectory, "debug-app.log");
const viteLogPath = path.join(auditDirectory, "vite.log");
const metadataPath = path.join(auditDirectory, "audit.json");
// WKWebView does not expose its DOM controls through AX. Keep these points scoped to the fixed smoke fixture and sizes.
const localCoordinates = {
  compactCenser: { x: 195, y: 105 },
  fullCloseModalKeepCompact: { x: 625, y: 490 },
  fullRestoreModalPrimary: { x: 625, y: 525 },
};
const steps = [];
const metadata = {
  actualPersistencePath,
  appIdentifier,
  auditDirectory,
  debugBinary,
  finishedAt: null,
  screenshots: [],
  startedAt: new Date().toISOString(),
  steps,
  tempHome,
};

let debugChild = null;
let debugLogHandle = null;
let frontendChild = null;
let frontendLogHandle = null;
let failure = null;

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const logStep = (message) => {
  steps.push(message);
  console.log(`PASS: ${message}`);
};

const fail = (message) => {
  throw new Error(message);
};

const fileExists = async (filePath) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const snapshotFile = async (filePath) => {
  if (!(await fileExists(filePath))) {
    return { exists: false };
  }

  const [contents, fileStat] = await Promise.all([readFile(filePath), stat(filePath)]);

  return {
    bytes: contents.length,
    exists: true,
    modifiedAtMs: fileStat.mtimeMs,
    sha256: createHash("sha256").update(contents).digest("hex"),
  };
};

const assertFileSnapshotUnchanged = (before, after, label) => {
  const isUnchanged =
    before.exists === after.exists &&
    (!before.exists ||
      (before.bytes === after.bytes &&
        before.modifiedAtMs === after.modifiedAtMs &&
        before.sha256 === after.sha256));

  if (!isUnchanged) {
    fail(`${label} changed: before=${JSON.stringify(before)} after=${JSON.stringify(after)}`);
  }
};

const run = async (command, args, options = {}) => {
  const child = spawn(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    ...options,
  });

  await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with ${signal ?? code ?? "unknown status"}`));
    });
  });
};

const runSync = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    ...options,
  });

  if (result.error) {
    fail(`${command} could not start: ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(
      `${command} ${args.join(" ")} exited with ${result.status ?? "unknown status"}\n` +
        `${result.stdout ?? ""}${result.stderr ?? ""}`,
    );
  }

  return result.stdout.trim();
};

const readConstants = async () => {
  const source = await readFile(path.join(projectRoot, "src/constants.ts"), "utf8");

  const readSize = (name) => {
    const match = source.match(
      new RegExp(`export const ${name} = \\{ width: (\\d+), height: (\\d+) \\} as const;`),
    );

    if (!match) {
      fail(`Cannot read ${name} from src/constants.ts`);
    }

    return { height: Number(match[2]), width: Number(match[1]) };
  };

  return {
    compact: readSize("COMPACT_WINDOW_SIZE"),
    full: readSize("FULL_WINDOW_SIZE"),
  };
};

const helper = (command, ...args) =>
  runSync(helperBinary, [command, String(debugChild.pid), ...args]);

const readProcessInfo = () => JSON.parse(helper("process-info"));
const readWindowInfo = () => JSON.parse(helper("window-info"));

const waitFor = async (readValue, predicate, label, timeoutMs = 10_000) => {
  const startedAt = Date.now();
  let latestValue;
  let latestError;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      latestValue = await readValue();
      latestError = null;

      if (predicate(latestValue)) {
        return latestValue;
      }
    } catch (error) {
      latestError = error;
    }

    await delay(150);
  }

  fail(
    `Timed out waiting for ${label}; latest=${JSON.stringify(latestValue)}` +
      `${latestError ? ` error=${latestError.message}` : ""}`,
  );
};

const isExpectedSize = (actual, expected) =>
  Math.abs(actual.width - expected.width) <= sizeTolerance &&
  Math.abs(actual.height - expected.height) <= sizeTolerance;

const waitForWindowSize = (expected, label) =>
  waitFor(readWindowInfo, (windowInfo) => isExpectedSize(windowInfo, expected), label);

const assertSize = (windowInfo, expected, label) => {
  if (!isExpectedSize(windowInfo, expected)) {
    fail(`${label}: expected ${expected.width} x ${expected.height}, got ${windowInfo.width} x ${windowInfo.height}`);
  }

  logStep(`${label}: ${windowInfo.width} x ${windowInfo.height}`);
};

const assertExistingJijiProcessesAbsent = () => {
  const output = runSync("ps", ["-axo", "pid=,ppid=,comm="]);
  const existing = output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /(?:^|\/)jiji-rululing$/.test(line));

  if (existing.length > 0) {
    fail(`Refusing to start while an existing jiji-rululing process is running:\n${existing.join("\n")}`);
  }

  logStep("no existing debug or release jiji-rululing process is running");
};

const isCurrentFrontend = async () => {
  try {
    const response = await fetch("http://127.0.0.1:5173/", { cache: "no-store" });

    if (!response.ok) {
      return false;
    }

    const html = await response.text();
    return html.includes("<title>急急如律令</title>") && html.includes("/src/main.tsx");
  } catch {
    return false;
  }
};

const ensureFrontend = async () => {
  if (await isCurrentFrontend()) {
    logStep("reusing the current project frontend at http://127.0.0.1:5173/");
    return;
  }

  frontendLogHandle = await open(viteLogPath, "w");
  frontendChild = spawn(
    "npm",
    ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5173", "--strictPort"],
    {
      cwd: projectRoot,
      stdio: ["ignore", frontendLogHandle.fd, frontendLogHandle.fd],
    },
  );

  await waitFor(isCurrentFrontend, Boolean, "the current project Vite frontend", 15_000);
  logStep("started the current project frontend at http://127.0.0.1:5173/");
};

const takeWindowScreenshot = (label, windowInfo) => {
  if (!keepScreenshots) {
    return;
  }

  const screenshotPath = path.join(auditDirectory, `${label}.png`);
  const result = spawnSync("/usr/sbin/screencapture", ["-x", "-l", String(windowInfo.windowId), screenshotPath], {
    cwd: projectRoot,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    console.warn(`WARN: could not capture app window screenshot ${label}: ${result.stderr || result.stdout}`);
    return;
  }

  metadata.screenshots.push(screenshotPath);
  console.log(`INFO: captured app-window-only screenshot ${screenshotPath}`);
};

const clickWindowLocal = async ({ x, y }) => {
  helper("click-window-local", String(x), String(y));
  await delay(250);
};

const compactWindow = async (sizes, label) => {
  helper("close-main-window");
  await delay(250);
  await clickWindowLocal(localCoordinates.fullCloseModalKeepCompact);
  const compactWindowInfo = await waitForWindowSize(sizes.compact, `${label} compact window size`);
  assertSize(compactWindowInfo, sizes.compact, `${label} compact outer size`);
  return compactWindowInfo;
};

const expandWindow = async (sizes, label) => {
  await clickWindowLocal(localCoordinates.compactCenser);
  const fullWindowInfo = await waitForWindowSize(sizes.full, `${label} expanded window size`);
  assertSize(fullWindowInfo, sizes.full, `${label} expanded outer size`);
  return fullWindowInfo;
};

const writeIsolatedDesktopFixture = async () => {
  const now = new Date().toISOString();

  await mkdir(path.dirname(tempPersistencePath), { recursive: true });
  await writeFile(
    tempPersistencePath,
    `${JSON.stringify(
      {
        createdAt: now,
        currentSession: {
          activeModal: null,
          activeTimerSegment: null,
          intentSets: [
            {
              currentIncenseIndex: 1,
              id: "native-window-roundtrip",
              incenseCount: 1,
              preventionIntents: [],
              situationIntent: "当我打开内部窗口冒烟时，就验证小窗往返。",
              status: "idle",
            },
          ],
          phase: "ritual",
          timerMode: "dev",
          timerRemaining: 0,
          updatedAt: now,
          version: 1,
        },
        history: [],
        migrationSource: "desktop-json",
        settings: {
          isAlwaysOnTop: false,
          isDockVisible: true,
          isSoundReminderEnabled: false,
          timerMode: "dev",
        },
        updatedAt: now,
        version: 1,
      },
      null,
      2,
    )}\n`,
  );
};

const stopChild = async (child, label) => {
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  child.kill("SIGTERM");

  const didExit = await Promise.race([
    new Promise((resolve) => child.once("exit", () => resolve(true))),
    delay(3_000).then(() => false),
  ]);

  if (!didExit) {
    console.warn(`WARN: ${label} did not stop after SIGTERM; terminating the exact child PID ${child.pid}`);
    child.kill("SIGKILL");
  }
};

await mkdir(auditDirectory, { recursive: true });
const actualBefore = await snapshotFile(actualPersistencePath);
metadata.actualPersistenceBefore = actualBefore;

if (actualBefore.exists) {
  await copyFile(actualPersistencePath, path.join(auditDirectory, "persistence.v1.before.json"));
  logStep(`copied actual desktop JSON before launch: ${actualBefore.sha256}`);
} else {
  logStep("recorded that the actual desktop JSON does not exist before launch");
}

try {
  if (process.platform !== "darwin") {
    fail("This native Tauri roundtrip smoke script only supports macOS");
  }

  assertExistingJijiProcessesAbsent();

  if (shouldBuild) {
    await run("cargo", ["build", "--manifest-path", "src-tauri/Cargo.toml"]);
    logStep("built the exact Tauri debug binary with cargo build");
  } else {
    logStep("skipped cargo build by explicit --skip-build request");
  }

  if (!(await fileExists(debugBinary))) {
    fail(`Missing debug binary: ${debugBinary}`);
  }

  await run("xcrun", ["swiftc", helperSource, "-o", helperBinary]);
  logStep("compiled the lightweight macOS window helper");

  await ensureFrontend();
  await writeIsolatedDesktopFixture();
  logStep(`wrote a minimal isolated session fixture under temp HOME: ${tempPersistencePath}`);

  debugLogHandle = await open(debugLogPath, "w");
  debugChild = spawn(debugBinary, [], {
    cwd: projectRoot,
    env: {
      ...process.env,
      HOME: tempHome,
    },
    stdio: ["ignore", debugLogHandle.fd, debugLogHandle.fd],
  });

  const sizes = await readConstants();
  await waitFor(readWindowInfo, Boolean, "the debug Tauri window", 15_000);
  const initialWindowInfo = await waitForWindowSize(sizes.full, "initial full window size");
  const processInfo = readProcessInfo();
  const [actualDebugBinary, launchedExecutable] = await Promise.all([
    realpath(debugBinary),
    realpath(processInfo.executablePath),
  ]);

  metadata.debugPid = debugChild.pid;
  metadata.launchedProcess = processInfo;
  logStep(`launched debug PID ${debugChild.pid} from ${launchedExecutable}`);

  if (launchedExecutable !== actualDebugBinary) {
    fail(`Expected debug executable ${actualDebugBinary}, got ${launchedExecutable}`);
  }

  await waitFor(() => fileExists(tempPersistencePath), Boolean, "isolated temp-HOME persistence file");
  metadata.tempPersistencePath = tempPersistencePath;
  logStep(`confirmed isolated temp-HOME data directory: ${tempPersistencePath}`);

  const actualAfterIsolation = await snapshotFile(actualPersistencePath);
  assertFileSnapshotUnchanged(actualBefore, actualAfterIsolation, "actual desktop JSON during isolated launch");
  logStep("actual desktop JSON remained byte-for-byte unchanged after isolated debug launch");

  assertSize(initialWindowInfo, sizes.full, "initial full outer size");
  takeWindowScreenshot("01-initial-full", initialWindowInfo);

  const persistenceBeforeRestore = await snapshotFile(tempPersistencePath);
  await delay(1_000);
  await clickWindowLocal(localCoordinates.fullRestoreModalPrimary);
  await waitFor(
    () => snapshotFile(tempPersistencePath),
    (snapshot) => snapshot.sha256 !== persistenceBeforeRestore.sha256,
    "the restored session to be persisted by the debug WebView",
  );
  // The Tauri close-request listener is registered through an async frontend import.
  // Leave enough time after hydration/restoration before exercising the native close button.
  await delay(2_000);
  await waitForWindowSize(sizes.full, "full ritual window before compact");
  logStep("restored one isolated ritual session in the debug WebView");
  takeWindowScreenshot("02-restored-full-ritual", readWindowInfo());

  const firstCompact = await compactWindow(sizes, "roundtrip 1");
  takeWindowScreenshot("03-roundtrip-1-compact", firstCompact);

  helper(
    "drag-window-local",
    String(Math.round(firstCompact.width / 2)),
    "20",
    "80",
    "60",
  );
  await delay(500);
  const draggedCompact = readWindowInfo();
  assertSize(draggedCompact, sizes.compact, "compact drag outer size");

  const dragDistance = Math.hypot(draggedCompact.x - firstCompact.x, draggedCompact.y - firstCompact.y);

  if (dragDistance < 40) {
    fail(`compact drag did not move far enough: before=${JSON.stringify(firstCompact)} after=${JSON.stringify(draggedCompact)}`);
  }

  logStep(
    `compact drag moved the window without expansion: (${firstCompact.x}, ${firstCompact.y}) -> (${draggedCompact.x}, ${draggedCompact.y})`,
  );
  takeWindowScreenshot("04-roundtrip-1-compact-dragged", draggedCompact);

  helper(
    "drag-window-local",
    String(localCoordinates.compactCenser.x),
    String(localCoordinates.compactCenser.y),
    "-70",
    "50",
  );
  await delay(500);
  const censerDraggedCompact = readWindowInfo();
  assertSize(censerDraggedCompact, sizes.compact, "compact censer-body drag outer size");

  const censerDragDistance = Math.hypot(
    censerDraggedCompact.x - draggedCompact.x,
    censerDraggedCompact.y - draggedCompact.y,
  );

  if (censerDragDistance < 40) {
    fail(
      `compact censer-body drag did not move far enough: before=${JSON.stringify(draggedCompact)} after=${JSON.stringify(censerDraggedCompact)}`,
    );
  }

  logStep(
    `compact censer-body drag moved the window without expansion: (${draggedCompact.x}, ${draggedCompact.y}) -> (${censerDraggedCompact.x}, ${censerDraggedCompact.y})`,
  );
  takeWindowScreenshot("05-roundtrip-1-compact-censer-dragged", censerDraggedCompact);

  const firstExpanded = await expandWindow(sizes, "roundtrip 1");
  takeWindowScreenshot("06-roundtrip-1-expanded", firstExpanded);

  const secondCompact = await compactWindow(sizes, "roundtrip 2");
  const compactPositionRetentionDistance = Math.hypot(
    secondCompact.x - censerDraggedCompact.x,
    secondCompact.y - censerDraggedCompact.y,
  );

  if (compactPositionRetentionDistance > positionTolerance) {
    fail(
      `second compact window did not return to the last dragged compact position: dragged=${JSON.stringify(
        censerDraggedCompact,
      )} second=${JSON.stringify(secondCompact)}`,
    );
  }

  logStep(
    `roundtrip 2 compact returned to the last dragged compact position: (${secondCompact.x}, ${secondCompact.y})`,
  );
  takeWindowScreenshot("07-roundtrip-2-compact", secondCompact);
  const secondExpanded = await expandWindow(sizes, "roundtrip 2");
  takeWindowScreenshot("08-roundtrip-2-expanded", secondExpanded);

  if (
    firstExpanded.width !== secondExpanded.width ||
    firstExpanded.height !== secondExpanded.height
  ) {
    fail(
      `expanded outer size accumulated between roundtrips: first=${JSON.stringify(firstExpanded)} second=${JSON.stringify(secondExpanded)}`,
    );
  }

  logStep("two compact-to-full roundtrips restored an identical full outer size");
} catch (error) {
  failure = error;
} finally {
  await stopChild(debugChild, "debug Tauri app");

  if (await fileExists(tempPersistencePath)) {
    await copyFile(tempPersistencePath, path.join(auditDirectory, "isolated-persistence.v1.json"));
  }

  await stopChild(frontendChild, "Vite frontend");
  await debugLogHandle?.close();
  await frontendLogHandle?.close();
  await rm(tempHome, { force: true, recursive: true });
  metadata.tempHomeRemoved = !(await fileExists(tempHome));
  metadata.actualPersistenceAfter = await snapshotFile(actualPersistencePath);
  metadata.finishedAt = new Date().toISOString();

  try {
    assertFileSnapshotUnchanged(
      metadata.actualPersistenceBefore,
      metadata.actualPersistenceAfter,
      "actual desktop JSON after native smoke",
    );
    logStep("actual desktop JSON remained byte-for-byte unchanged after cleanup");
  } catch (actualPersistenceError) {
    failure = actualPersistenceError;
  }

  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
}

if (failure) {
  console.error(`\nTauri window roundtrip smoke failed: ${failure.message}`);
  console.error(`Audit artifacts: ${auditDirectory}`);
  process.exit(1);
}

console.log("\nTauri window roundtrip smoke passed.");
console.log(`Audit artifacts: ${auditDirectory}`);
