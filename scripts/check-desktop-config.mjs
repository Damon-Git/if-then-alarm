import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

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

function assertTextExcludes(text, needle, label) {
  assert(!text.includes(needle), label);
}

async function readPngDimensions(relativePath) {
  try {
    const bytes = await readFile(resolveProjectPath(relativePath));
    const hasPngSignature =
      bytes.length >= 24 &&
      bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";

    assert(hasPngSignature, `${relativePath} is a readable PNG file`);
    if (!hasPngSignature) {
      return null;
    }

    return {
      colorType: bytes[25],
      height: bytes.readUInt32BE(20),
      width: bytes.readUInt32BE(16),
    };
  } catch {
    assert(false, `${relativePath} is a readable PNG file`);
    return null;
  }
}

function paethPredictor(left, up, upLeft) {
  const prediction = left + up - upLeft;
  const leftDistance = Math.abs(prediction - left);
  const upDistance = Math.abs(prediction - up);
  const upLeftDistance = Math.abs(prediction - upLeft);

  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) {
    return left;
  }

  if (upDistance <= upLeftDistance) {
    return up;
  }

  return upLeft;
}

async function readRgbaPngPixels(relativePath) {
  try {
    const bytes = await readFile(resolveProjectPath(relativePath));
    const idatChunks = [];
    let offset = 8;
    let width = null;
    let height = null;

    while (offset < bytes.length) {
      const length = bytes.readUInt32BE(offset);
      const type = bytes.subarray(offset + 4, offset + 8).toString("ascii");
      const data = bytes.subarray(offset + 8, offset + 8 + length);

      if (type === "IHDR") {
        width = data.readUInt32BE(0);
        height = data.readUInt32BE(4);
        if (data[8] !== 8 || data[9] !== 6) {
          throw new Error("expected 8-bit RGBA PNG");
        }
      } else if (type === "IDAT") {
        idatChunks.push(data);
      } else if (type === "IEND") {
        break;
      }

      offset += length + 12;
    }

    if (!width || !height || idatChunks.length === 0) {
      throw new Error("missing PNG image data");
    }

    const bytesPerPixel = 4;
    const rowLength = width * bytesPerPixel;
    const filtered = inflateSync(Buffer.concat(idatChunks));
    const expectedLength = height * (rowLength + 1);
    if (filtered.length !== expectedLength) {
      throw new Error("unexpected PNG scanline length");
    }

    const pixels = Buffer.alloc(width * height * bytesPerPixel);
    for (let y = 0; y < height; y += 1) {
      const filteredRowOffset = y * (rowLength + 1);
      const filterType = filtered[filteredRowOffset];
      for (let x = 0; x < rowLength; x += 1) {
        const pixelOffset = y * rowLength + x;
        const value = filtered[filteredRowOffset + 1 + x];
        const left = x >= bytesPerPixel ? pixels[pixelOffset - bytesPerPixel] : 0;
        const up = y > 0 ? pixels[pixelOffset - rowLength] : 0;
        const upLeft =
          y > 0 && x >= bytesPerPixel
            ? pixels[pixelOffset - rowLength - bytesPerPixel]
            : 0;

        if (filterType === 0) {
          pixels[pixelOffset] = value;
        } else if (filterType === 1) {
          pixels[pixelOffset] = value + left;
        } else if (filterType === 2) {
          pixels[pixelOffset] = value + up;
        } else if (filterType === 3) {
          pixels[pixelOffset] = value + Math.floor((left + up) / 2);
        } else if (filterType === 4) {
          pixels[pixelOffset] = value + paethPredictor(left, up, upLeft);
        } else {
          throw new Error(`unsupported PNG filter type ${filterType}`);
        }
      }
    }

    return { height, pixels, width };
  } catch {
    assert(false, `${relativePath} exposes readable RGBA pixels`);
    return null;
  }
}

function hasOnlyTemplatePixels(image) {
  if (!image) {
    return false;
  }

  let hasBlack = false;
  let hasTransparent = false;

  for (let offset = 0; offset < image.pixels.length; offset += 4) {
    const red = image.pixels[offset];
    const green = image.pixels[offset + 1];
    const blue = image.pixels[offset + 2];
    const alpha = image.pixels[offset + 3];

    if (red !== 0 || green !== 0 || blue !== 0 || (alpha !== 0 && alpha !== 255)) {
      return false;
    }

    hasBlack ||= alpha === 255;
    hasTransparent ||= alpha === 0;
  }

  return hasBlack && hasTransparent;
}

