import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  open,
  readdir,
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
const shouldBuild = !process.argv.includes("--skip-build");
const keepScreenshots = !process.argv.includes("--no-screenshots");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const auditDirectory = path.join(projectRoot, "artifacts/tauri-persistence-recovery", timestamp);
const tempHome = await mkdtemp(path.join(os.tmpdir(), "jiji-rululing-tauri-persistence-recovery-"));
const tempPersistenceDirectory = path.join(
  tempHome,
  "Library/Application Support",
  appIdentifier,
);
const tempPersistencePath = path.join(tempPersistenceDirectory, "persistence.v1.json");
const helperBinary = path.join(auditDirectory, "tauri-window-roundtrip-helper");
const debugLogPath = path.join(auditDirectory, "debug-app.log");
const viteLogPath = path.join(auditDirectory, "vite.log");
const metadataPath = path.join(auditDirectory, "audit.json");
const corruptFixture = "{this is intentionally corrupt JSON\n";
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

const helper = (command) => runSync(helperBinary, [command, String(debugChild.pid)]);

const readProcessInfo = () => JSON.parse(helper("process-info"));
const readWindowInfo = () => JSON.parse(helper("window-info"));

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

const findCorruptBackupPath = async () => {
  if (!(await fileExists(tempPersistenceDirectory))) {
    return null;
  }

  const entries = await readdir(tempPersistenceDirectory);
  const backupName = entries.find((entry) => /^persistence\.v1\.corrupt-\d+\.json$/.test(entry));
  return backupName ? path.join(tempPersistenceDirectory, backupName) : null;
};

const readRecoveredManifest = async () => {
  if (!(await fileExists(tempPersistencePath))) {
    return null;
  }

  try {
    return JSON.parse(await readFile(tempPersistencePath, "utf8"));
  } catch {
    return null;
  }
};

const isValidRecoveredManifest = (manifest) =>
  manifest?.version === 1 &&
  typeof manifest.createdAt === "string" &&
  typeof manifest.updatedAt === "string" &&
  (manifest.currentSession === null || typeof manifest.currentSession === "object") &&
  Array.isArray(manifest.history) &&
  (manifest.migrationSource === "empty" || manifest.migrationSource === "localStorage") &&
  typeof manifest.settings === "object" &&
  typeof manifest.settings.isAlwaysOnTop === "boolean" &&
  typeof manifest.settings.isDockVisible === "boolean" &&
  typeof manifest.settings.isSoundReminderEnabled === "boolean" &&
  (manifest.settings.timerMode === "dev" || manifest.settings.timerMode === "prod");

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
    fail("This native Tauri persistence recovery smoke script only supports macOS");
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
  await mkdir(tempPersistenceDirectory, { recursive: true });
  await writeFile(tempPersistencePath, corruptFixture);
  logStep(`wrote an intentionally corrupt desktop JSON fixture under temp HOME: ${tempPersistencePath}`);

  debugLogHandle = await open(debugLogPath, "w");
  debugChild = spawn(debugBinary, [], {
    cwd: projectRoot,
    env: {
      ...process.env,
      HOME: tempHome,
    },
    stdio: ["ignore", debugLogHandle.fd, debugLogHandle.fd],
  });

  await waitFor(readWindowInfo, Boolean, "the debug Tauri window", 15_000);
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

  if (processInfo.bundleIdentifier && processInfo.bundleIdentifier !== appIdentifier) {
    fail(`Expected bundle identifier ${appIdentifier}, got ${processInfo.bundleIdentifier}`);
  }

  logStep(
    processInfo.bundleIdentifier
      ? `confirmed launched bundle identifier ${processInfo.bundleIdentifier}`
      : "standalone debug binary exposes no bundle identifier; exact executable path is verified",
  );

  const corruptBackupPath = await waitFor(findCorruptBackupPath, Boolean, "the isolated corrupt JSON backup");
  metadata.corruptBackupPath = corruptBackupPath;
  logStep(`renamed the isolated corrupt JSON fixture to ${corruptBackupPath}`);

  const backupContents = await readFile(corruptBackupPath, "utf8");
  if (backupContents !== corruptFixture) {
    fail("Isolated corrupt JSON backup does not preserve the original fixture bytes");
  }
  logStep("isolated corrupt JSON backup preserves the original fixture bytes");

  const recoveredManifest = await waitFor(
    readRecoveredManifest,
    isValidRecoveredManifest,
    "the isolated recovered desktop JSON",
  );
  metadata.recoveredManifestSummary = {
    hasCurrentSession: recoveredManifest.currentSession !== null,
    historyCount: recoveredManifest.history.length,
    migrationSource: recoveredManifest.migrationSource,
    snapshot: await snapshotFile(tempPersistencePath),
    version: recoveredManifest.version,
  };
  logStep(`rewrote a safe isolated desktop JSON under temp HOME: ${tempPersistencePath}`);
  logStep(
    `isolated recovery source is ${recoveredManifest.migrationSource}; recovered ${recoveredManifest.history.length} Web history records`,
  );

  const actualAfterIsolation = await snapshotFile(actualPersistencePath);
  assertFileSnapshotUnchanged(actualBefore, actualAfterIsolation, "actual desktop JSON during isolated launch");
  logStep("actual desktop JSON remained byte-for-byte unchanged after isolated recovery");

  await delay(800);
  takeWindowScreenshot("01-recovered-startup-toast", readWindowInfo());
} catch (error) {
  failure = error;
} finally {
  await stopChild(debugChild, "debug Tauri app");

  const corruptBackupPath = await findCorruptBackupPath();
  if (corruptBackupPath) {
    await copyFile(corruptBackupPath, path.join(auditDirectory, path.basename(corruptBackupPath)));
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
      "actual desktop JSON after native recovery smoke",
    );
    logStep("actual desktop JSON remained byte-for-byte unchanged after cleanup");
  } catch (actualPersistenceError) {
    failure = actualPersistenceError;
  }

  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
}

if (failure) {
  console.error(`\nTauri persistence recovery smoke failed: ${failure.message}`);
  console.error(`Audit artifacts: ${auditDirectory}`);
  process.exit(1);
}

console.log("\nTauri persistence recovery smoke passed.");
console.log(`Audit artifacts: ${auditDirectory}`);
