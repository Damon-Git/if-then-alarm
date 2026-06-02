import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "playwright";

const targetUrl = process.env.COMPACT_CHECK_URL ?? "http://127.0.0.1:5173/";
const screenshotPath = "artifacts/compact-window.png";
const burningScreenshotPath = "artifacts/compact-window-burning.png";
const restingScreenshotPath = "artifacts/compact-window-resting.png";

const readCompactWindowSize = async () => {
  const constantsTs = await readFile("src/constants.ts", "utf8");
  const match = constantsTs.match(/export const COMPACT_WINDOW_SIZE = \{ width: (\d+), height: (\d+) \} as const;/);

  if (!match) {
    throw new Error("Cannot find COMPACT_WINDOW_SIZE in src/constants.ts.");
  }

  return {
    height: Number(match[2]),
    width: Number(match[1]),
  };
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const assertNoHorizontalOverflow = async (page, label) => {
  const metrics = await page.evaluate(() => ({
    bodyScrollWidth: document.body.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    windowWidth: window.innerWidth,
  }));
  const maxWidth = Math.max(metrics.clientWidth, metrics.windowWidth);

  assert(
    metrics.scrollWidth <= maxWidth && metrics.bodyScrollWidth <= maxWidth,
    `${label} has horizontal overflow: ${JSON.stringify(metrics)}`,
  );
};

const assertVisible = async (locator, label) => {
  assert(await locator.isVisible(), `${label} is not visible`);
};

const assertHidden = async (locator, label) => {
  assert(!(await locator.isVisible()), `${label} should be hidden`);
};

const assertTransparentBackground = async (locator, label) => {
  const backgroundColor = await locator.evaluate((element) => window.getComputedStyle(element).backgroundColor);

  assert(backgroundColor === "rgba(0, 0, 0, 0)", `${label} should not draw a background: ${backgroundColor}`);
};

const compactCenserAssetLayers = ["lid", "mouth", "ash", "body", "feet"];
const compactIncenseAssetLayers = ["stick", "ash", "ember", "smoke"];

const assertFullStageUsesStageVisuals = async (page) => {
  assert(
    (await page.locator(".stage-grid--full .censer-visual--stage").count()) === 3,
    "full ritual stage should render three stage censer visuals",
  );
  assert(
    (await page.locator(".stage-grid--full .censer-visual--compact").count()) === 0,
    "full ritual stage should not render compact censer visuals",
  );
  assert(
    (await page.locator('.stage-grid--full .censer-visual[data-censer-size="stage"]').count()) === 3,
    "full ritual stage should mark every censer as stage-sized",
  );
  assert(
    (await page.locator('.stage-grid--full .censer-visual[data-censer-lid-state="open"]').count()) === 3,
    "full ritual stage should keep all idle censer lids open",
  );
  assert(
    (await page.locator('.stage-grid--full .intent-slot[data-stage-intent-status="idle"]').count()) === 3,
    "full ritual stage should expose idle status semantics for every new slot",
  );
  assert(
    (await page.locator('.stage-grid--full .intent-slot[data-stage-metadata-visibility="censer-hover"]').count()) === 3,
    "full ritual stage should hide metadata until hovering the censer",
  );
  assert(
    (await page.locator('.stage-grid--full .intent-slot[data-stage-situation-visibility="visible"]').count()) === 3,
    "full ritual stage should keep idle situation talismans visible",
  );
  assert(
    (await page.locator('.stage-grid--full .intent-slot[data-stage-prevention-visibility="visible"]').count()) === 3,
    "full ritual stage should keep idle prevention talisman slots visible",
  );
  assert(
    (await page.locator('.stage-grid--full .intent-slot[data-stage-censer-emphasis="normal"]').count()) === 3,
    "full ritual stage should keep idle censers at normal emphasis",
  );
  assert(
    (await page.locator(".stage-grid--full .censer-visual__hover-target").count()) === 3,
    "full ritual stage should expose a censer-only metadata hover target",
  );
  assert(
    (await page.locator('.stage-grid--full .talisman-visual--situation[data-talisman-click-action="start-confirm"]').count()) === 3,
    "full ritual stage should make idle situation talismans the only start-confirm click targets",
  );
  assert(
    (await page.locator('.stage-grid--full .talisman-visual--prevention[data-talisman-click-action="none"]').count()) === 0,
    "full ritual stage should not render prevention click targets when no prevention intents exist",
  );
  assert(
    (await page.locator('.stage-grid--full .censer-visual[data-censer-interaction-role="metadata-only"]').count()) === 3,
    "full ritual stage should keep censers metadata-only",
  );
  assert(
    (await page.locator('.stage-grid--full .incense-visual[data-incense-click-action="none"]').count()) === 3,
    "full ritual stage should keep incense non-clickable",
  );
  assert(
    (await page.locator('.stage-grid--full .intent-slot[data-stage-timer-visible="false"]').count()) === 3,
    "full ritual stage should not show timer panels before any intent starts",
  );
  assert(
    (await page.locator('.stage-grid--full [data-visual-slot^="censer/stage/"]').count()) === 15,
    "full ritual stage should expose all stage censer visual slots",
  );
  assert(
    (await page.locator('.stage-grid--full [data-visual-slot^="incense/stage/"]').count()) === 24,
    "full ritual stage should expose all stage incense visual slots",
  );
  assert(
    (await page.locator('.stage-grid--full [data-visual-slot^="censer/compact/"]').count()) === 0,
    "full ritual stage should not expose compact censer visual slots",
  );
  assert(
    (await page.locator('.stage-grid--full [data-visual-slot^="incense/compact/"]').count()) === 0,
    "full ritual stage should not expose compact incense visual slots",
  );
};

const assertCompactCenserUsesAssetLayers = async (page) => {
  for (const layer of compactCenserAssetLayers) {
    const layerLocator = page.locator(`.compact-censer .censer-visual__${layer}.visual-layer--with-asset`);
    const imageLocator = layerLocator.locator("img.visual-layer__asset");

    assert(
      (await layerLocator.count()) === 3,
      `compact ${layer} layer should use image assets for all three censers`,
    );
    assert(
      (await imageLocator.count()) === 3,
      `compact ${layer} layer should render three asset images`,
    );

    const imageSources = await imageLocator.evaluateAll((images) =>
      images.map((image) => image.getAttribute("src") ?? ""),
    );

    assert(
      imageSources.every((src) => src.includes(`${layer}`)),
      `compact ${layer} asset image sources should reference ${layer}: ${JSON.stringify(imageSources)}`,
    );
  }
};

const assertCompactIncenseUsesAssetLayers = async (page) => {
  assert(
    (await page.locator('.compact-censer .incense-visual[data-incense-size="compact"]').count()) === 3,
    "compact ritual scene should render one compact incense visual for each censer",
  );
  assert(
    (await page.locator('.compact-censer [data-visual-slot^="incense/stage/"]').count()) === 0,
    "compact ritual scene should not expose stage incense visual slots",
  );

  for (const layer of compactIncenseAssetLayers) {
    const layerLocator = page.locator(`.compact-censer .incense-visual__${layer}.visual-layer--with-asset`);
    const imageLocator = layerLocator.locator("img.visual-layer__asset");

    assert(
      (await layerLocator.count()) === 6,
      `compact incense ${layer} layer should use image assets for the configured 3 / 2 / 1 sticks`,
    );
    assert(
      (await imageLocator.count()) === 6,
      `compact incense ${layer} layer should render six asset images`,
    );

    const imageSources = await imageLocator.evaluateAll((images) =>
      images.map((image) => image.getAttribute("src") ?? ""),
    );

    assert(
      imageSources.every((src) => src.includes(`${layer}`)),
      `compact incense ${layer} asset image sources should reference ${layer}: ${JSON.stringify(imageSources)}`,
    );
  }
};

const assertCompactIdleIncenseLayout = async (page) => {
  const incenseCounts = await page.locator(".compact-censer .incense-visual").evaluateAll((elements) =>
    elements.map((element) => Number(element.getAttribute("data-incense-count"))),
  );

  assert(
    JSON.stringify(incenseCounts) === JSON.stringify([3, 2, 1]),
    `compact ritual scene should preserve configured 3 / 2 / 1 incense counts: ${JSON.stringify(incenseCounts)}`,
  );
  assert(
    (await page.locator('.compact-censer .incense-visual__unit[data-incense-state="pending"]').count()) === 6,
    "idle compact ritual scene should keep all configured incense sticks pending",
  );
  const incensePointerEvents = await page
    .locator(".compact-censer .incense-visual")
    .first()
    .evaluate((element) => window.getComputedStyle(element).pointerEvents);
  assert(incensePointerEvents === "none", `compact incense should not intercept censer clicks: ${incensePointerEvents}`);
};

const assertCompactDragRegionSemantics = async (page) => {
  const dragRegion = page.locator(
    '.compact-stage__drag-region[data-compact-drag-action="move-window"][data-compact-drag-implementation="pointer-position-session"]',
  );

  assert((await dragRegion.count()) === 1, "compact ritual scene should expose one dedicated window drag region");
  assert(
    (await dragRegion.getAttribute("data-compact-drag-implementation")) === "pointer-position-session",
    "compact ritual scene should use the Tauri window-position drag session",
  );
  await assertVisible(dragRegion, "compact window drag region");
  await assertTransparentBackground(dragRegion, "compact window drag region");

  const layout = await page.locator(".compact-stage").evaluate((element) => {
    const dragRegion = element.querySelector(".compact-stage__drag-region");
    const buttons = [...element.querySelectorAll(".compact-censer__button")];
    const dragBox = dragRegion?.getBoundingClientRect();

    return {
      buttonTops: buttons.map((button) => Math.round(button.getBoundingClientRect().top)),
      dragBottom: dragBox ? Math.round(dragBox.bottom) : null,
      dragHeight: dragBox ? Math.round(dragBox.height) : 0,
      dragWidth: dragBox ? Math.round(dragBox.width) : 0,
    };
  });

  assert(layout.dragWidth >= 160, `compact drag region should be wide enough to grab reliably: ${JSON.stringify(layout)}`);
  assert(layout.dragHeight >= 28, `compact drag region should be tall enough to grab reliably: ${JSON.stringify(layout)}`);
  assert(
    layout.dragBottom !== null && layout.buttonTops.every((buttonTop) => layout.dragBottom <= buttonTop),
    `compact drag region should stay separate from censer click targets: ${JSON.stringify(layout)}`,
  );

  const stateBeforeDrag = await page.locator(".compact-censer").evaluateAll((elements) =>
    elements.map((element) => element.className).join(" | "),
  );
  await dragRegion.dispatchEvent("mousedown", { button: 0 });
  await page.waitForTimeout(50);
  const stateAfterDrag = await page.locator(".compact-censer").evaluateAll((elements) =>
    elements.map((element) => element.className).join(" | "),
  );

  assert(
    stateAfterDrag === stateBeforeDrag,
    `compact drag region should not change business state: before=${stateBeforeDrag} after=${stateAfterDrag}`,
  );
  assert(
    !(await page.getByRole("heading", { name: "确认开始这一套？" }).isVisible()),
    "compact drag region should not open the start confirmation",
  );
};

const assertCompactCenserDragClickSuppression = async (page) => {
  const censerButton = page.locator(".compact-censer__button").first();
  const buttonBox = await censerButton.boundingBox();

  assert(Boolean(buttonBox), "compact censer button should expose a measurable drag suppression target");
  assert(
    (await censerButton.getAttribute("data-compact-censer-drag-click-suppression")) === "6px-threshold",
    "compact censer button should expose its drag click suppression threshold",
  );
  assert(
    (await censerButton.getAttribute("data-compact-censer-drag-action")) === "move-window-after-threshold",
    "compact censer button should move the native window after the drag threshold",
  );

  const pointerStart = {
    x: Math.round(buttonBox.x + buttonBox.width / 2),
    y: Math.round(buttonBox.y + buttonBox.height / 2),
  };
  const stateBeforeDrag = await page.locator(".compact-censer").evaluateAll((elements) =>
    elements.map((element) => element.className).join(" | "),
  );
  const toastCountBeforeDrag = await page.locator(".toast").count();

  await censerButton.evaluate((element, start) => {
    const pointerInit = {
      bubbles: true,
      button: 0,
      cancelable: true,
      isPrimary: true,
      pointerId: 1,
      pointerType: "mouse",
    };

    element.dispatchEvent(
      new PointerEvent("pointerdown", {
        ...pointerInit,
        clientX: start.x,
        clientY: start.y,
        screenX: start.x,
        screenY: start.y,
      }),
    );
    element.dispatchEvent(
      new PointerEvent("pointermove", {
        ...pointerInit,
        clientX: start.x + 24,
        clientY: start.y,
        screenX: start.x + 24,
        screenY: start.y,
      }),
    );
    element.dispatchEvent(
      new PointerEvent("pointerup", {
        ...pointerInit,
        clientX: start.x + 24,
        clientY: start.y,
        screenX: start.x + 24,
        screenY: start.y,
      }),
    );
    element.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        button: 0,
        cancelable: true,
        clientX: start.x + 24,
        clientY: start.y,
      }),
    );
  }, pointerStart);
  await page.waitForTimeout(50);

  const stateAfterDrag = await page.locator(".compact-censer").evaluateAll((elements) =>
    elements.map((element) => element.className).join(" | "),
  );

  assert(
    stateAfterDrag === stateBeforeDrag,
    `dragging from a compact censer should not change business state: before=${stateBeforeDrag} after=${stateAfterDrag}`,
  );
  assert(
    (await page.locator(".toast").count()) === toastCountBeforeDrag,
    "dragging from a compact censer should suppress the full-window click attempt",
  );
  assert(
    !(await page.getByRole("heading", { name: "确认开始这一套？" }).isVisible()),
    "dragging from a compact censer should not open the start confirmation",
  );
};

