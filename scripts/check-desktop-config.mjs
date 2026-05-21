import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

const passes = [];
const failures = [];

function assert(condition, message) {
  if (condition) {
    passes.push(message);
    return;
  }

  failures.push(message);
}

function resolveProjectPath(relativePath) {
  return path.join(projectRoot, relativePath);
}

async function readText(relativePath) {
  return readFile(resolveProjectPath(relativePath), "utf8");
}

async function readJson(relativePath) {
  const text = await readText(relativePath);
  return JSON.parse(text);
}

async function assertFileExists(relativePath) {
  try {
    await access(resolveProjectPath(relativePath));
    assert(true, `${relativePath} exists`);
  } catch {
    assert(false, `${relativePath} exists`);
  }
}

function assertTextIncludes(text, needle, label) {
  assert(text.includes(needle), label);
}

function assertPackageScript(packageJson, scriptName, expectedCommand) {
  assert(
    packageJson.scripts?.[scriptName] === expectedCommand,
    `package.json script ${scriptName} is "${expectedCommand}"`,
  );
}

function assertPackageDependency(packageJson, dependencyName) {
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  assert(
    Boolean(dependencies[dependencyName]),
    `package.json includes ${dependencyName}`,
  );
}

function assertPermission(capability, permission) {
  assert(
    capability.permissions?.includes(permission),
    `Tauri capability allows ${permission}`,
  );
}

function readWindowSizeConstant(source, name) {
  const match = source.match(
    new RegExp(`export const ${name} = \\{ width: (\\d+), height: (\\d+) \\} as const;`),
  );

  if (!match) {
    assert(false, `src/constants.ts exports ${name}`);
    return null;
  }

  assert(true, `src/constants.ts exports ${name}`);
  return {
    height: Number(match[2]),
    width: Number(match[1]),
  };
}

const packageJson = await readJson("package.json");
const tauriConfig = await readJson("src-tauri/tauri.conf.json");
const capability = await readJson("src-tauri/capabilities/default.json");
const cargoToml = await readText("src-tauri/Cargo.toml");
const mainRust = await readText("src-tauri/src/main.rs");
const appTsx = await readText("src/App.tsx");
const constantsTs = await readText("src/constants.ts");
const desktopPersistenceSchema = await readText(
  "src/lib/desktopPersistenceSchema.ts",
);
const desktopPersistenceAdapter = await readText(
  "src/lib/desktopPersistenceAdapter.ts",
);
const fileTransferAdapter = await readText("src/lib/fileTransferAdapter.ts");
const notificationAdapter = await readText("src/lib/notificationAdapter.ts");
const tauriWindow = await readText("src/lib/tauriWindow.ts");

assertPackageScript(packageJson, "dev:tauri-frontend", "node scripts/start-tauri-frontend.mjs");
assertPackageScript(packageJson, "check:compact", "node scripts/check-compact-window.mjs");
assertPackageScript(packageJson, "check:desktop-config", "node scripts/check-desktop-config.mjs");
assertPackageScript(packageJson, "tauri:dev", "tauri dev");
assertPackageScript(packageJson, "tauri:build", "tauri build");

assertPackageDependency(packageJson, "@tauri-apps/api");
assertPackageDependency(packageJson, "@tauri-apps/cli");
assertPackageDependency(packageJson, "@tauri-apps/plugin-dialog");
assertPackageDependency(packageJson, "@tauri-apps/plugin-notification");

assert(
  tauriConfig.identifier === "com.damon.jijirululing",
  "Tauri identifier is com.damon.jijirululing",
);
assert(
  tauriConfig.build?.beforeDevCommand === "npm run dev:tauri-frontend",
  "Tauri beforeDevCommand uses the guarded frontend starter",
);
assert(
  tauriConfig.build?.devUrl === "http://127.0.0.1:5173",
  "Tauri devUrl is pinned to 127.0.0.1:5173",
);
assert(
  tauriConfig.bundle?.active === true,
  "Tauri bundle is active for internal app builds",
);
assert(
  Array.isArray(tauriConfig.bundle?.targets) &&
    tauriConfig.bundle.targets.length === 1 &&
    tauriConfig.bundle.targets[0] === "app",
  "Tauri bundle target is limited to macOS app",
);
assert(
  tauriConfig.bundle?.icon?.includes("icons/app-icon/placeholder-icon.png"),
  "Tauri bundle uses the placeholder app icon from app-icon",
);

