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
const soundReminder = await readText("src/lib/soundReminder.ts");
const compactWindowCheck = await readText("scripts/check-compact-window.mjs");
const stylesCss = await readText("src/styles.css");
const tauriWindow = await readText("src/lib/tauriWindow.ts");
const visualAssetManifest = await readText("src/lib/visualAssetManifest.ts");
const visualAssets = await readText("src/lib/visualAssets.ts");
const visualState = await readText("src/lib/visualState.ts");
const censerVisual = await readText("src/components/CenserVisual.tsx");
const compactCenserSlot = await readText("src/components/CompactCenserSlot.tsx");
const incenseVisual = await readText("src/components/IncenseVisual.tsx");
const intentSlot = await readText("src/components/IntentSlot.tsx");
const ritualStage = await readText("src/components/RitualStage.tsx");
const talismanVisual = await readText("src/components/TalismanVisual.tsx");

assertPackageScript(packageJson, "dev:tauri-frontend", "node scripts/start-tauri-frontend.mjs");
assertPackageScript(packageJson, "check:compact", "node scripts/check-compact-window.mjs");
assertPackageScript(packageJson, "check:desktop-config", "node scripts/check-desktop-config.mjs");
assertPackageScript(packageJson, "check:self-use", "node scripts/check-self-use-readiness.mjs");
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
assert(
  tauriConfig.app?.macOSPrivateApi === true,
  "Tauri enables macOSPrivateApi for transparent compact shell",
);

const mainWindow = tauriConfig.app?.windows?.find(
  (windowConfig) => windowConfig.label === "main",
);
const compactWindowSize = readWindowSizeConstant(constantsTs, "COMPACT_WINDOW_SIZE");
const compactWindowMinSize = readWindowSizeConstant(constantsTs, "COMPACT_WINDOW_MIN_SIZE");
const fullWindowSize = readWindowSizeConstant(constantsTs, "FULL_WINDOW_SIZE");

assertTextIncludes(
  constantsTs,
  "START_TALISMAN_BURN_MS = 2000",
  "src/constants.ts exports the 2 second situation talisman burn duration",
);
assert(Boolean(mainWindow), "Tauri main window is configured");
assert(mainWindow?.title === "急急如律令", "Tauri main window title is 急急如律令");
assert(mainWindow?.width === fullWindowSize?.width, "Tauri main window width matches FULL_WINDOW_SIZE");
assert(mainWindow?.height === fullWindowSize?.height, "Tauri main window height matches FULL_WINDOW_SIZE");
assert(mainWindow?.minWidth === compactWindowMinSize?.width, "Tauri main window minWidth matches COMPACT_WINDOW_MIN_SIZE");
assert(mainWindow?.minHeight === compactWindowMinSize?.height, "Tauri main window minHeight matches COMPACT_WINDOW_MIN_SIZE");
assert(mainWindow?.transparent === true, "Tauri main window allows transparent compact shell");
assert(mainWindow?.backgroundColor === "#00000000", "Tauri main window starts with transparent background");
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
assertTextIncludes(
  tauriWindow,
  `setDecorations(shell.hasDecorations)`,
  "Tauri window adapter toggles native window decorations",
);
assertTextIncludes(
  tauriWindow,
  `setBackgroundColor(shell.backgroundColor)`,
  "Tauri window adapter toggles native window background color",
);
assertTextIncludes(
  tauriWindow,
  `setShadow(shell.hasShadow)`,
  "Tauri window adapter toggles native window shadow",
);
assertTextIncludes(
  tauriWindow,
  `setTitleBarStyle(shell.titleBarStyle)`,
  "Tauri window adapter toggles native title bar style",
);
assertTextIncludes(
  tauriWindow,
  `document.documentElement.dataset.windowMode = mode`,
  "Tauri window adapter marks the current document window mode",
);
assertTextIncludes(
  tauriWindow,
  `runCompatibleWindowAction`,
  "Tauri window adapter keeps size changes working when optional shell APIs fail",
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
  "core:window:allow-set-background-color",
  "core:window:allow-set-decorations",
  "core:window:allow-set-focus",
  "core:window:allow-set-shadow",
  "core:window:allow-set-size",
  "core:window:allow-set-title-bar-style",
  "core:window:allow-show",
  "dialog:default",
  "notification:default",
].forEach((permission) => assertPermission(capability, permission));

