import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

const passes = [];
const failures = [];

const assert = (condition, message) => {
  if (condition) {
    passes.push(message);
    return;
  }

  failures.push(message);
};

const resolveProjectPath = (relativePath) => path.join(projectRoot, relativePath);

const readText = (relativePath) => readFile(resolveProjectPath(relativePath), "utf8");

const readJson = async (relativePath) => JSON.parse(await readText(relativePath));

const assertFileExists = async (relativePath) => {
  try {
    await access(resolveProjectPath(relativePath));
    assert(true, `${relativePath} exists`);
  } catch {
    assert(false, `${relativePath} exists`);
  }
};

const assertIncludes = (source, token, label) => {
  assert(source.includes(token), label);
};

const assertPackageScript = (packageJson, scriptName, expectedCommand) => {
  assert(
    packageJson.scripts?.[scriptName] === expectedCommand,
    `package.json script ${scriptName} is "${expectedCommand}"`,
  );
};

const packageJson = await readJson("package.json");
const appTsx = await readText("src/App.tsx");
const appMetadata = await readText("src/lib/appMetadata.ts");
const compactWindowCheck = await readText("scripts/check-compact-window.mjs");
const desktopPersistenceAdapter = await readText("src/lib/desktopPersistenceAdapter.ts");
const fullBackup = await readText("src/lib/fullBackup.ts");
const desktopRegression = await readText("docs/DESKTOP_BEHAVIOR_REGRESSION.md");
const interactionModel = await readText("docs/INTERACTION_MODEL.md");
const macosInternalBuild = await readText("docs/MACOS_INTERNAL_BUILD.md");
const macosSelfUseInstall = await readText("docs/MACOS_SELF_USE_INSTALL.md");
const releaseLog = await readText("docs/SELF_USE_RELEASE_LOG.md");
const selfUseReadiness = await readText("docs/SELF_USE_READINESS.md");
const selfUseRegressionRunbook = await readText("docs/SELF_USE_REGRESSION_RUNBOOK.md");
const sessionGuards = await readText("src/lib/sessionGuards.ts");
const settingsPanel = await readText("src/components/SettingsPanel.tsx");
const tauriConfig = await readJson("src-tauri/tauri.conf.json");
const tauriWindow = await readText("src/lib/tauriWindow.ts");

assertPackageScript(packageJson, "test", "vitest run");
assertPackageScript(packageJson, "build", "tsc --noEmit && vite build");
assertPackageScript(packageJson, "check:desktop-config", "node scripts/check-desktop-config.mjs");
assertPackageScript(packageJson, "check:compact", "node scripts/check-compact-window.mjs");
assertPackageScript(packageJson, "check:self-use", "node scripts/check-self-use-readiness.mjs");
assertPackageScript(packageJson, "tauri:build", "tauri build");

for (const relativePath of [
  "docs/ACCEPTANCE_CHECKLIST.md",
  "docs/COMPACT_WINDOW_SPEC.md",
  "docs/DESKTOP_BEHAVIOR_REGRESSION.md",
  "docs/INTERACTION_MODEL.md",
  "docs/MACOS_INTERNAL_BUILD.md",
  "docs/MACOS_SELF_USE_INSTALL.md",
  "docs/SELF_USE_RELEASE_LOG.md",
  "docs/SELF_USE_READINESS.md",
  "docs/SELF_USE_REGRESSION_RUNBOOK.md",
  "docs/TAURI_CLOSE_RESTORE_NOTES.md",
  "docs/TAURI_DESKTOP_CHECKLIST.md",
  "scripts/check-compact-window.mjs",
  "scripts/check-desktop-config.mjs",
  "scripts/check-self-use-readiness.mjs",
  "src/lib/desktopPersistenceAdapter.ts",
  "src/lib/appMetadata.ts",
  "src/lib/fileTransferAdapter.ts",
  "src/lib/fullBackup.ts",
  "src/lib/notificationAdapter.ts",
  "src/lib/sessionGuards.ts",
  "src/lib/soundReminder.ts",
  "src/lib/tauriWindow.ts",
]) {
  await assertFileExists(relativePath);
}

[
  "业务状态",
  "窗口形态",
  "应用可见性",
  "退出与恢复",
  "点击小窗香炉",
  "只有用户在完整窗口点击“进入复盘”后，才进入 `review`",
].forEach((token) => assertIncludes(interactionModel, token, `interaction model preserves ${token}`));

[
  "启动与入口",
  "窗口行为组合",
  "关闭与恢复",
  "通知时点",
  "声音提醒",
  "历史导入导出",
  "完整备份",
  "高风险交叉场景",
].forEach((token) => assertIncludes(desktopRegression, token, `desktop regression covers ${token}`));

