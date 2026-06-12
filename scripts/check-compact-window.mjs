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
    (await page.locator('.stage-grid--full .intent-slot[data-stage-hover-card="metadata"]').count()) === 3,
    "idle full ritual stage should route censer hover to metadata cards",
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
    (await page.locator('.stage-grid--full .censer-visual__hover-target[data-censer-hover-action="show-metadata"]').count()) === 3,
    "idle full ritual stage should mark censer hover targets as metadata-only",
  );
  assert(
    (await page.locator('.stage-grid--full .talisman-visual--situation[data-talisman-click-action="start-confirm"]').count()) === 3,
    "full ritual stage should make idle situation talismans the only start-confirm click targets",
  );
  assert(
    (await page.locator('.stage-grid--full .talisman-visual--prevention[data-talisman-click-action="none"]').count()) === 1,
    "full ritual stage should render configured prevention talismans as view-only",
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

  const finishedSmokeStyles = await incenseLocator
    .locator(
      '.incense-visual__unit[data-incense-state="burned"] .incense-visual__smoke, .incense-visual__unit[data-incense-state="resting"] .incense-visual__smoke',
    )
    .evaluateAll((elements) =>
      elements.map((element) => ({
        animationName: window.getComputedStyle(element).animationName,
        opacity: Number.parseFloat(window.getComputedStyle(element).opacity),
      })),
    );
  assert(
    finishedSmokeStyles.every((style) => style.opacity === 0 && style.animationName === "none"),
    `compact finished incense sticks should not keep white smoke: ${JSON.stringify(finishedSmokeStyles)}`,
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
      ashTop: ash ? Number.parseFloat(window.getComputedStyle(ash).top) : 0,
      emberOpacity: ember ? Number.parseFloat(window.getComputedStyle(ember).opacity) : 0,
      emberTop: ember ? Number.parseFloat(window.getComputedStyle(ember).top) : 0,
      smokeAnimationName: smoke ? window.getComputedStyle(smoke).animationName : "",
      smokeOpacity: smoke ? Number.parseFloat(window.getComputedStyle(smoke).opacity) : 0,
      smokeTop: smoke ? Number.parseFloat(window.getComputedStyle(smoke).top) : 0,
    };
  });

  assert(layerStyles.ashHeight > 0, `compact burning ash should be visible: ${JSON.stringify(layerStyles)}`);
  assert(layerStyles.ashHeight <= 9, `compact burning ash should stay as a short cap: ${JSON.stringify(layerStyles)}`);
  assert(layerStyles.emberOpacity > 0, `compact burning ember should be visible: ${JSON.stringify(layerStyles)}`);
  assert(layerStyles.emberTop > 0, `compact burning ember should move with progress: ${JSON.stringify(layerStyles)}`);
  assert(layerStyles.smokeOpacity > 0.2, `compact burning smoke should stay restrained but visible: ${JSON.stringify(layerStyles)}`);
  assert(
    layerStyles.smokeAnimationName.includes("compact-incense-smoke-drift"),
    `compact burning smoke should use the restrained compact drift animation: ${JSON.stringify(layerStyles)}`,
  );
  assert(layerStyles.smokeTop > 0, `compact burning smoke should follow the ember position: ${JSON.stringify(layerStyles)}`);
  assert(
    Math.abs(layerStyles.ashTop + layerStyles.ashHeight - layerStyles.emberTop) < 1 &&
      Math.abs(layerStyles.emberTop - layerStyles.smokeTop) < 1,
    `compact ash cap, ember, and smoke should advance together: ${JSON.stringify(layerStyles)}`,
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
      ashTop: ash ? Number.parseFloat(window.getComputedStyle(ash).top) : 0,
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
  assert(
    visualStyles.ashHeight > 0 && visualStyles.ashHeight <= 7 && visualStyles.ashTop > 0,
    `resting compact incense should preserve only a short ash cap: ${JSON.stringify(visualStyles)}`,
  );
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

const assertCompactRemainingTooltip = async (page) => {
  const activeCenser = page.locator(".compact-censer--burning").first();
  const activeButton = activeCenser.locator(".compact-censer__button");
  const remainingTooltip = activeCenser.locator(".compact-censer__remaining");

  assert((await remainingTooltip.count()) === 1, "compact burning censer should expose one remaining-time tooltip");
  assert(
    (await page.locator(".compact-censer__remaining:visible").count()) === 0,
    "compact remaining time should not be visible before hover or focus",
  );

  const remainingText = (await remainingTooltip.textContent())?.trim() ?? "";
  assert(
    /^\d{2}:\d{2}$/.test(remainingText),
    `compact remaining tooltip should contain formatted remaining time: ${remainingText}`,
  );

  await activeButton.hover();
  await page.waitForTimeout(180);
  await assertVisible(remainingTooltip, "compact remaining time on censer hover");
  await page.mouse.move(1, 1);
  await page.waitForTimeout(180);
  assert(
    (await page.locator(".compact-censer__remaining:visible").count()) === 0,
    "compact remaining time should hide after leaving the censer",
  );

  await activeButton.focus();
  await page.waitForTimeout(180);
  await assertVisible(remainingTooltip, "compact remaining time on censer focus");
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
  await page.waitForTimeout(180);
  assert(
    (await page.locator(".compact-censer__remaining:visible").count()) === 0,
    "compact remaining time should hide after censer focus leaves",
  );
};

const clearFullStageTalismanPreview = async (page) => {
  await page.locator(".stage-grid--full .talisman-visual").evaluateAll((elements) => {
    for (const element of elements) {
      element.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
      element.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));

      if (element instanceof HTMLElement) {
        element.blur();
      }
    }
  });
  await page.waitForTimeout(120);
};