const assertCompactBurningIncenseProgress = async (
  page,
  { currentIndex, expectedStates, requireProgress = false },
) => {
  const incenseLocator = page.locator(".compact-censer--burning .incense-visual");

  assert((await incenseLocator.count()) === 1, "compact ritual scene should expose one burning incense visual");
  assert(
    Number(await incenseLocator.getAttribute("data-incense-current")) === currentIndex,
    `compact burning incense should expose current index ${currentIndex}`,
  );

  const progress = Number(await incenseLocator.getAttribute("data-incense-progress"));
  const states = await incenseLocator.locator(".incense-visual__unit").evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-incense-state")),
  );

  assert(
    JSON.stringify(states) === JSON.stringify(expectedStates),
    `compact incense should burn from left to right: ${JSON.stringify(states)}`,
  );

  if (!requireProgress) {
    return;
  }

  assert(progress > 0 && progress < 100, `compact burning incense should expose in-flight progress: ${progress}`);

  const currentUnit = incenseLocator.locator(`.incense-visual__unit[data-incense-index="${currentIndex}"]`);
  const layerStyles = await currentUnit.evaluate((element) => {
    const ash = element.querySelector(".incense-visual__ash");
    const ember = element.querySelector(".incense-visual__ember");
    const smoke = element.querySelector(".incense-visual__smoke");

    return {
      ashHeight: ash ? Number.parseFloat(window.getComputedStyle(ash).height) : 0,
      emberOpacity: ember ? Number.parseFloat(window.getComputedStyle(ember).opacity) : 0,
      emberTop: ember ? Number.parseFloat(window.getComputedStyle(ember).top) : 0,
      smokeOpacity: smoke ? Number.parseFloat(window.getComputedStyle(smoke).opacity) : 0,
      smokeTop: smoke ? Number.parseFloat(window.getComputedStyle(smoke).top) : 0,
    };
  });

  assert(layerStyles.ashHeight > 0, `compact burning ash should grow with progress: ${JSON.stringify(layerStyles)}`);
  assert(layerStyles.emberOpacity > 0, `compact burning ember should be visible: ${JSON.stringify(layerStyles)}`);
  assert(layerStyles.emberTop > 0, `compact burning ember should move with progress: ${JSON.stringify(layerStyles)}`);
  assert(layerStyles.smokeOpacity > 0, `compact burning smoke should stay extremely weak but visible: ${JSON.stringify(layerStyles)}`);
  assert(layerStyles.smokeTop > 0, `compact burning smoke should follow the ember position: ${JSON.stringify(layerStyles)}`);
  assert(
    Math.abs(layerStyles.ashHeight - layerStyles.emberTop) < 1 && Math.abs(layerStyles.emberTop - layerStyles.smokeTop) < 1,
    `compact ash, ember, and smoke should advance together: ${JSON.stringify(layerStyles)}`,
  );
};