const mainWindow = tauriConfig.app?.windows?.find(
  (windowConfig) => windowConfig.label === "main",
);
const compactWindowSize = readWindowSizeConstant(constantsTs, "COMPACT_WINDOW_SIZE");
const compactWindowMinSize = readWindowSizeConstant(constantsTs, "COMPACT_WINDOW_MIN_SIZE");
const fullWindowSize = readWindowSizeConstant(constantsTs, "FULL_WINDOW_SIZE");

assert(Boolean(mainWindow), "Tauri main window is configured");
assert(mainWindow?.title === "急急如律令", "Tauri main window title is 急急如律令");
assert(mainWindow?.width === compactWindowSize?.width, "Tauri main window width matches COMPACT_WINDOW_SIZE");
assert(mainWindow?.height === compactWindowSize?.height, "Tauri main window height matches COMPACT_WINDOW_SIZE");
assert(mainWindow?.minWidth === compactWindowMinSize?.width, "Tauri main window minWidth matches COMPACT_WINDOW_MIN_SIZE");
assert(mainWindow?.minHeight === compactWindowMinSize?.height, "Tauri main window minHeight matches COMPACT_WINDOW_MIN_SIZE");
assertTextIncludes(
  tauriWindow,
  `FULL_WINDOW_SIZE`,
  "Tauri window adapter uses FULL_WINDOW_SIZE",
);
assertTextIncludes(
  tauriWindow,
  `COMPACT_WINDOW_SIZE`,
  "Tauri window adapter uses COMPACT_WINDOW_SIZE",
);
assert(
  fullWindowSize?.width === 960 && fullWindowSize.height === 760,
  "FULL_WINDOW_SIZE is 960 x 760",
);

assert(
  capability.windows?.includes("main"),
  "Tauri default capability targets the main window",
);
[
  "core:default",
  "core:app:allow-set-dock-visibility",
  "core:window:allow-center",
  "core:window:allow-destroy",
  "core:window:allow-hide",
  "core:window:allow-set-always-on-top",
  "core:window:allow-set-focus",
  "core:window:allow-set-size",
  "core:window:allow-show",
  "dialog:default",
  "notification:default",
].forEach((permission) => assertPermission(capability, permission));

assertTextIncludes(cargoToml, 'features = ["tray-icon"]', "Cargo enables Tauri tray-icon feature");
assertTextIncludes(cargoToml, "tauri-plugin-dialog", "Cargo includes tauri-plugin-dialog");
assertTextIncludes(
  cargoToml,
  "tauri-plugin-notification",
  "Cargo includes tauri-plugin-notification",
);

assertTextIncludes(
  mainRust,
  'const DESKTOP_PERSISTENCE_FILENAME: &str = "persistence.v1.json";',
  "Rust desktop persistence filename is persistence.v1.json",
);
assertTextIncludes(
  mainRust,
  ".plugin(tauri_plugin_dialog::init())",
  "Rust registers the dialog plugin",
);
assertTextIncludes(
  mainRust,
  ".plugin(tauri_plugin_notification::init())",
  "Rust registers the notification plugin",
);
assertTextIncludes(
  mainRust,
  'TrayIconBuilder::with_id("main")',
  "Rust registers the main tray icon",
);
assertTextIncludes(mainRust, '.title("令")', "Rust tray icon uses the temporary 令 title");
[
  "backup_corrupt_desktop_persistence_file",
  "read_desktop_persistence_file",
  "read_user_text_file",
  "write_desktop_persistence_file",
  "write_user_text_file",
].forEach((commandName) =>
  assertTextIncludes(mainRust, commandName, `Rust exposes ${commandName}`),
);

