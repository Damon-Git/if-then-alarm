import { describe, expect, it } from "vitest";
import {
  getCenserLidState,
  getIncenseVisualState,
  getStageIntentVisualSemantics,
  isStageTimerIntentStatus,
} from "./visualState";

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
      hoverCard: "metadata",
      metadataVisibility: "censer-hover",
      preventionTalismanVisibility: "visible",
      shouldRenderTimerPanel: false,
      situationTalismanVisibility: "visible",
      statusLabel: "未开始",
    });
    expect(getStageIntentVisualSemantics("burning")).toEqual({
      canStart: false,
      censerEmphasis: "normal",
      hoverCard: "timer",
      metadataVisibility: "censer-hover",
      preventionTalismanVisibility: "visible",
      shouldRenderTimerPanel: true,
      situationTalismanVisibility: "dismissed",
      statusLabel: "进行中",
    });
    expect(getStageIntentVisualSemantics("resting")).toEqual({
      canStart: false,
      censerEmphasis: "normal",
      hoverCard: "timer",
      metadataVisibility: "censer-hover",
      preventionTalismanVisibility: "visible",
      shouldRenderTimerPanel: true,
      situationTalismanVisibility: "dismissed",
      statusLabel: "休息中",
    });
    expect(getStageIntentVisualSemantics("completed")).toEqual({
      canStart: false,
      censerEmphasis: "muted",
      hoverCard: "metadata",
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

  it("maps each incense stick to pending, active, and burned states from left to right", () => {
    expect(getIncenseVisualState(1, 1, "idle")).toBe("pending");
    expect(getIncenseVisualState(1, 2, "burning")).toBe("burned");
    expect(getIncenseVisualState(2, 2, "burning")).toBe("burning");
    expect(getIncenseVisualState(3, 2, "burning")).toBe("pending");
    expect(getIncenseVisualState(2, 2, "resting")).toBe("resting");
    expect(getIncenseVisualState(3, 3, "completed")).toBe("burned");
  });
});