const assertCompactRestingIncense = async (page) => {
  const incenseLocator = page.locator(".compact-censer--resting .incense-visual");

  assert((await incenseLocator.count()) === 1, "compact ritual scene should expose one resting incense visual");
  assert(
    (await page.locator('.compact-censer--resting .censer-visual[data-censer-lid-state="open"]').count()) === 1,
    "resting compact censer should keep its lid open",
  );

  const states = await incenseLocator.locator(".incense-visual__unit").evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-incense-state")),
  );
  const visualStyles = await incenseLocator.evaluate((element) => {
    const restingUnit = element.querySelector('.incense-visual__unit[data-incense-state="resting"]');
    const ash = restingUnit?.querySelector(".incense-visual__ash");
    const ember = restingUnit?.querySelector(".incense-visual__ember");
    const smoke = restingUnit?.querySelector(".incense-visual__smoke");

    return {
      ashHeight: ash ? Number.parseFloat(window.getComputedStyle(ash).height) : 0,
      emberOpacity: ember ? Number.parseFloat(window.getComputedStyle(ember).opacity) : -1,
      incenseOpacity: Number.parseFloat(window.getComputedStyle(element).opacity),
      smokeOpacity: smoke ? Number.parseFloat(window.getComputedStyle(smoke).opacity) : -1,
    };
  });

  assert(
    JSON.stringify(states) === JSON.stringify(["resting", "pending", "pending"]),
    `resting compact incense should preserve the finished first stick: ${JSON.stringify(states)}`,
  );
  assert(
    (await incenseLocator.locator('.incense-visual__unit[data-incense-state="resting"]').getAttribute("data-incense-stick-progress")) ===
      "100",
    "resting compact incense should preserve the finished stick at 100% progress",
  );
  assert(visualStyles.ashHeight > 0, `resting compact incense should preserve full ash: ${JSON.stringify(visualStyles)}`);
  assert(visualStyles.emberOpacity === 0, `resting compact incense should hide ember: ${JSON.stringify(visualStyles)}`);
  assert(visualStyles.smokeOpacity === 0, `resting compact incense should hide smoke: ${JSON.stringify(visualStyles)}`);
  assert(
    visualStyles.incenseOpacity < 1,
    `resting compact incense should stay visually subdued: ${JSON.stringify(visualStyles)}`,
  );
};

