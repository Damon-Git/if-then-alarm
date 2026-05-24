import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "playwright";

const targetUrl = process.env.COMPACT_CHECK_URL ?? "http://127.0.0.1:5173/";
const screenshotPath = "artifacts/compact-window.png";

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
    completedCenserLabel?.includes("点击展开完整窗口并复盘"),
    `completed compact censer should point to full-window review: ${completedCenserLabel}`,
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
    assert((await page.locator(".compact-censer p:visible").count()) === 0, "compact ritual scene should hide intent summaries");
    assert((await page.locator(".compact-censer__status:visible").count()) === 0, "compact ritual scene should hide status labels");
    assert((await page.locator(".compact-censer__hint:visible").count()) === 0, "compact ritual scene should hide interaction hints");
    assert((await page.locator(".compact-censer strong:visible").count()) === 0, "compact ritual scene should hide timer text");
    const firstCompactCenserLabel = await page.locator(".compact-censer__button").first().getAttribute("aria-label");
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
      return {
        borderStyle: style.borderStyle,
        borderWidth: style.borderWidth,
        backgroundColor: style.backgroundColor,
        flexWrap: style.flexWrap,
      };
    });
    assert(ritualSceneStyle.flexWrap === "nowrap", "compact ritual censers should stay in a single row");
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
    await assertVisible(page.locator(".intent-slot--burning").first(), "burning intent in full ritual stage");
    await page.evaluate(() => {
      document.documentElement.dataset.windowMode = "compact";
    });
    await assertCompactCenserStateDifferentiation(page);
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