const assertFullStageIdleCenserHoverUsesMetadataCard = async (page) => {
  const idleSlot = page.locator(".stage-grid--full .intent-slot--idle").first();
  const hoverTarget = idleSlot.locator(".censer-visual__hover-target");

  assert(
    (await idleSlot.getAttribute("data-stage-hover-card")) === "metadata",
    "idle full-stage intent should route censer hover to the metadata card",
  );
  assert(
    (await hoverTarget.getAttribute("data-censer-hover-action")) === "show-metadata",
    "idle full-stage censer hover target should expose metadata action semantics",
  );

  await hoverTarget.hover();
  await page.waitForTimeout(220);

  const cardStyles = await idleSlot.evaluate((element) => {
    const metadata = element.querySelector(".censer-visual__metadata");
    const timerPanel = element.querySelector(".timer-panel");

    return {
      metadataOpacity: metadata ? Number.parseFloat(window.getComputedStyle(metadata).opacity) : -1,
      timerPanelExists: Boolean(timerPanel),
    };
  });

  assert(
    cardStyles.metadataOpacity > 0.8,
    `idle full-stage censer hover should reveal the metadata card: ${JSON.stringify(cardStyles)}`,
  );
  assert(!cardStyles.timerPanelExists, "idle full-stage censer hover should not reveal a timer card");

  await page.mouse.move(1, 1);
  await page.waitForTimeout(120);
};

const readTalismanPreviewMetrics = async (locator) =>
  locator.evaluate((element) => {
    const style = window.getComputedStyle(element);
    const matrix = style.transform === "none" ? new DOMMatrixReadOnly() : new DOMMatrixReadOnly(style.transform);
    const box = element.getBoundingClientRect();
    const slot = element.closest(".intent-slot");
    const metadata = slot?.querySelector(".censer-visual__metadata");
    const timerPanel = slot?.querySelector(".timer-panel");

    return {
      height: Math.round(box.height),
      metadataActive: slot?.getAttribute("data-stage-metadata-active") ?? "",
      metadataOpacity: metadata ? Number.parseFloat(window.getComputedStyle(metadata).opacity) : -1,
      scaleX: Math.hypot(matrix.a, matrix.b),
      scaleY: Math.hypot(matrix.c, matrix.d),
      timerOpacity: timerPanel ? Number.parseFloat(window.getComputedStyle(timerPanel).opacity) : -1,
      width: Math.round(box.width),
      zIndex: Number.parseInt(style.zIndex, 10),
    };
  });

