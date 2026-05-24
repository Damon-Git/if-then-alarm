import { describe, expect, it } from "vitest";
import { getCenserLidState, getStageIntentVisualSemantics, isStageTimerIntentStatus } from "./visualState";

describe("visual state", () => {
  it("keeps censer lids open until the whole intent set is completed", () => {
    expect(getCenserLidState("idle")).toBe("open");
    expect(getCenserLidState("burning")).toBe("open");
    expect(getCenserLidState("resting")).toBe("open");
    expect(getCenserLidState("completed")).toBe("closed");
  });

  it("centralizes full-stage intent semantics by status", () => {
    expect(getStageIntentVisualSemantics("idle")).toEqual({
      canStart: true,
      censerEmphasis: "normal",
      metadataVisibility: "censer-hover",
      preventionTalismanVisibility: "visible",
      shouldRenderTimerPanel: false,
      situationTalismanVisibility: "visible",
      statusLabel: "未开始",
    });
    expect(getStageIntentVisualSemantics("burning")).toEqual({
      canStart: false,
      censerEmphasis: "normal",
      metadataVisibility: "censer-hover",
      preventionTalismanVisibility: "visible",
      shouldRenderTimerPanel: true,
      situationTalismanVisibility: "dismissed",
      statusLabel: "进行中",
    });
    expect(getStageIntentVisualSemantics("resting")).toEqual({
      canStart: false,
      censerEmphasis: "normal",
      metadataVisibility: "censer-hover",
      preventionTalismanVisibility: "visible",
      shouldRenderTimerPanel: true,
      situationTalismanVisibility: "dismissed",
      statusLabel: "休息中",
    });
    expect(getStageIntentVisualSemantics("completed")).toEqual({
      canStart: false,
      censerEmphasis: "muted",
      metadataVisibility: "censer-hover",
      preventionTalismanVisibility: "dismissed",
      shouldRenderTimerPanel: false,
      situationTalismanVisibility: "dismissed",
      statusLabel: "已完成",
    });
  });

  it("narrows the statuses that can render a full-stage timer panel", () => {
    expect(isStageTimerIntentStatus("idle")).toBe(false);
    expect(isStageTimerIntentStatus("burning")).toBe(true);
    expect(isStageTimerIntentStatus("resting")).toBe(true);
    expect(isStageTimerIntentStatus("completed")).toBe(false);
  });
});