const assertCompactCenserStateDifferentiation = async (page) => {
  assert(
    (await page.locator(".compact-censer--burning").count()) === 1,
    "compact ritual scene should show the active censer as burning",
  );
  assert(
    (await page.locator(".compact-censer--idle").count()) === 2,
    "compact ritual scene should keep inactive censers idle",
  );

  const visualStyles = await page.locator(".compact-censer").evaluateAll((elements) =>
    elements.map((element) => {
      const asset = element.querySelector(".censer-visual--compact > .censer-visual__asset");
      const style = asset ? window.getComputedStyle(asset) : null;

      return {
        className: element.className,
        filter: style?.filter ?? "",
        opacity: style?.opacity ?? "",
        transform: style?.transform ?? "",
      };
    }),
  );
  const burningStyle = visualStyles.find((style) => style.className.includes("compact-censer--burning"));
  const idleStyle = visualStyles.find((style) => style.className.includes("compact-censer--idle"));

  assert(Boolean(burningStyle), `compact visual styles should include a burning censer: ${JSON.stringify(visualStyles)}`);
  assert(Boolean(idleStyle), `compact visual styles should include an idle censer: ${JSON.stringify(visualStyles)}`);
  assert(
    Number.parseFloat(burningStyle.opacity) > Number.parseFloat(idleStyle.opacity),
    `active compact censer should be visually stronger than idle censers: ${JSON.stringify(visualStyles)}`,
  );
  assert(
    burningStyle.transform !== "none",
    `active compact censer should have a distinct non-layout transform: ${JSON.stringify(visualStyles)}`,
  );
  assert(
    burningStyle.filter !== idleStyle.filter,
    `active compact censer should use a distinct visual filter: ${JSON.stringify(visualStyles)}`,
  );
};