function isTwoTimesNearestNeighbor(source, retina) {
  if (
    !source ||
    !retina ||
    retina.width !== source.width * 2 ||
    retina.height !== source.height * 2
  ) {
    return false;
  }

  for (let y = 0; y < retina.height; y += 1) {
    for (let x = 0; x < retina.width; x += 1) {
      const sourceOffset = (Math.floor(y / 2) * source.width + Math.floor(x / 2)) * 4;
      const retinaOffset = (y * retina.width + x) * 4;
      if (
        !source.pixels
          .subarray(sourceOffset, sourceOffset + 4)
          .equals(retina.pixels.subarray(retinaOffset, retinaOffset + 4))
      ) {
        return false;
      }
    }
  }

  return true;
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
const tauriPersistenceRecoveryCheck = await readText("scripts/check-tauri-persistence-recovery.mjs");
const tauriWindowRoundtripCheck = await readText("scripts/check-tauri-window-roundtrip.mjs");
const soundAssetsCheck = await readText("scripts/check-sound-assets.mjs");
const visualAssetsCheck = await readText("scripts/check-visual-assets.mjs");
const stylesCss = await readText("src/styles.css");
const assetPipelineDoc = await readText("docs/ASSET_PIPELINE.md");
const visualAssetBoundariesDoc = await readText("docs/VISUAL_ASSET_BOUNDARIES.md");
const visualAssetReplacementChecklistDoc = await readText("docs/VISUAL_ASSET_REPLACEMENT_CHECKLIST.md");
const desktopIconsReadme = await readText("src-tauri/icons/README.md");
const tauriWindow = await readText("src/lib/tauriWindow.ts");
const visualAssetManifest = await readText("src/lib/visualAssetManifest.ts");
const visualAssets = await readText("src/lib/visualAssets.ts");
const visualState = await readText("src/lib/visualState.ts");
const censerVisual = await readText("src/components/CenserVisual.tsx");
const compactCenserSlot = await readText("src/components/CompactCenserSlot.tsx");
const compactWindowDragRegion = await readText("src/components/CompactWindowDragRegion.tsx");
const compactWindowDragSession = await readText("src/components/useCompactWindowDragSession.ts");
const incenseVisual = await readText("src/components/IncenseVisual.tsx");
const intentSlot = await readText("src/components/IntentSlot.tsx");
const ritualStage = await readText("src/components/RitualStage.tsx");
const talismanVisual = await readText("src/components/TalismanVisual.tsx");
const visualAssetPreviewPanel = await readText("src/components/VisualAssetPreviewPanel.tsx");
const reviewPanel = await readText("src/components/ReviewPanel.tsx");
const historyPanel = await readText("src/components/HistoryPanel.tsx");
const appIconV1Dimensions = await readPngDimensions(
  "src-tauri/icons/app-icon/app-icon-v1.png",
);
const appIconV1RetinaDimensions = await readPngDimensions(
  "src-tauri/icons/app-icon/app-icon-v1@2x.png",
);
const appIconV1Source = await readFile(
  resolveProjectPath("src-tauri/icons/app-icon/app-icon-v1.png"),
);
const appIconV1RetinaSource = await readFile(
  resolveProjectPath("src-tauri/icons/app-icon/app-icon-v1@2x.png"),
);
const menubarIconV1Dimensions = await readPngDimensions(
  "src-tauri/icons/menubar-icon/menubar-icon-v1.png",
);
const menubarIconV1RetinaDimensions = await readPngDimensions(
  "src-tauri/icons/menubar-icon/menubar-icon-v1@2x.png",
);
const menubarIconV1 = await readRgbaPngPixels(
  "src-tauri/icons/menubar-icon/menubar-icon-v1.png",
);
const menubarIconV1Retina = await readRgbaPngPixels(
  "src-tauri/icons/menubar-icon/menubar-icon-v1@2x.png",
);

assertPackageScript(packageJson, "dev:tauri-frontend", "node scripts/start-tauri-frontend.mjs");
assertPackageScript(packageJson, "check:compact", "node scripts/check-compact-window.mjs");
assertPackageScript(packageJson, "check:desktop-config", "node scripts/check-desktop-config.mjs");
assertPackageScript(packageJson, "check:self-use", "node scripts/check-self-use-readiness.mjs");
assertPackageScript(packageJson, "check:sound-assets", "node scripts/check-sound-assets.mjs");
assertPackageScript(packageJson, "check:tauri-persistence-recovery", "node scripts/check-tauri-persistence-recovery.mjs");
assertPackageScript(packageJson, "check:tauri-window-roundtrip", "node scripts/check-tauri-window-roundtrip.mjs");
assertPackageScript(packageJson, "check:visual-assets", "node scripts/check-visual-assets.mjs");
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
  Array.isArray(tauriConfig.bundle?.icon) &&
    tauriConfig.bundle.icon.length === 1 &&
    tauriConfig.bundle.icon[0] === "icons/app-icon/app-icon-v1@2x.png",
  "Tauri bundle uses only the app icon v1 Retina build input",
);
assert(
  !tauriConfig.bundle?.icon?.includes("icons/app-icon/placeholder-icon.png"),
  "Tauri bundle no longer wires the placeholder app icon",
);
assert(
  appIconV1Dimensions?.width === 1024 &&
    appIconV1Dimensions.height === 1024,
  "Desktop app icon v1 source is 1024 x 1024",
);
assert(
  appIconV1Dimensions?.colorType === 6,
  "Desktop app icon v1 source is RGBA",
);
assert(
  appIconV1RetinaDimensions?.width === 1024 &&
    appIconV1RetinaDimensions.height === 1024 &&
    appIconV1RetinaDimensions.colorType === 6,
  "Desktop app icon v1 Retina build input is 1024 x 1024 RGBA",
);
assert(
  appIconV1Source.equals(appIconV1RetinaSource),
  "Desktop app icon v1 Retina build input matches the source PNG",
);
assert(
  menubarIconV1Dimensions?.width === 16 &&
    menubarIconV1Dimensions.height === 16 &&
    menubarIconV1Dimensions.colorType === 6,
  "Desktop menubar icon v1 source is 16 x 16 RGBA",
);
assert(
  menubarIconV1RetinaDimensions?.width === 32 &&
    menubarIconV1RetinaDimensions.height === 32 &&
    menubarIconV1RetinaDimensions.colorType === 6,
  "Desktop menubar icon v1 Retina source is 32 x 32 RGBA",
);
assert(
  hasOnlyTemplatePixels(menubarIconV1),
  "Desktop menubar icon v1 source uses only black and transparent pixels",
);
assert(
  hasOnlyTemplatePixels(menubarIconV1Retina),
  "Desktop menubar icon v1 Retina source uses only black and transparent pixels",
);
assert(
  isTwoTimesNearestNeighbor(menubarIconV1, menubarIconV1Retina),
  "Desktop menubar icon v1 Retina source is the 2x outline of the 1x source",
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
  `currentWindow.innerSize()`,
  "Tauri window adapter reads the inner window size before restoring the full shell",
);
assertTextIncludes(
  tauriWindow,
  `currentWindow.outerSize()`,
  "Tauri window adapter reads the outer window size before restoring the full shell",
);
assertTextIncludes(
  tauriWindow,
  `size.height - decorationSize.height`,
  "Tauri window adapter compensates for native title bar height when restoring the full shell",
);
await assertFileExists("scripts/check-tauri-window-roundtrip.mjs");
await assertFileExists("scripts/check-tauri-persistence-recovery.mjs");
await assertFileExists("scripts/tauri-window-roundtrip-helper.swift");
[
  "persistence.v1.before.json",
  "src-tauri/target/debug/jiji-rululing",
  "HOME: tempHome",
  "actual desktop JSON after native smoke",
  "drag-window-local",
  "compact censer-body drag moved the window without expansion",
  "roundtrip 2",
].forEach((token) =>
  assertTextIncludes(
    tauriWindowRoundtripCheck,
    token,
    `Native Tauri window roundtrip smoke preserves ${token}`,
  ),
);
[
  "persistence.v1.before.json",
  "src-tauri/target/debug/jiji-rululing",
  "HOME: tempHome",
  "persistence\\.v1\\.corrupt-",
  "isolated corrupt JSON backup preserves the original fixture bytes",
  "rewrote a safe isolated desktop JSON under temp HOME",
  "actual desktop JSON after native recovery smoke",
].forEach((token) =>
  assertTextIncludes(
    tauriPersistenceRecoveryCheck,
    token,
    `Native Tauri persistence recovery smoke preserves ${token}`,
  ),
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
  "core:window:allow-set-position",
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
assertTextIncludes(
  mainRust,
  'tauri::include_image!("./icons/menubar-icon/menubar-icon-v1@2x.png")',
  "Rust embeds the menubar icon v1 Retina source",
);
assertTextIncludes(mainRust, ".icon(MENUBAR_ICON)", "Rust attaches the menubar icon v1 to the tray");
assertTextIncludes(mainRust, ".icon_as_template(true)", "Rust treats the menubar icon v1 as a macOS template");
assertTextExcludes(mainRust, '.title("令")', "Rust removes the temporary 令 tray title");
assertTextExcludes(mainRust, "default_window_icon", "Rust no longer falls back to the default app icon for the tray");
assertTextIncludes(
  desktopIconsReadme,
  "菜单栏入口不再回退到默认应用图标",
  "Desktop icon docs record that the tray fallback has been removed",
);
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
  "../assets/sounds/incense-finished.wav?url",
  "Sound reminder imports bundled WAV assets",
);
assertTextIncludes(
  soundReminder,
  "decodeAudioData",
  "Sound reminder decodes bundled WAV assets through Web Audio",
);
assertTextIncludes(
  soundReminder,
  "stopActiveBellPlayback",
  "Sound reminder stops stale playback before another sound starts",
);
assertTextIncludes(
  soundReminder,
  "cancelTimerSoundReminder",
  "Sound reminder exposes explicit cancellation for stale timer sounds",
);
assertTextIncludes(
  soundReminder,
  "stopTimerSoundReminderPlayback();",
  "Sound reminder cancellation stops active playback",
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
  soundAssetsCheck,
  "RIFF/WAVE",
  "Sound asset check validates WAV files",
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
  "compactIncenseAshUrl",
  "compactIncenseEmberUrl",
  "compactIncenseSmokeUrl",
  "compactIncenseStickUrl",
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
  '"incense/compact/ash"',
  '"incense/compact/ember"',
  '"incense/compact/smoke"',
  '"incense/compact/stick"',
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
  "TALISMAN_TEXT_SAFE_ZONES",
  "TALISMAN_ASSET_LAYERS",
  "TALISMAN_TEMPLATE_ASSET_LAYERS",
  "CENSER_ASSET_LAYERS",
  "INCENSE_ASSET_LAYERS",
  "altar",
  "censerStage",
  "incenseCompact",
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
assertTextIncludes(censerVisual, "censer-visual__metadata", "CenserVisual groups full-stage metadata in one hover card");
assertTextIncludes(censerVisual, "getStageIntentVisualSemantics(status).statusLabel", "CenserVisual derives metadata status copy from central visual semantics");
assertTextIncludes(censerVisual, 'data-censer-interaction-role={size === "stage" ? "metadata-only" : "presentational"}', "CenserVisual keeps full-stage censers metadata-only");
assertTextIncludes(censerVisual, 'data-censer-hover-action="show-metadata"', "CenserVisual limits stage hover action to metadata display");
assertTextIncludes(censerVisual, "onMetadataActiveChange", "CenserVisual reports explicit metadata hover state for WebView");
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
assertTextIncludes(incenseVisual, "getIncenseVisualState", "IncenseVisual maps each stick through central visual state");
assertTextIncludes(incenseVisual, "data-incense-stick-progress", "IncenseVisual exposes per-stick progress for visual burning");
assertTextIncludes(incenseVisual, 'data-incense-smoke-layer="near"', "IncenseVisual exposes the near stage smoke wisp anchor");
assertTextIncludes(incenseVisual, 'data-incense-smoke-layer="far"', "IncenseVisual exposes the far stage smoke wisp anchor");
assertTextIncludes(visualAssetsCheck, "VISUAL_ASSET_REPLACEMENT_REGISTRY", "Visual asset check reads the replacement registry");
assertTextIncludes(visualAssetsCheck, "visualAssetManifest", "Visual asset check reads the manifest");
assertTextIncludes(visualAssetsCheck, "assertTransparentCorners", "Visual asset check validates transparent PNG corners");
assertTextIncludes(visualAssetsCheck, "exact-source-canvas", "Visual asset check validates exact source canvas dimensions");
assertTextIncludes(appTsx, "VisualAssetPreviewPanel", "App exposes the visual asset preview panel");
assertTextIncludes(appTsx, "import.meta.env.DEV", "Visual asset preview stays behind the dev-only gate");
assertTextIncludes(visualAssets, "ALTAR_BACKGROUND_ALIGNMENT_GUIDES", "Visual asset contracts define altar background guides");
assertTextIncludes(visualAssetPreviewPanel, "VISUAL_ASSET_REPLACEMENT_REGISTRY", "Visual asset preview reads the replacement registry");
assertTextIncludes(visualAssetPreviewPanel, "VISUAL_ASSET_REPLACEMENT_ORDER", "Visual asset preview follows registry order");
assertTextIncludes(visualAssetPreviewPanel, "ALTAR_BACKGROUND_ALIGNMENT_GUIDES", "Visual asset preview renders altar alignment guides");
assertTextIncludes(visualAssetPreviewPanel, "data-alignment-guides", "Visual asset preview can toggle altar alignment guides");
assertTextIncludes(visualAssetPreviewPanel, "IntentSlot", "Visual asset preview reuses the production stage slot");
assertTextIncludes(visualAssetPreviewPanel, "dimensionPolicy", "Visual asset preview surfaces dimension policy");
assertTextIncludes(visualAssetPreviewPanel, "transparentBackground", "Visual asset preview surfaces transparency expectations");
assertTextIncludes(assetPipelineDoc, "docs/VISUAL_ASSET_BOUNDARIES.md", "Asset pipeline links to the formal asset boundaries");
assertTextIncludes(assetPipelineDoc, "TALISMAN_TEXT_SAFE_ZONES", "Asset pipeline documents talisman text safe zones");
assertTextIncludes(
  visualAssetReplacementChecklistDoc,
  "docs/VISUAL_ASSET_BOUNDARIES.md",
  "Visual asset replacement checklist links to the formal asset boundaries",
);
assertTextIncludes(
  visualAssetReplacementChecklistDoc,
  "TALISMAN_TEXT_SAFE_ZONES",
  "Visual asset replacement checklist checks talisman text safe zones",
);
[
  "背景只负责环境氛围，不负责业务状态。",
  "香炉只负责容器本体，不包含线香、符箓、状态文字或桌面背景。",
  "符箓模板只负责固定符纹和纸张质感，不包含用户填写的执行意图文本。",
  "只有该香炉全部线香烧完并进入 `completed` 后才闭盖。",
  "小窗只显示用户创建的 1-3 个香炉，单行并排。",
  "文本安全区维护在 `src/lib/visualAssets.ts` 的 `TALISMAN_TEXT_SAFE_ZONES`。",
].forEach((boundaryToken) =>
  assertTextIncludes(
    visualAssetBoundariesDoc,
    boundaryToken,
    `Visual asset boundaries document includes ${boundaryToken}`,
  ),
);
assertTextIncludes(talismanVisual, "TALISMAN_TEMPLATE_ASSET_LAYERS.map", "TalismanVisual uses central talisman image layer order");
assertTextIncludes(talismanVisual, "splitIntentText", "TalismanVisual splits intent text into side columns");
assertTextIncludes(talismanVisual, "talisman-visual__column--right", "TalismanVisual renders right text column");
assertTextIncludes(talismanVisual, "talisman-visual__column--left", "TalismanVisual renders left text column");
assertTextIncludes(talismanVisual, 'data-talisman-click-action={clickAction}', "TalismanVisual exposes explicit click action semantics");
assertTextIncludes(talismanVisual, 'data-talisman-interaction-role={interactionRole}', "TalismanVisual distinguishes start entry and view-only talismans");
assertTextIncludes(talismanVisual, "data-talisman-preview-active", "TalismanVisual exposes explicit preview hover state for WebView");
assertTextIncludes(talismanVisual, "onPreviewActiveChange", "TalismanVisual reports preview state for parent stacking");
assertTextIncludes(talismanVisual, 'data-talisman-burn-layer="ignition"', "TalismanVisual exposes a local ignition burn layer");
assertTextIncludes(talismanVisual, 'data-talisman-burn-layer="char"', "TalismanVisual exposes a progressive char burn layer");
assertTextIncludes(talismanVisual, 'data-talisman-burn-layer="edge"', "TalismanVisual exposes an advancing ember edge burn layer");
assertTextIncludes(talismanVisual, 'data-talisman-burn-layer="sparks"', "TalismanVisual exposes restrained burn sparks");
assertTextIncludes(ritualStage, "getAltarAssetUrl", "RitualStage uses the altar background asset manifest");
assertTextIncludes(ritualStage, "altar-scene__slots", "RitualStage renders shared altar scene slots");
assertTextIncludes(ritualStage, "onRequestReview", "RitualStage exposes an explicit review entry after completion");
assertTextIncludes(ritualStage, "ritual-completion-card", "RitualStage marks completed ritual without auto-opening review");
assertTextIncludes(ritualStage, "本轮香尽", "RitualStage uses calm completion copy before review");
assertTextIncludes(ritualStage, "data-ritual-complete", "RitualStage exposes completed ritual styling state");
assertTextIncludes(reviewPanel, "review-overview", "ReviewPanel shows a lightweight session summary");
assertTextIncludes(reviewPanel, "review-main-field", "ReviewPanel keeps the one-line review as the primary field");
assertTextIncludes(reviewPanel, "review-optional-fields", "ReviewPanel keeps obstacle and adjustment as supplemental fields");
assertTextIncludes(historyPanel, "history-summary__main", "HistoryPanel groups record date and result clearly");
assertTextIncludes(historyPanel, "history-summary__metrics", "HistoryPanel groups history metrics separately from review text");
assertTextIncludes(historyPanel, "history-reflection", "HistoryPanel keeps obstacle and adjustment out of the main summary row");
assertTextIncludes(intentSlot, "prevention-list__items", "IntentSlot groups prevention talismans for horizontal stage layout");
assertTextIncludes(intentSlot, "getStageIntentVisualSemantics", "IntentSlot derives full-stage UI semantics centrally");
assertTextIncludes(intentSlot, "data-stage-metadata-visibility", "IntentSlot exposes metadata visibility semantics");
assertTextIncludes(intentSlot, "data-stage-metadata-active", "IntentSlot exposes explicit metadata hover state");
assertTextIncludes(intentSlot, "data-stage-situation-visibility", "IntentSlot exposes situation talisman visibility semantics");
assertTextIncludes(intentSlot, "data-stage-prevention-visibility", "IntentSlot exposes prevention talisman visibility semantics");
assertTextIncludes(intentSlot, "data-stage-prevention-preview-active", "IntentSlot exposes explicit prevention talisman preview state");
assertTextIncludes(intentSlot, "data-stage-censer-emphasis", "IntentSlot exposes completed censer emphasis semantics");
assertTextIncludes(intentSlot, "data-stage-start-visual-state", "IntentSlot exposes transient situation talisman start animation semantics");
assertTextIncludes(intentSlot, "data-stage-timer-visible", "IntentSlot exposes timer visibility semantics");
assertTextIncludes(intentSlot, 'size="stage"', "Full ritual slot uses stage censer asset family");
assertTextIncludes(compactCenserSlot, 'size="compact"', "Compact ritual slot uses compact censer asset family");
assertTextIncludes(compactCenserSlot, 'data-compact-censer-click-action="open-full-window"', "Compact censer click action is limited to opening the full window");
assertTextIncludes(compactCenserSlot, 'data-compact-censer-drag-action="move-window-after-threshold"', "Compact censer drag action moves the native window after its threshold");
assertTextIncludes(compactCenserSlot, "CENSER_DRAG_CLICK_SUPPRESSION_PX", "Compact censer suppresses click after pointer drag movement");
assertTextIncludes(compactCenserSlot, "suppressClickRef", "Compact censer tracks pointer drag click suppression");
assertTextIncludes(compactCenserSlot, "useCompactWindowDragSession", "Compact censer starts a thresholded Tauri window-position session");
assertTextIncludes(ritualStage, "<CompactWindowDragRegion />", "Compact ritual stage exposes a dedicated window drag region");
assertTextIncludes(compactWindowDragRegion, 'data-compact-drag-action="move-window"', "Compact window drag region exposes move-window semantics");
assertTextIncludes(compactWindowDragRegion, 'data-compact-drag-implementation="pointer-position-session"', "Compact window drag region uses the Tauri window-position session");
assertTextIncludes(compactWindowDragRegion, "useCompactWindowDragSession", "Compact window drag region starts a reusable Tauri window-position session");
assertTextIncludes(compactWindowDragSession, "createCurrentTauriWindowDragSession", "Compact drag helper starts a Tauri window-position session");
assertTextIncludes(compactWindowDragSession, "activationDistance", "Compact drag helper supports thresholded activation");
assertTextIncludes(tauriWindow, "createCurrentTauriWindowDragSession", "Tauri window adapter owns compact window-position drag sessions");
assertTextIncludes(tauriWindow, "currentWindow.setPosition", "Tauri window adapter moves the compact window through the native shell");
assertTextIncludes(tauriWindow, "lastCompactWindowPosition", "Tauri window adapter remembers the last compact window position in-session");
assertTextIncludes(
  tauriWindow,
  'previousMode === "compact" && shell.mode === "full"',
  "Tauri window adapter snapshots compact position before expanding",
);
assertTextIncludes(compactWindowCheck, "assertFullStageUsesStageVisuals", "Compact check verifies full-stage visual family");
assertTextIncludes(compactWindowCheck, "assertCompactCenserStateDifferentiation", "Compact check verifies compact censer state differentiation");
assertTextIncludes(compactWindowCheck, "assertCompactRemainingTooltip", "Compact check verifies remaining-time hover and focus tooltip");
assertTextIncludes(
  compactWindowCheck,
  "assertFullStageActiveCenserHoverUsesSingleCard",
  "Compact check verifies active full-stage censer hover uses a single timer card",
);
assertTextIncludes(compactWindowCheck, "assertCompactDragRegionSemantics", "Compact check verifies compact drag region semantics");
assertTextIncludes(compactWindowCheck, "assertCompactCenserDragClickSuppression", "Compact check verifies censer drag click suppression");
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
assertTextIncludes(stylesCss, 'html[data-window-mode="compact"] .app-shell--ritual .ritual-completion-card', "CSS keeps completion review entry out of compact window mode");
assertTextIncludes(stylesCss, '.ritual-panel[data-ritual-complete="true"] .ritual-abandon-button', "CSS de-emphasizes abandoning after ritual completion");
assertTextIncludes(stylesCss, ".compact-censer--idle .censer-visual--compact", "CSS differentiates idle compact censer visuals");
assertTextIncludes(stylesCss, ".compact-censer--burning .censer-visual--compact", "CSS differentiates active compact censer visuals");
assertTextIncludes(stylesCss, ".compact-censer--resting .censer-visual--compact", "CSS differentiates resting compact censer visuals");
assertTextIncludes(stylesCss, ".compact-censer--completed .censer-visual--compact", "CSS differentiates completed compact censer visuals");
assertTextIncludes(stylesCss, ".compact-censer__remaining", "CSS renders compact remaining time as a transient tooltip");
assertTextIncludes(stylesCss, "gap: 6px;", "CSS keeps compact censers close together");
assertTextIncludes(stylesCss, "opacity: 0.86;", "CSS avoids excessive transparency for idle compact censers");
assertTextIncludes(stylesCss, ".talisman-visual__template .visual-layer__asset", "CSS renders talisman template image layer");
assertTextIncludes(stylesCss, "writing-mode: vertical-rl", "CSS renders talisman intent text vertically");
assertTextIncludes(stylesCss, "text-orientation: upright", "CSS keeps talisman text upright");
assertTextIncludes(stylesCss, ".altar-scene", "CSS renders a shared altar background scene");
assertTextIncludes(stylesCss, ".altar-scene__slots", "CSS lays out full-stage intent slots on one altar");
assertTextIncludes(stylesCss, "--altar-censer-center-y", "CSS pins full-stage censers to a shared horizontal line");
assertTextIncludes(stylesCss, 'data-stage-metadata-visibility="censer-hover"', "CSS reveals full-stage metadata only through explicit censer hover semantics");
assertTextIncludes(stylesCss, 'data-stage-metadata-active="true"', "CSS uses explicit metadata hover state instead of WebView :has hover");
assertTextIncludes(stylesCss, ".censer-visual__metadata", "CSS treats full-stage metadata as one card");
assertTextIncludes(
  stylesCss,
  ":not(.intent-slot--burning):not(",
  "CSS suppresses duplicate censer metadata while active timer cards are preferred",
);
assertTextIncludes(
  stylesCss,
  ".intent-slot--burning[data-stage-metadata-visibility=\"censer-hover\"][data-stage-metadata-active=\"true\"]",
  "CSS reveals the active burning timer card through the censer hover target",
);
assertTextIncludes(stylesCss, ".review-overview", "CSS supports lightweight review summary cards");
assertTextIncludes(stylesCss, ".review-optional-fields", "CSS keeps supplemental review fields visually secondary");
assertTextIncludes(stylesCss, ".history-summary__metrics", "CSS keeps history metrics scannable");
assertTextIncludes(stylesCss, 'data-stage-situation-visibility="dismissed"', "CSS dismisses situation talismans after an intent starts");
assertTextIncludes(stylesCss, 'data-stage-prevention-visibility="dismissed"', "CSS dismisses prevention talismans after an intent completes");
assertTextIncludes(stylesCss, 'data-stage-censer-emphasis="muted"', "CSS weakens completed full-stage censers");
assertTextIncludes(stylesCss, 'data-stage-start-visual-state="burning"', "CSS scopes the situation talisman burn animation to the transient start state");
assertTextIncludes(stylesCss, "situation-talisman-burn-away", "CSS defines the situation talisman burn-away animation");
assertTextIncludes(stylesCss, "situation-talisman-paper-recede", "CSS recedes the talisman template and text together");
assertTextIncludes(stylesCss, "situation-talisman-local-ignition", "CSS defines a local talisman ignition");
assertTextIncludes(stylesCss, "situation-talisman-char-front", "CSS defines the talisman char front");
assertTextIncludes(stylesCss, "situation-talisman-edge-advance", "CSS defines the advancing talisman ember edge");
assertTextIncludes(stylesCss, "situation-talisman-reduced-fade", "CSS defines a reduced-motion talisman burn fallback");
assertTextIncludes(
  assetPipelineDoc,
  "真实燃烧观感仍需通过 Web 截图和 Tauri 开发版人工验收。",
  "Asset pipeline keeps visual burn quality under screenshot and Tauri manual review",
);
assertTextIncludes(stylesCss, 'data-talisman-preview-active="true"', "CSS enlarges talismans from explicit preview state");
assertTextIncludes(stylesCss, "background: transparent;\n  pointer-events: none;", "Full-stage censer transparent areas do not capture talisman or incense hover");
assertTextIncludes(stylesCss, ".altar-scene .censer-visual--stage .censer-visual__hover-target", "Full-stage censer hover target is scoped to stage censers");
assertTextIncludes(stylesCss, "cursor: default;\n  pointer-events: auto;", "Full-stage censer hover target remains metadata-only and hoverable");
assertTextIncludes(stylesCss, "cursor: default;\n  pointer-events: auto;", "Full-stage censer metadata target does not imply a click action");
assertTextIncludes(stylesCss, ".altar-scene .prevention-list__items", "CSS lays out prevention talismans horizontally on the altar");
assertTextIncludes(stylesCss, ".censer-visual--stage .censer-visual__lid.visual-layer--with-asset", "CSS renders stage censer PNG layers as full transparent canvases");
assertTextIncludes(stylesCss, '.censer-visual[data-censer-lid-state="open"] .censer-visual__lid', "CSS keeps censer lids visually open before completion");
assertTextIncludes(stylesCss, '.censer-visual[data-censer-lid-state="closed"] .incense-visual', "CSS hides incense after the censer lid closes");
assertTextIncludes(stylesCss, ".incense-visual .visual-layer--with-asset .visual-layer__asset", "CSS stretches incense PNG layers inside progress-driven boxes");
assertTextIncludes(stylesCss, 'data-incense-state="burning"', "CSS styles the currently burning incense stick by explicit state");
assertTextIncludes(stylesCss, "clip-path: inset(var(--incense-stick-progress) 0 0 0)", "CSS shortens the current incense stick as progress advances");
assertTextIncludes(stylesCss, 'data-incense-state="burned"', "CSS styles already burned incense sticks by explicit state");
assertTextIncludes(stylesCss, "stage-incense-smoke-drift", "CSS defines the slow stage smoke core drift");
assertTextIncludes(stylesCss, "stage-incense-smoke-wisp-near", "CSS defines a staggered near stage smoke wisp");
assertTextIncludes(stylesCss, "stage-incense-smoke-wisp-far", "CSS defines a staggered far stage smoke wisp");
assertTextIncludes(stylesCss, "stage-incense-smoke-wisp-afterglow", "CSS defines a short resting smoke wisp retreat");
assertTextIncludes(stylesCss, "compact-incense-smoke-drift", "CSS defines a restrained compact smoke drift");
assertTextIncludes(
  assetPipelineDoc,
  "真实烟雾观感仍需通过 Web 截图和 Tauri 开发版人工验收。",
  "Asset pipeline keeps visual smoke quality under screenshot and Tauri manual review",
);
assertTextIncludes(
  stylesCss,
  '.incense-visual__unit[data-incense-state="burned"] .incense-visual__ash,\n.incense-visual__unit[data-incense-state="resting"] .incense-visual__ash',
  "CSS keeps burned and resting incense ash at full height",
);

await Promise.all(
  [
    "docs/TAURI_DESKTOP_CHECKLIST.md",
    "docs/INTERACTION_MODEL.md",
    "docs/MACOS_INTERNAL_BUILD.md",
    "docs/SELF_USE_READINESS.md",
    "docs/DESKTOP_PERSISTENCE_JSON_SPEC.md",
    "docs/DESKTOP_BEHAVIOR_REGRESSION.md",
    "docs/VISUAL_ASSET_BOUNDARIES.md",
    "scripts/extract-stage-censer-layers.mjs",
    "scripts/generate-stage-incense-assets.mjs",
    "scripts/check-tauri-persistence-recovery.mjs",
    "scripts/check-visual-assets.mjs",
    "scripts/check-self-use-readiness.mjs",
    "src/lib/desktopPersistenceAdapter.ts",
    "src/lib/desktopPersistenceSchema.ts",
    "src/lib/fileTransferAdapter.ts",
    "src/lib/notificationAdapter.ts",
    "src/lib/soundReminder.ts",
    "src/lib/tauriWindow.ts",
    "src/lib/visualAssetManifest.ts",
    "src/lib/visualAssetManifest.test.ts",
    "src/components/VisualAssetPreviewPanel.tsx",
    "src-tauri/src/main.rs",
    "src-tauri/icons/README.md",
    "src-tauri/icons/app-icon/README.md",
    "src-tauri/icons/app-icon/app-icon-v1.png",
    "src-tauri/icons/app-icon/app-icon-v1@2x.png",
    "src-tauri/icons/app-icon/placeholder-icon.png",
    "src-tauri/icons/menubar-icon/README.md",
    "src-tauri/icons/menubar-icon/menubar-icon-v1.png",
    "src-tauri/icons/menubar-icon/menubar-icon-v1@2x.png",
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
    "src/assets/visuals/incense/compact/ash.png",
    "src/assets/visuals/incense/compact/ember.png",
    "src/assets/visuals/incense/compact/smoke.png",
    "src/assets/visuals/incense/compact/stick.png",
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