const assertFullStageTalismanPreviewReadability = async (page) => {
  const firstSlot = page.locator(".stage-grid--full .intent-slot--idle").first();
  const situationTalisman = firstSlot.locator(".talisman-visual--situation");
  const preventionTalisman = firstSlot.locator(".talisman-visual--prevention").first();

  assert((await preventionTalisman.count()) === 1, "full-stage readability check needs one prevention talisman");

  await situationTalisman.hover();
  await page.waitForTimeout(220);

  const situationMetrics = await readTalismanPreviewMetrics(situationTalisman);
  assert(
    situationMetrics.scaleX >= 3 && situationMetrics.scaleY >= 3 && situationMetrics.height >= 300,
    `situation talisman hover should enlarge enough for reading: ${JSON.stringify(situationMetrics)}`,
  );
  assert(
    situationMetrics.metadataActive === "false" && situationMetrics.metadataOpacity === 0,
    `situation talisman hover should not reveal censer metadata: ${JSON.stringify(situationMetrics)}`,
  );
  assert(
    situationMetrics.timerOpacity <= 0,
    `situation talisman hover should not reveal a timer card: ${JSON.stringify(situationMetrics)}`,
  );
  assert(situationMetrics.zIndex >= 28, `situation talisman preview should float above altar visuals: ${JSON.stringify(situationMetrics)}`);

  await page.mouse.move(1, 1);
  await page.waitForTimeout(120);
  await preventionTalisman.hover();
  await page.waitForTimeout(220);

  const preventionMetrics = await readTalismanPreviewMetrics(preventionTalisman);
  assert(
    preventionMetrics.scaleX >= 3.1 && preventionMetrics.scaleY >= 3.1 && preventionMetrics.height >= 240,
    `prevention talisman hover should enlarge enough for reading: ${JSON.stringify(preventionMetrics)}`,
  );
  assert(
    preventionMetrics.metadataActive === "false" && preventionMetrics.metadataOpacity === 0,
    `prevention talisman hover should not reveal censer metadata: ${JSON.stringify(preventionMetrics)}`,
  );
  assert(
    preventionMetrics.timerOpacity <= 0,
    `prevention talisman hover should not reveal a timer card: ${JSON.stringify(preventionMetrics)}`,
  );
  assert(preventionMetrics.zIndex >= 28, `prevention talisman preview should float above altar visuals: ${JSON.stringify(preventionMetrics)}`);

  await page.mouse.move(1, 1);
  await page.waitForTimeout(120);
  await clearFullStageTalismanPreview(page);
};

const assertFullStageActiveCenserHoverUsesSingleCard = async (page) => {
  const burningSlot = page.locator(".stage-grid--full .intent-slot--burning").first();
  const hoverTarget = burningSlot.locator(".censer-visual__hover-target");

  await clearFullStageTalismanPreview(page);

  assert(
    (await burningSlot.getAttribute("data-stage-hover-card")) === "timer",
    "active full-stage intent should route censer hover to the timer card",
  );
  assert(
    (await hoverTarget.getAttribute("data-censer-hover-action")) === "show-timer",
    "active full-stage censer hover target should expose timer action semantics",
  );

  await hoverTarget.hover();
  await page.waitForTimeout(220);

  const cardStyles = await burningSlot.evaluate((element) => {
    const metadata = element.querySelector(".censer-visual__metadata");
    const timerPanel = element.querySelector(".timer-panel");

    return {
      metadataOpacity: metadata ? Number.parseFloat(window.getComputedStyle(metadata).opacity) : -1,
      timerOpacity: timerPanel ? Number.parseFloat(window.getComputedStyle(timerPanel).opacity) : -1,
    };
  });

  assert(
    cardStyles.timerOpacity > 0.8,
    `active full-stage censer hover should reveal the remaining-time timer card: ${JSON.stringify(cardStyles)}`,
  );
  assert(
    cardStyles.metadataOpacity === 0,
    `active full-stage censer hover should suppress duplicate metadata: ${JSON.stringify(cardStyles)}`,
  );

  await page.mouse.move(1, 1);
};

