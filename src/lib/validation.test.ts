import { describe, expect, it } from "vitest";
import {
  hasValidationErrors,
  normalizeIntentText,
  validateIntentDrafts,
  validatePreventionIntent,
  validateSituationIntent,
} from "./validation";

describe("intent validation", () => {
  it("normalizes whitespace", () => {
    expect(normalizeIntentText(" 当我打开电脑\n  就开始写作  ")).toBe("当我打开电脑 就开始写作");
  });

  it("validates situation intent marker order and content", () => {
    expect(validateSituationIntent("当我坐到书桌前，就开始写第一段。")).toBe("");
    expect(validateSituationIntent("我坐到书桌前就开始写。")).toContain("当");
    expect(validateSituationIntent("就开始写，当我坐下")).toContain("之前");
    expect(validateSituationIntent("当就开始写")).toContain("触发情境");
    expect(validateSituationIntent("当我坐下就")).toContain("第一步行动");
  });

  it("validates optional prevention intent marker order and content", () => {
    expect(validatePreventionIntent("")).toBe("");
    expect(validatePreventionIntent("如果我想刷短视频，那么我先闭眼休息。")).toBe("");
    expect(validatePreventionIntent("我想刷短视频就休息")).toContain("如果");
    expect(validatePreventionIntent("那么我休息，如果我想刷短视频")).toContain("之前");
    expect(validatePreventionIntent("如果那么我休息")).toContain("阻碍");
    expect(validatePreventionIntent("如果我想刷短视频那么")).toContain("替代动作");
  });

  it("returns field-level draft errors", () => {
    const errors = validateIntentDrafts([
      {
        id: "draft-1",
        incenseCount: 4,
        preventionIntents: ["如果我分心就休息"],
        situationIntent: "打开电脑就写作",
      },
    ]);

    expect(hasValidationErrors(errors)).toBe(true);
    expect(errors["draft-1"].map((error) => error.field)).toEqual([
      "situationIntent",
      "preventionIntent",
      "incenseCount",
    ]);
  });
});