assertTextIncludes(
  desktopPersistenceSchema,
  'DESKTOP_PERSISTENCE_FILENAME = "persistence.v1.json"',
  "TypeScript desktop persistence filename is persistence.v1.json",
);
[
  "read_desktop_persistence_file",
  "write_desktop_persistence_file",
  "backup_corrupt_desktop_persistence_file",
].forEach((commandName) =>
  assertTextIncludes(
    desktopPersistenceAdapter,
    commandName,
    `Desktop persistence adapter invokes ${commandName}`,
  ),
);

assertTextIncludes(
  fileTransferAdapter,
  "@tauri-apps/plugin-dialog",
  "File transfer adapter uses the Tauri dialog plugin",
);
assertTextIncludes(
  fileTransferAdapter,
  "read_user_text_file",
  "File transfer adapter invokes read_user_text_file",
);
assertTextIncludes(
  fileTransferAdapter,
  "write_user_text_file",
  "File transfer adapter invokes write_user_text_file",
);
assertTextIncludes(
  notificationAdapter,
  "@tauri-apps/plugin-notification",
  "Notification adapter uses the Tauri notification plugin",
);
assertTextIncludes(
  tauriWindow,
  "setCurrentTauriWindowAlwaysOnTop",
  "Tauri window adapter exposes always-on-top control",
);
assertTextIncludes(
  tauriWindow,
  "setTauriDockVisibility",
  "Tauri window adapter exposes Dock visibility control",
);
assertTextIncludes(
  tauriWindow,
  "expandCurrentTauriWindow",
  "Tauri window adapter exposes full-window expansion control",
);
assertTextIncludes(
  appTsx,
  "consumeDesktopPersistenceInitializationResult",
  "App consumes desktop persistence initialization status",
);
assertTextIncludes(
  appTsx,
  "DESKTOP_PERSISTENCE_WRITE_ERROR_EVENT",
  "App surfaces desktop persistence write errors",
);
assertTextIncludes(
  appTsx,
  "setCurrentTauriWindowAlwaysOnTop",
  "App applies always-on-top setting",
);
assertTextIncludes(
  appTsx,
  "setTauriDockVisibility",
  "App applies Dock visibility setting",
);

await Promise.all(
  [
    "docs/TAURI_DESKTOP_CHECKLIST.md",
    "docs/MACOS_INTERNAL_BUILD.md",
    "docs/DESKTOP_PERSISTENCE_JSON_SPEC.md",
    "docs/DESKTOP_BEHAVIOR_REGRESSION.md",
    "src/lib/desktopPersistenceAdapter.ts",
    "src/lib/desktopPersistenceSchema.ts",
    "src/lib/fileTransferAdapter.ts",
    "src/lib/notificationAdapter.ts",
    "src/lib/tauriWindow.ts",
    "src/lib/visualAssetManifest.ts",
    "src/lib/visualAssetManifest.test.ts",
    "src-tauri/src/main.rs",
    "src-tauri/icons/README.md",
    "src-tauri/icons/app-icon/README.md",
    "src-tauri/icons/app-icon/placeholder-icon.png",
    "src-tauri/icons/menubar-icon/README.md",
    "src-tauri/icons/notification-icon/README.md",
    "src/assets/visuals/README.md",
    "src/assets/visuals/talisman/situation/README.md",
    "src/assets/visuals/talisman/prevention/README.md",
    "src/assets/visuals/censer/stage/README.md",
    "src/assets/visuals/censer/compact/README.md",
    "src/assets/visuals/incense/stage/README.md",
    "src/assets/visuals/incense/compact/README.md",
  ].map(assertFileExists),
);

if (failures.length > 0) {
  console.error("Desktop config check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Desktop config check passed:");
for (const pass of passes) {
  console.log(`- ${pass}`);
}