const createSingleIncenseRitual = async (page) => {
  await page.evaluate(() => {
    window.localStorage.clear();
    document.documentElement.dataset.windowMode = "full";
  });
  await page.reload({ waitUntil: "networkidle" });

  const situationInput = page.locator('textarea[placeholder="当我打开电脑坐到书桌前，就开始写今天的第一段文稿。"]');
  await situationInput.fill("当我打开电脑坐到书桌前，就开始写今天的第一段文稿。");
  await page.getByLabel("第 1 套香数").getByRole("button", { name: "1 炷" }).click();
  await page.getByRole("button", { name: "进入仪式台" }).click();
  await assertVisible(page.getByRole("heading", { name: "仪式台" }), "single incense full ritual title");
};

const assertCompactCompletionStaysOutOfReviewWhenFullOpenFails = async (page) => {
  await createSingleIncenseRitual(page);
  await page.locator(".stage-grid--full .talisman-visual--interactive").first().click();
  await assertVisible(page.getByRole("heading", { name: "确认开始这一套？" }), "single incense start confirmation");
  await page.getByRole("button", { name: "开始这一套" }).click();
  await assertVisible(
    page.locator('.stage-grid--full .intent-slot[data-stage-start-visual-state="burning"]').first(),
    "single incense start talisman burn animation state",
  );
  assert(
    (await page.locator(".stage-grid--full .timer-panel").count()) === 0,
    "single incense start animation should run before the focus timer panel appears",
  );
  await page.locator(".intent-slot--burning").first().waitFor({ state: "visible", timeout: 5000 });
  await assertVisible(page.locator(".intent-slot--burning").first(), "single incense burning intent");
  await page.evaluate(() => {
    document.documentElement.dataset.windowMode = "compact";
  });
  await assertVisible(page.locator(".compact-stage"), "compact stage during final incense");
  await page.locator(".compact-censer--completed").waitFor({ state: "visible", timeout: 15000 });

  assert(
    (await page.locator(".compact-censer--completed").count()) === 1,
    "compact final incense should end in completed censer state",
  );
  assert(
    (await page.locator('.compact-censer--completed .censer-visual[data-censer-lid-state="closed"]').count()) === 1,
    "completed compact censer should close its lid",
  );
  const completedIncenseOpacity = await page
    .locator(".compact-censer--completed .incense-visual")
    .first()
    .evaluate((element) => window.getComputedStyle(element).opacity);
  assert(completedIncenseOpacity === "0", `completed compact censer should hide incense: ${completedIncenseOpacity}`);
  assert(
    (await page.locator(".review-panel:visible").count()) === 0,
    "compact final incense should not auto-open review",
  );
  assert(
    (await page.locator(".compact-stage:visible").count()) === 1,
    "compact final incense should keep the compact stage visible",
  );

  const completedCenserLabel = await page.locator(".compact-censer__button").first().getAttribute("aria-label");
  assert(
    completedCenserLabel?.includes("点击展开完整窗口查看复盘入口"),
    `completed compact censer should point to the full-window review entry: ${completedCenserLabel}`,
  );

  await page.locator(".compact-censer__button").first().click();
  await page.waitForTimeout(50);

  assert(
    (await page.locator(".review-panel:visible").count()) === 0,
    "failed full-window open should not enter review",
  );
  assert(
    (await page.locator(".compact-censer--completed").count()) === 1,
    "failed full-window open should keep completed compact censer state",
  );
};

