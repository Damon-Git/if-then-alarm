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

    await assertVisible(page.locator(".compact-stage"), "compact stage");
    assert(!(await page.getByRole("heading", { name: "急急如律令" }).isVisible()), "app title should be hidden in compact ritual scene");
    assert(!(await page.getByRole("button", { name: "历史" }).isVisible()), "history button should be hidden in compact ritual scene");
    assert(!(await page.getByRole("button", { name: "设置" }).isVisible()), "settings button should be hidden in compact ritual scene");
    assert(!(await page.getByRole("heading", { name: "仪式台" }).isVisible()), "ritual title should be hidden in compact ritual scene");
    assert(!(await page.locator(".stage-grid--full").isVisible()), "full ritual stage should be hidden in compact viewport");
    assert((await page.locator(".compact-censer").count()) === 3, "compact stage should show three censer slots");
    assert((await page.locator(".compact-censer p:visible").count()) === 0, "compact ritual scene should hide intent summaries");
    const ritualSceneStyle = await page.locator(".compact-stage").evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        flexWrap: style.flexWrap,
      };
    });
    assert(ritualSceneStyle.flexWrap === "nowrap", "compact ritual censers should stay in a single row");
    assert(
      ritualSceneStyle.backgroundColor === "rgba(0, 0, 0, 0)",
      `compact ritual scene should not draw a background: ${ritualSceneStyle.backgroundColor}`,
    );
    const censerBoxes = await page.locator(".compact-censer").evaluateAll((elements) =>
      elements.map((element) => {
        const box = element.getBoundingClientRect();
        return { top: Math.round(box.top) };
      }),
    );
    const rowTops = new Set(censerBoxes.map((box) => box.top));
    assert(rowTops.size === 1, `compact ritual censers should be side by side: ${JSON.stringify(censerBoxes)}`);
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