const assertFullStageSmokeSuppressed = async (page) => {
  const burningSlot = page.locator(".stage-grid--full .intent-slot--burning").first();
  const smokeStyles = await burningSlot.evaluate((element) => {
    const currentUnit = element.querySelector('.incense-visual--stage .incense-visual__unit[data-incense-state="burning"]');
    const smoke = currentUnit?.querySelector(".incense-visual__smoke");
    const nearWisp = currentUnit?.querySelector('.incense-visual__smoke-wisp[data-incense-smoke-layer="near"]');
    const farWisp = currentUnit?.querySelector('.incense-visual__smoke-wisp[data-incense-smoke-layer="far"]');

    return {
      farWispAnimationName: farWisp ? window.getComputedStyle(farWisp).animationName : "",
      farWispDisplay: farWisp ? window.getComputedStyle(farWisp).display : "",
      farWispOpacity: farWisp ? Number.parseFloat(window.getComputedStyle(farWisp).opacity) : 0,
      nearWispAnimationName: nearWisp ? window.getComputedStyle(nearWisp).animationName : "",
      nearWispDisplay: nearWisp ? window.getComputedStyle(nearWisp).display : "",
      nearWispOpacity: nearWisp ? Number.parseFloat(window.getComputedStyle(nearWisp).opacity) : 0,
      smokeAnimationName: smoke ? window.getComputedStyle(smoke).animationName : "",
      smokeDisplay: smoke ? window.getComputedStyle(smoke).display : "",
      smokeOpacity: smoke ? Number.parseFloat(window.getComputedStyle(smoke).opacity) : 0,
    };
  });

  assert(
    smokeStyles.smokeDisplay === "none" && smokeStyles.smokeOpacity === 0 && smokeStyles.smokeAnimationName === "none",
    `full-stage burning smoke should be completely suppressed on the main altar: ${JSON.stringify(smokeStyles)}`,
  );
  assert(
    smokeStyles.nearWispDisplay === "none" &&
      smokeStyles.nearWispOpacity === 0 &&
      smokeStyles.nearWispAnimationName === "none" &&
      smokeStyles.farWispDisplay === "none" &&
      smokeStyles.farWispOpacity === 0 &&
      smokeStyles.farWispAnimationName === "none",
    `full-stage burning smoke wisps should be completely suppressed on the main altar: ${JSON.stringify(smokeStyles)}`,
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
  await page.getByLabel("第 1 项任务香数").getByRole("button", { name: "1 炷" }).click();
  await page.getByRole("button", { name: "开始创造" }).click();
  await assertVisible(page.getByRole("heading", { name: "仪式台" }), "single incense full ritual title");
};

const assertTalismanFlameStructure = async (page, expectedTalismanCount) => {
  const flameLayers = page.locator('.stage-grid--full [data-talisman-burn-layer="flames"]');

  assert(
    (await flameLayers.count()) === expectedTalismanCount,
    `full-stage situation talismans should expose one flames layer each: expected=${expectedTalismanCount}`,
  );
  assert(
    (await flameLayers.locator(":scope > span").count()) === expectedTalismanCount * 4,
    "each full-stage situation talisman should expose four restrained flame shapes",
  );
};

const readTalismanFlameFrame = async (slot) =>
  slot.locator('[data-talisman-burn-layer="flames"]').evaluate((layer) => {
    const talisman = layer.closest(".talisman-visual--situation");
    const talismanBox = talisman?.getBoundingClientRect();
    const textBoxes = [...(talisman?.querySelectorAll(".talisman-visual__column") ?? [])].map((column) =>
      column.getBoundingClientRect(),
    );

    const flames = [...layer.children].map((flame, index) => {
      const style = window.getComputedStyle(flame);
      const box = flame.getBoundingClientRect();
      const overlapArea = textBoxes.reduce((total, textBox) => {
        const width = Math.max(0, Math.min(box.right, textBox.right) - Math.max(box.left, textBox.left));
        const height = Math.max(0, Math.min(box.bottom, textBox.bottom) - Math.max(box.top, textBox.top));
        return total + width * height;
      }, 0);
      const area = Math.max(1, box.width * box.height);

      return {
        animationName: style.animationName,
        clipPath: style.clipPath,
        index,
        insideTalisman:
          Boolean(talismanBox) &&
          box.left >= talismanBox.left - 1 &&
          box.right <= talismanBox.right + 1 &&
          box.top >= talismanBox.top - 1 &&
          box.bottom <= talismanBox.bottom + 1,
        opacity: Number.parseFloat(style.opacity),
        textOverlapRatio: overlapArea / area,
        transform: style.transform,
      };
    });

    const layerStyle = window.getComputedStyle(layer);
    return {
      flames,
      layerAnimationName: layerStyle.animationName,
      layerBackgroundImage: layerStyle.backgroundImage,
      layerOpacity: Number.parseFloat(layerStyle.opacity),
    };
  });

const assertAnimatedTalismanFlameFrame = (frame, label) => {
  const activeFlames = frame.flames.filter((flame) => flame.opacity > 0.08);

  assert(frame.layerOpacity > 0.9, `${label} flames layer should be visible: ${JSON.stringify(frame)}`);
  assert(activeFlames.length >= 1, `${label} should show at least one distinct flame: ${JSON.stringify(frame)}`);
  assert(
    frame.flames.every((flame) => flame.animationName === "situation-talisman-flame-flicker"),
    `${label} should use the short flame flicker animation: ${JSON.stringify(frame)}`,
  );
  assert(
    frame.flames.every((flame) => flame.clipPath.startsWith("polygon(")),
    `${label} flames should keep pointed polygon silhouettes: ${JSON.stringify(frame)}`,
  );
  assert(
    activeFlames.every((flame) => flame.insideTalisman),
    `${label} active flames should stay clipped inside the situation talisman: ${JSON.stringify(frame)}`,
  );
  assert(
    activeFlames.every((flame) => flame.textOverlapRatio < 0.6),
    `${label} active flames should not cover most of an intent text column: ${JSON.stringify(frame)}`,
  );

  return activeFlames.map((flame) => flame.index);
};

const startFirstIntentAndAssertTalismanFlames = async (page) => {
  await page.locator(".stage-grid--full .talisman-visual--interactive").first().click();
  await assertVisible(page.getByRole("heading", { name: "确认开始这一套？" }), "start confirmation before flame checks");
  await page.getByRole("button", { name: "开始这一套" }).click();

  const startSlot = page.locator(".stage-grid--full .intent-slot").first();
  await page.waitForFunction(
    () => document.querySelector(".stage-grid--full .intent-slot")?.getAttribute("data-stage-start-visual-state") === "burning",
  );
  await assertVisible(startSlot, "start talisman burn animation state with flames");
  assert(
    (await page.locator(".stage-grid--full .timer-panel").count()) === 0,
    "talisman flames should finish before the focus timer appears",
  );

  await page.waitForTimeout(170);
  const earlyActiveIndexes = assertAnimatedTalismanFlameFrame(
    await readTalismanFlameFrame(startSlot),
    "early talisman burn",
  );
  await page.waitForTimeout(760);
  const middleActiveIndexes = assertAnimatedTalismanFlameFrame(
    await readTalismanFlameFrame(startSlot),
    "middle talisman burn",
  );
  assert(
    JSON.stringify(earlyActiveIndexes) !== JSON.stringify(middleActiveIndexes),
    `talisman flames should advance in staggered positions: early=${JSON.stringify(earlyActiveIndexes)} middle=${JSON.stringify(middleActiveIndexes)}`,
  );

  return startSlot;
};

const assertTalismanFlamesDismissed = async (startSlot) => {
  const dismissedFrame = await readTalismanFlameFrame(startSlot);
  const talismanOpacity = await startSlot
    .locator(".talisman-visual--situation")
    .evaluate((element) => Number.parseFloat(window.getComputedStyle(element).opacity));

  assert(dismissedFrame.layerOpacity === 0, `flames layer should disappear after the burn: ${JSON.stringify(dismissedFrame)}`);
  assert(talismanOpacity === 0, `situation talisman should remain dismissed after the burn: ${talismanOpacity}`);
};

const assertReducedMotionTalismanFlames = async (page) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await createSingleIncenseRitual(page);
  await assertTalismanFlameStructure(page, 1);

  await page.locator(".stage-grid--full .talisman-visual--interactive").click();
  await page.getByRole("button", { name: "开始这一套" }).click();
  const startSlot = page.locator(".stage-grid--full .intent-slot");
  await page.waitForFunction(
    () => document.querySelector(".stage-grid--full .intent-slot")?.getAttribute("data-stage-start-visual-state") === "burning",
  );
  await assertVisible(startSlot, "reduced-motion talisman burn state");

  const reducedFrame = await readTalismanFlameFrame(startSlot);
  assert(
    reducedFrame.layerAnimationName === "situation-talisman-reduced-flame-glow" &&
      reducedFrame.layerBackgroundImage.includes("radial-gradient"),
    `reduced-motion burn should use a short static warm glow: ${JSON.stringify(reducedFrame)}`,
  );
  assert(
    reducedFrame.flames.every(
      (flame) => flame.animationName === "none" && flame.opacity === 0 && flame.transform === "none",
    ),
    `reduced-motion burn should cancel flame sway and travel: ${JSON.stringify(reducedFrame)}`,
  );

  await page.waitForTimeout(320);
  const fadedFrame = await readTalismanFlameFrame(startSlot);
  assert(fadedFrame.layerOpacity === 0, `reduced-motion warm glow should fade quickly: ${JSON.stringify(fadedFrame)}`);
  await page.locator(".intent-slot--burning").waitFor({ state: "visible", timeout: 5000 });
  await assertTalismanFlamesDismissed(startSlot);

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
};