[
  "npm run test",
  "npm run build",
  "npm run check:desktop-config",
  "npm run check:self-use",
  "npm run check:compact",
  "npm run tauri:build",
  "SELF_USE_REGRESSION_RUNBOOK.md",
  "MACOS_SELF_USE_INSTALL.md",
  "SELF_USE_RELEASE_LOG.md",
  "persistence.v1.json",
  "完整备份",
  "版本信息",
].forEach((token) => assertIncludes(selfUseReadiness, token, `self-use readiness documents ${token}`));

[
  "安装方式",
  "什么时候需要重新构建",
  "数据位置",
  "备份数据",
  "恢复数据",
  "导出完整备份",
  "导入完整备份",
  "SELF_USE_RELEASE_LOG.md",
  "版本信息",
  "重置数据",
  "安装后冒烟检查",
  "不覆盖",
].forEach((token) => assertIncludes(macosSelfUseInstall, token, `macOS self-use install doc covers ${token}`));

[
  "准备",
  "主流程",
  "计时与完成",
  "小窗",
  "主祭台视觉",
  "复盘与历史",
  "桌面能力",
  "恢复与保护",
  "问题记录",
  "通过标准",
  "版本信息",
  "SELF_USE_RELEASE_LOG.md",
].forEach((token) =>
  assertIncludes(selfUseRegressionRunbook, token, `self-use regression runbook covers ${token}`),
);

[
  "自用版本发布记录",
  "Git 提交",
  "构建产物",
  "Bundle ID",
  "数据版本",
  "自动检查",
  "完整备份",
  "回滚方式",
].forEach((token) => assertIncludes(releaseLog, token, `self-use release log covers ${token}`));

[
  "canEnterReviewPhase",
  "areAllIntentSetsCompleted",
  "hasBlockingRitualAction",
].forEach((token) => assertIncludes(sessionGuards, token, `session guards include ${token}`));

[
  "listenForTauriCloseRequest",
  "savePersistedSession",
  "scheduleTimerNotification",
  "scheduleTimerSoundReminder",
  "cancelTimerNotification",
  "cancelTimerSoundReminder",
  "downloadTextFile",
  "selectAndReadTextFile",
  "createFullBackupPayload",
  "parseFullBackupPayload",
  "applyFullBackupPayload",
].forEach((token) => assertIncludes(appTsx, ` ${token}`, `App wires ${token}`));

[
  "expandCurrentTauriWindow",
  "compactCurrentTauriWindow",
  "setCurrentTauriWindowAlwaysOnTop",
  "setTauriDockVisibility",
].forEach((token) => assertIncludes(tauriWindow, token, `Tauri window adapter exposes ${token}`));

[
  "read_desktop_persistence_file",
  "write_desktop_persistence_file",
  "backup_corrupt_desktop_persistence_file",
].forEach((token) => assertIncludes(desktopPersistenceAdapter, token, `desktop persistence adapter invokes ${token}`));

[
  "createFullBackupPayload",
  "parseFullBackupPayload",
  "applyFullBackupPayload",
  "DESKTOP_PERSISTENCE_VERSION",
].forEach((token) => assertIncludes(fullBackup, token, `full backup module includes ${token}`));

[
  "APP_VERSION = packageJson.version",
  tauriConfig.identifier,
  "internal-self-use",
  "DESKTOP_PERSISTENCE_FILENAME",
  "DESKTOP_PERSISTENCE_VERSION",
].forEach((token) => assertIncludes(appMetadata, token, `app metadata includes ${token}`));

[
  "APP_METADATA",
  "版本信息",
  "应用版本",
  "构建类型",
  "Bundle ID",
  "数据版本",
].forEach((token) => assertIncludes(settingsPanel, token, `settings panel renders ${token}`));

[
  "assertCompactCenserStateDifferentiation",
  "assertCompactCompletionStaysOutOfReviewWhenFullOpenFails",
  "manual narrow viewport should not enter compact ritual mode",
  "compact censer click should not change business state",
].forEach((token) => assertIncludes(compactWindowCheck, token, `compact check guards ${token}`));

assertIncludes(macosInternalBuild, "急急如律令.app", "macOS internal build doc names the app bundle");
assertIncludes(macosInternalBuild, "不包含签名、公证、DMG", "macOS internal build doc keeps release scope explicit");
assertIncludes(macosInternalBuild, "MACOS_SELF_USE_INSTALL.md", "macOS internal build doc links self-use install doc");
assertIncludes(macosInternalBuild, "SELF_USE_RELEASE_LOG.md", "macOS internal build doc links self-use release log");
assertIncludes(macosSelfUseInstall, "com.damon.jijirululing", "macOS self-use install doc names app data directory");
assertIncludes(macosSelfUseInstall, "替换 `.app` 前先退出旧应用", "macOS self-use install doc guards app replacement");
assert(packageJson.version === tauriConfig.version, "package.json and Tauri app version match");

if (failures.length > 0) {
  console.error("Self-use readiness check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Self-use readiness check passed:");
for (const pass of passes) {
  console.log(`- ${pass}`);
}
