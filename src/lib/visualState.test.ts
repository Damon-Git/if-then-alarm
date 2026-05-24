import { describe, expect, it } from "vitest";
import { getCenserLidState } from "./visualState";

describe("visual state", () => {
  it("keeps censer lids open until the whole intent set is completed", () => {
    expect(getCenserLidState("idle")).toBe("open");
    expect(getCenserLidState("burning")).toBe("open");
    expect(getCenserLidState("resting")).toBe("open");
    expect(getCenserLidState("completed")).toBe("closed");
  });
});