const readPersistenceState = async (page) =>
  page.evaluate(() => {
    const history = JSON.parse(window.localStorage.getItem("jiji-rululing.history") ?? "[]");
    const rawSession = window.localStorage.getItem("jiji-rululing.current-session");
    const currentSession = rawSession ? JSON.parse(rawSession) : null;

    return {
      currentSessionIntentCount: Array.isArray(currentSession?.intentSets) ? currentSession.intentSets.length : 0,
      currentSessionPhase: currentSession?.phase ?? null,
      currentSessionStatus: currentSession?.intentSets?.[0]?.status ?? null,
      historyCount: Array.isArray(history) ? history.length : -1,
    };
  });

const openAbandonDialog = async (page, sourceLabel) => {
  await page.getByRole("button", { name: "放弃本轮" }).click();
  const dialog = page.getByRole("dialog", { name: "确定要放弃本轮吗？" });
  await assertVisible(dialog, `${sourceLabel} abandon confirmation`);
  await assertVisible(dialog.getByText("当前仪式进度和未保存复盘不会写入历史记录"), `${sourceLabel} abandon warning copy`);
  return dialog;
};

const assertRitualAbandonProtection = async (page) => {
  await createSingleIncenseRitual(page);
  await page.waitForFunction(() => window.localStorage.getItem("jiji-rululing.current-session") !== null);

  let dialog = await openAbandonDialog(page, "ritual");
  await dialog.getByRole("button", { name: "继续当前轮次" }).click();
  await assertVisible(page.getByRole("heading", { name: "仪式台" }), "ritual after cancelling abandon");
  assert(
    (await page.getByRole("dialog", { name: "确定要放弃本轮吗？" }).count()) === 0,
    "cancelling ritual abandon should close the confirmation dialog",
  );

  const cancelledState = await readPersistenceState(page);
  assert(
    cancelledState.currentSessionPhase === "ritual" &&
      cancelledState.currentSessionIntentCount === 1 &&
      cancelledState.historyCount === 0,
    `cancelling ritual abandon should keep the unsaved session and avoid history writes: ${JSON.stringify(cancelledState)}`,
  );

  dialog = await openAbandonDialog(page, "ritual");
  await dialog.getByRole("button", { name: "放弃本轮" }).click();
  await assertVisible(page.getByRole("heading", { name: "急急如律令" }), "setup after confirming ritual abandon");

  const abandonedState = await readPersistenceState(page);
  assert(
    abandonedState.currentSessionPhase === null && abandonedState.historyCount === 0,
    `confirming ritual abandon should clear the current session without writing history: ${JSON.stringify(abandonedState)}`,
  );
};