const run = async () => {
  await fetch(targetUrl, { method: "HEAD" }).catch(() => {
    throw new Error(`Cannot reach ${targetUrl}. Start the dev server with npm run dev first.`);
  });

  await mkdir("artifacts", { recursive: true });

  const viewport = await readCompactWindowSize();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport });

  try {
    await page.goto(targetUrl, { waitUntil: "networkidle" });
    await page.evaluate(() => window.localStorage.clear());
    await page.reload({ waitUntil: "networkidle" });

    await assertVisible(page.getByRole("heading", { name: "急急如律令" }), "app title");
    await assertVisible(page.getByRole("button", { name: "历史" }), "history button");
    await assertVisible(page.getByRole("button", { name: "设置" }), "settings button");
    await assertNoHorizontalOverflow(page, "setup");

    await page.getByRole("button", { name: "添加套组" }).click();
    await page.getByRole("button", { name: "添加套组" }).click();

    const situationInputs = page.locator('textarea[placeholder="当我打开电脑坐到书桌前，就开始写今天的第一段文稿。"]');
    await situationInputs.nth(0).fill("当我打开电脑坐到书桌前，就开始写今天的第一段文稿。");
    await situationInputs.nth(1).fill("当我打开编辑器，就整理今天最重要的一件事。");
    await situationInputs.nth(2).fill("当我完成第一轮专注，就记录下一步行动。");

    await page.getByLabel("第 1 套香数").getByRole("button", { name: "3 炷" }).click();
    await page.getByLabel("第 2 套香数").getByRole("button", { name: "2 炷" }).click();
    await page.getByLabel("第 3 套香数").getByRole("button", { name: "1 炷" }).click();
    await page.getByRole("button", { name: "进入仪式台" }).click();

    await assertVisible(page.getByRole("heading", { name: "仪式台" }), "full ritual title before compact mode");
    await assertVisible(page.locator(".stage-grid--full"), "full ritual stage before compact mode");
    await assertFullStageUsesStageVisuals(page);
    assert(
      (await page.locator(".intent-slot--idle").count()) === 3,
      "entering ritual should keep all intent slots idle",
    );
    assert(
      (await page.locator(".intent-slot--burning, .intent-slot--resting, .intent-slot--completed").count()) === 0,
      "entering ritual should not start, rest, or complete any intent slot",
    );
    assert(
      (await page.locator(".timer-panel").count()) === 0,
      "entering ritual should not show a timer panel before confirmation",
    );
    assert(
      (await page.locator(".review-panel").count()) === 0,
      "entering ritual should not enter review",
    );
    assert(
      (await page.getByRole("heading", { name: "确认开始这一套？" }).count()) === 0,
      "entering ritual should not open start confirmation",
    );
    const documentWindowModeBeforeCompact = await page.evaluate(() => document.documentElement.dataset.windowMode ?? "");
    assert(
      documentWindowModeBeforeCompact !== "compact",
      `entering ritual should not mark the document as compact: ${documentWindowModeBeforeCompact}`,
    );
    assert(
      !(await page.locator(".compact-stage").isVisible()),
      "manual narrow viewport should not enter compact ritual mode without explicit compact window mode",
    );

    await page.evaluate(() => {
      document.documentElement.dataset.windowMode = "compact";
    });

    await assertVisible(page.locator(".compact-stage"), "compact stage");
    await assertHidden(page.getByRole("heading", { name: "急急如律令" }), "app title in compact ritual scene");
    await assertHidden(page.getByRole("button", { name: "历史" }), "history button in compact ritual scene");
    await assertHidden(page.getByRole("button", { name: "设置" }), "settings button in compact ritual scene");
    await assertHidden(page.getByRole("heading", { name: "仪式台" }), "ritual title in compact ritual scene");
    await assertHidden(page.locator(".stage-grid--full"), "full ritual stage in compact window mode");
    assert(
      (await page.locator(".talisman-visual:visible").count()) === 0,
      "compact ritual scene should not show talismans",
    );
    assert(
      (await page.locator(".timer-panel:visible").count()) === 0,
      "compact ritual scene should not show timer panels",
    );
    assert(
      (await page.locator(".review-panel:visible").count()) === 0,
      "compact ritual scene should not show review",
    );
    assert((await page.locator(".compact-censer").count()) === 3, "compact stage should show three censer slots");
    await assertCompactCenserUsesAssetLayers(page);
    await assertCompactIncenseUsesAssetLayers(page);
    await assertCompactIdleIncenseLayout(page);
    await assertCompactDragRegionSemantics(page);
    await assertCompactCenserDragClickSuppression(page);
    assert((await page.locator(".compact-censer p:visible").count()) === 0, "compact ritual scene should hide intent summaries");
    assert((await page.locator(".compact-censer__status:visible").count()) === 0, "compact ritual scene should hide status labels");
    assert((await page.locator(".compact-censer__hint:visible").count()) === 0, "compact ritual scene should hide interaction hints");
    assert((await page.locator(".compact-censer strong:visible").count()) === 0, "compact ritual scene should hide timer text");
    const firstCompactCenserLabel = await page.locator(".compact-censer__button").first().getAttribute("aria-label");
    assert(
      (await page.locator('.compact-censer__button[data-compact-censer-click-action="open-full-window"]').count()) === 3,
      "compact censer buttons should only open the full window",
    );
    assert(
      firstCompactCenserLabel?.includes("点击展开完整窗口"),
      `compact censer should expand full window instead of starting directly: ${firstCompactCenserLabel}`,
    );
    await assertTransparentBackground(page.locator("html"), "compact ritual html");
    await assertTransparentBackground(page.locator("body"), "compact ritual body");
    await assertTransparentBackground(page.locator("#root"), "compact ritual root");
    await assertTransparentBackground(page.locator(".app-shell--ritual"), "compact ritual shell");
    await assertTransparentBackground(page.locator(".app-shell--ritual .app-main"), "compact ritual main");
    await assertTransparentBackground(page.locator(".ritual-panel"), "compact ritual panel");
    await assertTransparentBackground(page.locator(".compact-censer__button").first(), "compact ritual censer button");
    const ritualSceneStyle = await page.locator(".compact-stage").evaluate((element) => {
      const style = window.getComputedStyle(element);
      const censers = element.querySelector(".compact-stage__censers");
      const censersStyle = censers ? window.getComputedStyle(censers) : null;
      return {
        borderStyle: style.borderStyle,
        borderWidth: style.borderWidth,
        backgroundColor: style.backgroundColor,
        censerGap: Number.parseFloat(censersStyle?.columnGap ?? ""),
        censerFlexWrap: censersStyle?.flexWrap ?? "",
      };
    });
    assert(ritualSceneStyle.censerFlexWrap === "nowrap", "compact ritual censers should stay in a single row");
    assert(
      ritualSceneStyle.censerGap <= 8,
      `compact ritual censers should keep a restrained multi-censer gap: ${JSON.stringify(ritualSceneStyle)}`,
    );
    assert(
      ritualSceneStyle.backgroundColor === "rgba(0, 0, 0, 0)",
      `compact ritual scene should not draw a background: ${ritualSceneStyle.backgroundColor}`,
    );
    assert(
      ritualSceneStyle.borderStyle === "none" || ritualSceneStyle.borderWidth === "0px",
      `compact ritual scene should not draw a frame: ${JSON.stringify(ritualSceneStyle)}`,
    );
    const censerBoxes = await page.locator(".compact-censer").evaluateAll((elements) =>
      elements.map((element) => {
        const box = element.getBoundingClientRect();
        return { top: Math.round(box.top) };
      }),
    );
    const rowTops = new Set(censerBoxes.map((box) => box.top));
    assert(rowTops.size === 1, `compact ritual censers should be side by side: ${JSON.stringify(censerBoxes)}`);
    const idleCenserOpacities = await page
      .locator(".compact-censer--idle .censer-visual--compact .censer-visual__asset")
      .evaluateAll((elements) => elements.map((element) => Number.parseFloat(window.getComputedStyle(element).opacity)));
    assert(
      idleCenserOpacities.every((opacity) => opacity >= 0.84),
      `compact idle censers should avoid excessive transparency: ${JSON.stringify(idleCenserOpacities)}`,
    );
    const stateBeforeCompactClick = await page.locator(".compact-censer").evaluateAll((elements) =>
      elements.map((element) => element.className).join(" | "),
    );
    await page.locator(".compact-censer__button").first().click();
    await page.waitForTimeout(50);
    assert(
      !(await page.getByRole("heading", { name: "确认开始这一套？" }).isVisible()),
      "compact censer click should not open the start confirmation",
    );
    assert(
      (await page.locator(".compact-censer--burning, .compact-censer--resting").count()) === 0,
      "compact censer click should not start or continue a timer",
    );
    assert(
      (await page.locator(".review-panel:visible").count()) === 0,
      "compact censer click should not open review in an unfinished session",
    );
    const stateAfterCompactClick = await page.locator(".compact-censer").evaluateAll((elements) =>
      elements.map((element) => element.className).join(" | "),
    );
    assert(
      stateAfterCompactClick === stateBeforeCompactClick,
      `compact censer click should not change business state: before=${stateBeforeCompactClick} after=${stateAfterCompactClick}`,
    );

    await page.evaluate(() => {
      document.documentElement.dataset.windowMode = "full";
    });
    await assertVisible(page.locator(".stage-grid--full"), "full ritual stage before starting an intent");
    await page.locator(".stage-grid--full .talisman-visual--interactive").first().click();
    await assertVisible(page.getByRole("heading", { name: "确认开始这一套？" }), "start confirmation before compact active state");
    await page.getByRole("button", { name: "开始这一套" }).click();
    await assertVisible(
      page.locator('.stage-grid--full .intent-slot[data-stage-start-visual-state="burning"]').first(),
      "start talisman burn animation state before compact active state",
    );
    assert(
      (await page.locator(".stage-grid--full .timer-panel").count()) === 0,
      "start talisman burn animation should complete before the focus timer appears",
    );
    await page.locator(".intent-slot--burning").first().waitFor({ state: "visible", timeout: 5000 });
    await assertVisible(page.locator(".intent-slot--burning").first(), "burning intent in full ritual stage");
    assert(
      (await page.locator('.stage-grid--full .intent-slot--burning[data-stage-situation-visibility="dismissed"]').count()) === 1,
      "burning full-stage intent should dismiss its situation talisman",
    );
    assert(
      (await page.locator('.stage-grid--full .intent-slot--burning[data-stage-prevention-visibility="visible"]').count()) === 1,
      "burning full-stage intent should keep prevention talismans visible",
    );
    assert(
      (await page.locator('.stage-grid--full .intent-slot--burning[data-stage-censer-emphasis="normal"]').count()) === 1,
      "burning full-stage intent should keep its censer at normal emphasis",
    );
    await page.evaluate(() => {
      document.documentElement.dataset.windowMode = "compact";
    });
    await assertCompactCenserStateDifferentiation(page);
    await page.waitForTimeout(3200);
    await assertCompactBurningIncenseProgress(page, {
      currentIndex: 1,
      expectedStates: ["burning", "pending", "pending"],
      requireProgress: true,
    });
    await page.screenshot({ fullPage: true, path: burningScreenshotPath });
    await page.getByRole("heading", { name: "这一炷香已经烧完。" }).waitFor({ state: "visible", timeout: 10000 });
    await page.getByRole("button", { name: "休息 5 分钟" }).click();
    await page.locator(".compact-censer--resting").waitFor({ state: "visible", timeout: 1000 });
    await page.waitForTimeout(180);
    await assertCompactRestingIncense(page);
    await page.screenshot({ fullPage: true, path: restingScreenshotPath });
    await page.getByRole("heading", { name: "休息结束，是否继续下一炷香？" }).waitFor({
      state: "visible",
      timeout: 7000,
    });
    await page.getByRole("button", { name: "开始下一炷香" }).click();
    await page.locator(".compact-censer--burning").waitFor({ state: "visible", timeout: 1000 });
    await assertCompactBurningIncenseProgress(page, {
      currentIndex: 2,
      expectedStates: ["burned", "burning", "pending"],
    });
    assert(
      (await page.locator(".compact-censer__status:visible").count()) === 0,
      "compact active state should still hide status labels",
    );
    assert(
      (await page.locator(".compact-censer strong:visible").count()) === 0,
      "compact active state should still hide timer text",
    );

    await assertCompactCompletionStaysOutOfReviewWhenFullOpenFails(page);
    await assertNoHorizontalOverflow(page, "ritual");

    await page.screenshot({ fullPage: true, path: screenshotPath });
    console.log(`Compact window check passed. Screenshot: ${screenshotPath}`);
  } finally {
    await browser.close();
  }
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