assertTextIncludes(cargoToml, '"macos-private-api"', "Cargo enables Tauri macos-private-api feature");
assertTextIncludes(cargoToml, '"tray-icon"', "Cargo enables Tauri tray-icon feature");
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
  soundReminder,
  "loadAppSettings().isSoundReminderEnabled",
  "Sound reminder respects the saved setting",
);
assertTextIncludes(
  soundReminder,
  "createOscillator",
  "Sound reminder uses generated Web Audio bell",
);
assertTextIncludes(
  appTsx,
  "scheduleTimerSoundReminder",
  "App schedules timer sound reminders",
);
assertTextIncludes(
  appTsx,
  "cancelTimerSoundReminder",
  "App cancels stale timer sound reminders",
);
assertTextIncludes(
  appTsx,
  "startingIntentId",
  "App separates transient start animation state from intent business status",
);
assertTextIncludes(
  appTsx,
  "START_TALISMAN_BURN_MS",
  "App delays the first focus timer until the start talisman animation completes",
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
  tauriWindow,
  "compactCurrentTauriWindow",
  "Tauri window adapter exposes compact-window control",
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
[
  "altarBackgroundUrl",
  "compactCenserAshUrl",
  "compactCenserBodyUrl",
  "compactCenserFeetUrl",
  "compactCenserLidUrl",
  "compactCenserMouthUrl",
  "stageCenserAshUrl",
  "stageCenserBodyUrl",
  "stageCenserFeetUrl",
  "stageCenserLidUrl",
  "stageCenserMouthUrl",
  "stageIncenseAshUrl",
  "stageIncenseEmberUrl",
  "stageIncenseSmokeUrl",
  "stageIncenseStickUrl",
  "preventionTalismanTemplateUrl",
  "situationTalismanTemplateUrl",
  '"altar/background"',
  '"censer/compact/ash"',
  '"censer/compact/body"',
  '"censer/compact/feet"',
  '"censer/compact/lid"',
  '"censer/compact/mouth"',
  '"censer/stage/ash"',
  '"censer/stage/body"',
  '"censer/stage/feet"',
  '"censer/stage/lid"',
  '"censer/stage/mouth"',
  '"incense/stage/ash"',
  '"incense/stage/ember"',
  '"incense/stage/smoke"',
  '"incense/stage/stick"',
  '"talisman/prevention/template"',
  '"talisman/situation/template"',
].forEach((manifestToken) =>
  assertTextIncludes(
    visualAssetManifest,
    manifestToken,
    `Visual asset manifest includes ${manifestToken}`,
  ),
);
[
  "ALTAR_ASSET_REQUIREMENTS",
  "ALTAR_ASSET_LAYERS",
  "STAGE_CENSER_ASSET_REQUIREMENTS",
  "TALISMAN_ASSET_REQUIREMENTS",
  "TALISMAN_ASSET_LAYERS",
  "TALISMAN_TEMPLATE_ASSET_LAYERS",
  "CENSER_ASSET_LAYERS",
  "INCENSE_ASSET_LAYERS",
  "altar",
  "censerStage",
  "incenseStage",
  "talismanSituation",
  "talismanPrevention",
  "getAltarVisualSlot",
  "getCenserVisualSlot",
  "getIncenseVisualSlot",
  "getTalismanVisualSlot",
].forEach((visualAssetToken) =>
  assertTextIncludes(
    visualAssets,
    visualAssetToken,
    `Visual asset contracts include ${visualAssetToken}`,
  ),
);
assertTextIncludes(censerVisual, "CENSER_ASSET_LAYERS.map", "CenserVisual uses central censer layer order");
assertTextIncludes(censerVisual, "censer-visual__hover-target", "CenserVisual exposes a censer-only metadata hover target");
assertTextIncludes(censerVisual, 'data-censer-interaction-role={size === "stage" ? "metadata-only" : "presentational"}', "CenserVisual keeps full-stage censers metadata-only");
assertTextIncludes(censerVisual, 'data-censer-hover-action="show-metadata"', "CenserVisual limits stage hover action to metadata display");
assertTextIncludes(censerVisual, "getCenserLidState", "CenserVisual derives lid state from central visual state");
assertTextIncludes(censerVisual, "data-censer-lid-state", "CenserVisual exposes explicit lid state for open and closed censer visuals");
assertTextIncludes(visualState, "getStageIntentVisualSemantics", "Visual state centralizes full-stage intent semantics");
assertTextIncludes(visualState, "isStageTimerIntentStatus", "Visual state narrows statuses that can render full-stage timer panels");
assertTextIncludes(visualState, "metadataVisibility: \"censer-hover\"", "Full-stage metadata is explicitly triggered by censer hover only");
assertTextIncludes(visualState, "situationTalismanVisibility", "Visual state controls situation talisman visibility");
assertTextIncludes(visualState, "preventionTalismanVisibility", "Visual state controls prevention talisman visibility");
assertTextIncludes(visualState, "censerEmphasis", "Visual state controls completed censer emphasis");
assertTextIncludes(visualState, "shouldRenderTimerPanel", "Full-stage timer panel visibility is derived from visual state");
assertTextIncludes(incenseVisual, "INCENSE_ASSET_LAYERS.map", "IncenseVisual uses central incense layer order");
assertTextIncludes(incenseVisual, 'data-incense-click-action="none"', "IncenseVisual is explicitly non-clickable");
assertTextIncludes(talismanVisual, "TALISMAN_TEMPLATE_ASSET_LAYERS.map", "TalismanVisual uses central talisman image layer order");
assertTextIncludes(talismanVisual, "splitIntentText", "TalismanVisual splits intent text into side columns");
assertTextIncludes(talismanVisual, "talisman-visual__column--right", "TalismanVisual renders right text column");
assertTextIncludes(talismanVisual, "talisman-visual__column--left", "TalismanVisual renders left text column");
assertTextIncludes(talismanVisual, 'data-talisman-click-action={clickAction}', "TalismanVisual exposes explicit click action semantics");
assertTextIncludes(talismanVisual, 'data-talisman-interaction-role={interactionRole}', "TalismanVisual distinguishes start entry and view-only talismans");
assertTextIncludes(ritualStage, "getAltarAssetUrl", "RitualStage uses the altar background asset manifest");
assertTextIncludes(ritualStage, "altar-scene__slots", "RitualStage renders shared altar scene slots");
assertTextIncludes(intentSlot, "prevention-list__items", "IntentSlot groups prevention talismans for horizontal stage layout");
assertTextIncludes(intentSlot, "getStageIntentVisualSemantics", "IntentSlot derives full-stage UI semantics centrally");
assertTextIncludes(intentSlot, "data-stage-metadata-visibility", "IntentSlot exposes metadata visibility semantics");
assertTextIncludes(intentSlot, "data-stage-situation-visibility", "IntentSlot exposes situation talisman visibility semantics");
assertTextIncludes(intentSlot, "data-stage-prevention-visibility", "IntentSlot exposes prevention talisman visibility semantics");
assertTextIncludes(intentSlot, "data-stage-censer-emphasis", "IntentSlot exposes completed censer emphasis semantics");
assertTextIncludes(intentSlot, "data-stage-start-visual-state", "IntentSlot exposes transient situation talisman start animation semantics");
assertTextIncludes(intentSlot, "data-stage-timer-visible", "IntentSlot exposes timer visibility semantics");
assertTextIncludes(intentSlot, 'size="stage"', "Full ritual slot uses stage censer asset family");
assertTextIncludes(compactCenserSlot, 'size="compact"', "Compact ritual slot uses compact censer asset family");
assertTextIncludes(compactCenserSlot, 'data-compact-censer-click-action="open-full-window"', "Compact censer click action is limited to opening the full window");
assertTextIncludes(compactWindowCheck, "assertFullStageUsesStageVisuals", "Compact check verifies full-stage visual family");
assertTextIncludes(compactWindowCheck, "assertCompactCenserStateDifferentiation", "Compact check verifies compact censer state differentiation");
assertTextIncludes(
  compactWindowCheck,
  "assertCompactCompletionStaysOutOfReviewWhenFullOpenFails",
  "Compact check verifies completion stays out of review until full window opens",
);
assertTextIncludes(compactWindowCheck, "entering ritual should keep all intent slots idle", "Compact check verifies ritual entry stays idle");
assertTextIncludes(compactWindowCheck, "manual narrow viewport should not enter compact ritual mode", "Compact check verifies narrow full window stays full");
assertTextIncludes(compactWindowCheck, "compact censer click should not change business state", "Compact check verifies compact censer click is non-mutating");
assertTextIncludes(stylesCss, 'html[data-window-mode="compact"] .stage-grid--full', "CSS hides full stage only under explicit compact window mode");
assertTextIncludes(stylesCss, 'html[data-window-mode="compact"] .app-shell--ritual .compact-stage', "CSS shows compact stage only under explicit compact ritual mode");
assertTextIncludes(stylesCss, ".compact-censer--idle .censer-visual--compact", "CSS differentiates idle compact censer visuals");
assertTextIncludes(stylesCss, ".compact-censer--burning .censer-visual--compact", "CSS differentiates active compact censer visuals");
assertTextIncludes(stylesCss, ".compact-censer--resting .censer-visual--compact", "CSS differentiates resting compact censer visuals");
assertTextIncludes(stylesCss, ".compact-censer--completed .censer-visual--compact", "CSS differentiates completed compact censer visuals");
assertTextIncludes(stylesCss, ".talisman-visual__template .visual-layer__asset", "CSS renders talisman template image layer");
assertTextIncludes(stylesCss, "writing-mode: vertical-rl", "CSS renders talisman intent text vertically");
assertTextIncludes(stylesCss, "text-orientation: upright", "CSS keeps talisman text upright");
assertTextIncludes(stylesCss, ".altar-scene", "CSS renders a shared altar background scene");
assertTextIncludes(stylesCss, ".altar-scene__slots", "CSS lays out full-stage intent slots on one altar");
assertTextIncludes(stylesCss, "--altar-censer-center-y", "CSS pins full-stage censers to a shared horizontal line");
assertTextIncludes(stylesCss, 'data-stage-metadata-visibility="censer-hover"', "CSS reveals full-stage metadata only through explicit censer hover semantics");
assertTextIncludes(stylesCss, 'data-stage-situation-visibility="dismissed"', "CSS dismisses situation talismans after an intent starts");
assertTextIncludes(stylesCss, 'data-stage-prevention-visibility="dismissed"', "CSS dismisses prevention talismans after an intent completes");
assertTextIncludes(stylesCss, 'data-stage-censer-emphasis="muted"', "CSS weakens completed full-stage censers");
assertTextIncludes(stylesCss, 'data-stage-start-visual-state="burning"', "CSS scopes the situation talisman burn animation to the transient start state");
assertTextIncludes(stylesCss, "situation-talisman-burn-away", "CSS defines the situation talisman burn-away animation");
assertTextIncludes(stylesCss, ".censer-visual__hover-target:hover", "CSS prevents talisman and incense hover from revealing full-stage metadata");
assertTextIncludes(stylesCss, "background: transparent;\n  pointer-events: none;", "Full-stage censer transparent areas do not capture talisman or incense hover");
assertTextIncludes(stylesCss, ".altar-scene .censer-visual--stage .censer-visual__hover-target", "Full-stage censer hover target is scoped to stage censers");
assertTextIncludes(stylesCss, "cursor: default;\n  pointer-events: auto;", "Full-stage censer hover target remains metadata-only and hoverable");
assertTextIncludes(stylesCss, "cursor: default;\n  pointer-events: auto;", "Full-stage censer metadata target does not imply a click action");
assertTextIncludes(stylesCss, ".altar-scene .prevention-list__items", "CSS lays out prevention talismans horizontally on the altar");
assertTextIncludes(stylesCss, ".censer-visual--stage .censer-visual__lid.visual-layer--with-asset", "CSS renders stage censer PNG layers as full transparent canvases");
assertTextIncludes(stylesCss, '.censer-visual[data-censer-lid-state="open"] .censer-visual__lid', "CSS keeps censer lids visually open before completion");
assertTextIncludes(stylesCss, '.censer-visual[data-censer-lid-state="closed"] .incense-visual', "CSS hides incense after the censer lid closes");
assertTextIncludes(stylesCss, ".incense-visual .visual-layer--with-asset .visual-layer__asset", "CSS stretches incense PNG layers inside progress-driven boxes");

await Promise.all(
  [
    "docs/TAURI_DESKTOP_CHECKLIST.md",
    "docs/INTERACTION_MODEL.md",
    "docs/MACOS_INTERNAL_BUILD.md",
    "docs/SELF_USE_READINESS.md",
    "docs/DESKTOP_PERSISTENCE_JSON_SPEC.md",
    "docs/DESKTOP_BEHAVIOR_REGRESSION.md",
    "scripts/extract-stage-censer-layers.mjs",
    "scripts/generate-stage-incense-assets.mjs",
    "scripts/check-self-use-readiness.mjs",
    "src/lib/desktopPersistenceAdapter.ts",
    "src/lib/desktopPersistenceSchema.ts",
    "src/lib/fileTransferAdapter.ts",
    "src/lib/notificationAdapter.ts",
    "src/lib/soundReminder.ts",
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
    "src/assets/visuals/altar/README.md",
    "src/assets/visuals/altar/background.png",
    "src/assets/visuals/talisman/situation/README.md",
    "src/assets/visuals/talisman/prevention/README.md",
    "src/assets/visuals/talisman/situation/template.png",
    "src/assets/visuals/talisman/prevention/template.png",
    "src/assets/visuals/censer/stage/README.md",
    "src/assets/visuals/censer/stage/ash.png",
    "src/assets/visuals/censer/stage/body.png",
    "src/assets/visuals/censer/stage/feet.png",
    "src/assets/visuals/censer/stage/lid.png",
    "src/assets/visuals/censer/stage/mouth.png",
    "src/assets/visuals/censer/compact/README.md",
    "src/assets/visuals/censer/compact/ash.png",
    "src/assets/visuals/censer/compact/body.png",
    "src/assets/visuals/censer/compact/feet.png",
    "src/assets/visuals/censer/compact/lid.png",
    "src/assets/visuals/censer/compact/mouth.png",
    "src/assets/visuals/incense/stage/README.md",
    "src/assets/visuals/incense/stage/ash.png",
    "src/assets/visuals/incense/stage/ember.png",
    "src/assets/visuals/incense/stage/smoke.png",
    "src/assets/visuals/incense/stage/stick.png",
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