const restoreCompletedRitualFixture = async (page) => {
  await page.evaluate(() => {
    window.localStorage.clear();
    document.documentElement.dataset.windowMode = "full";
    window.localStorage.setItem(
      "jiji-rululing.current-session",
      JSON.stringify({
        activeModal: null,
        activeTimerSegment: null,
        intentSets: [
          {
            currentIncenseIndex: 1,
            id: "completed-fixture-intent",
            incenseCount: 1,
            preventionIntents: ["如果我想跳过复盘，那么我先写一句最小记录。"],
            situationIntent: "当我完成一轮专注，就进入复盘记录。",
            status: "completed",
          },
        ],
        phase: "ritual",
        timerMode: "dev",
        timerRemaining: 0,
        updatedAt: "2026-06-08T00:00:00.000Z",
        version: 1,
      }),
    );
  });
  await page.reload({ waitUntil: "networkidle" });
  await assertVisible(page.getByRole("heading", { name: "发现未保存的本轮仪式" }), "completed ritual restore prompt");
  await page.getByRole("button", { name: "恢复本轮" }).click();
  await assertVisible(page.getByRole("heading", { name: "本轮香尽" }), "restored completed ritual summary");
};

const assertReviewAbandonProtection = async (page) => {
  await restoreCompletedRitualFixture(page);
  await page.getByRole("button", { name: "进入复盘", exact: true }).click();
  await assertVisible(page.getByRole("heading", { name: "本次复盘" }), "review before abandon protection");
  await page.waitForFunction(() => {
    const rawSession = window.localStorage.getItem("jiji-rululing.current-session");
    return rawSession ? JSON.parse(rawSession).phase === "review" : false;
  });
  await page.getByLabel("一句复盘").fill("这句复盘应该在取消放弃后保留。");

  let dialog = await openAbandonDialog(page, "review");
  await dialog.getByRole("button", { name: "继续当前轮次" }).click();
  await assertVisible(page.getByRole("heading", { name: "本次复盘" }), "review after cancelling abandon");
  assert(
    (await page.getByLabel("一句复盘").inputValue()) === "这句复盘应该在取消放弃后保留。",
    "cancelling review abandon should keep in-progress review text",
  );

  const cancelledState = await readPersistenceState(page);
  assert(
    cancelledState.currentSessionPhase === "review" &&
      cancelledState.currentSessionStatus === "completed" &&
      cancelledState.historyCount === 0,
    `cancelling review abandon should keep the review session and avoid history writes: ${JSON.stringify(cancelledState)}`,
  );

  dialog = await openAbandonDialog(page, "review");
  await dialog.getByRole("button", { name: "放弃本轮" }).click();
  await assertVisible(page.getByRole("heading", { name: "急急如律令" }), "setup after confirming review abandon");

  const abandonedState = await readPersistenceState(page);
  assert(
    abandonedState.currentSessionPhase === null && abandonedState.historyCount === 0,
    `confirming review abandon should clear the current session without writing history: ${JSON.stringify(abandonedState)}`,
  );
};

const assertAbandonSessionProtection = async (page) => {
  await assertRitualAbandonProtection(page);
  await assertReviewAbandonProtection(page);
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

const assertCompletedSessionReviewSavePersistsHistory = async (page) => {
  const reviewText = "Compact automated review persisted";

  await page.evaluate(() => {
    document.documentElement.dataset.windowMode = "full";
  });
  await assertVisible(page.getByRole("heading", { name: "本轮香尽" }), "completed full ritual summary");
  await assertVisible(page.getByRole("button", { name: "进入复盘", exact: true }), "full ritual review entry");
  assert(
    (await page.locator(".review-panel:visible").count()) === 0,
    "completed full ritual should still wait for the explicit review entry",
  );

  await page.getByRole("button", { name: "进入复盘", exact: true }).click();
  await assertVisible(page.getByRole("heading", { name: "本次复盘" }), "review panel after explicit entry");
  await page.getByLabel("一句复盘").fill(reviewText);
  await page.getByRole("button", { name: "保存复盘" }).click();
  await assertVisible(page.getByRole("heading", { name: "急急如律令" }), "setup title after saving review");
  await assertVisible(page.getByText("复盘已保存。"), "review saved toast");

  const savedStorageState = await page.evaluate(() => {
    const history = JSON.parse(window.localStorage.getItem("jiji-rululing.history") ?? "[]");

    return {
      currentSession: window.localStorage.getItem("jiji-rululing.current-session"),
      historyCount: Array.isArray(history) ? history.length : -1,
      latestReviewText: Array.isArray(history) ? history[0]?.reviewText ?? "" : "",
    };
  });
  assert(
    savedStorageState.currentSession === null,
    `saving review should clear the current session: ${JSON.stringify(savedStorageState)}`,
  );
  assert(
    savedStorageState.historyCount === 1 && savedStorageState.latestReviewText === reviewText,
    `saving review should write one history record: ${JSON.stringify(savedStorageState)}`,
  );

  await page.getByRole("button", { name: "历史" }).click();
  await assertVisible(page.getByRole("heading", { name: "历史记录" }), "history panel after saving review");
  assert((await page.locator(".history-record").count()) === 1, "history should show one saved record");
  await assertVisible(page.getByText(reviewText), "saved review text in history");

  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "历史" }).click();
  await assertVisible(page.getByRole("heading", { name: "历史记录" }), "history panel after reload");
  assert((await page.locator(".history-record").count()) === 1, "history should survive reload");
  await assertVisible(page.getByText(reviewText), "saved review text after reload");
  await assertNoHorizontalOverflow(page, "history after review save");
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

    await assertReducedMotionTalismanFlames(page);
    await assertAbandonSessionProtection(page);

    await page.getByRole("button", { name: "创建任务" }).click();
    await page.getByRole("button", { name: "创建任务" }).click();

    const situationInputs = page.locator('textarea[placeholder="当我打开电脑坐到书桌前，就开始写今天的第一段文稿。"]');
    await situationInputs.nth(0).fill("当我打开电脑坐到书桌前，就开始写今天的第一段文稿。");
    await situationInputs.nth(1).fill("当我打开编辑器，就整理今天最重要的一件事。");
    await situationInputs.nth(2).fill("当我完成第一轮专注，就记录下一步行动。");
    const firstIntentForm = page.locator(".intent-form").first();
    await firstIntentForm.getByRole("button", { name: "添加" }).click();
    await firstIntentForm
      .locator('textarea[placeholder="如果我想刷短视频，那么我就先闭眼休息 5 分钟。"]')
      .fill("如果我想刷短视频，那么我就先闭眼休息 5 分钟。");

    await page.getByLabel("第 1 项任务香数").getByRole("button", { name: "3 炷" }).click();
    await page.getByLabel("第 2 项任务香数").getByRole("button", { name: "2 炷" }).click();
    await page.getByLabel("第 3 项任务香数").getByRole("button", { name: "1 炷" }).click();
    await page.getByRole("button", { name: "开始创造" }).click();

    await assertVisible(page.getByRole("heading", { name: "仪式台" }), "full ritual title before compact mode");
    await assertVisible(page.locator(".stage-grid--full"), "full ritual stage before compact mode");
    await assertFullStageUsesStageVisuals(page);
    await assertTalismanFlameStructure(page, 3);
    await assertFullStageIdleCenserHoverUsesMetadataCard(page);
    await assertFullStageTalismanPreviewReadability(page);
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
    const startSlot = await startFirstIntentAndAssertTalismanFlames(page);
    await page.locator(".intent-slot--burning").first().waitFor({ state: "visible", timeout: 5000 });
    await assertVisible(page.locator(".intent-slot--burning").first(), "burning intent in full ritual stage");
    await assertTalismanFlamesDismissed(startSlot);
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
    await assertFullStageSmokeSuppressed(page);
    await assertFullStageActiveCenserHoverUsesSingleCard(page);
    await page.evaluate(() => {
      document.documentElement.dataset.windowMode = "compact";
    });
    await assertCompactCenserStateDifferentiation(page);
    await assertCompactRemainingTooltip(page);
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

    await assertCompletedSessionReviewSavePersistsHistory(page);
    console.log(`Compact window check passed. Screenshot: ${screenshotPath}`);
  } finally {
    await browser.close();
  }
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
