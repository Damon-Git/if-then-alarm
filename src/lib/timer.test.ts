import { describe, expect, it } from "vitest";
import { createActiveTimerSegment, formatDurationLabel, formatSeconds, getTimerRemainingSeconds } from "./timer";

describe("timer utilities", () => {
  it("formats seconds as mm:ss", () => {
    expect(formatSeconds(0)).toBe("00:00");
    expect(formatSeconds(65)).toBe("01:05");
    expect(formatSeconds(-10)).toBe("00:00");
  });

  it("formats minute-aligned and second-based durations", () => {
    expect(formatDurationLabel(300)).toBe("5 分钟");
    expect(formatDurationLabel(10)).toBe("10 秒");
  });

  it("creates active timer segments", () => {
    const now = new Date("2026-05-19T10:00:00.000Z");

    expect(createActiveTimerSegment(10, now)).toEqual({
      durationSeconds: 10,
      startedAt: "2026-05-19T10:00:00.000Z",
    });
  });

  it("derives remaining seconds from timestamp and duration", () => {
    const segment = {
      durationSeconds: 10,
      startedAt: "2026-05-19T10:00:00.000Z",
    };

    expect(getTimerRemainingSeconds(segment, new Date("2026-05-19T10:00:03.100Z"))).toBe(7);
    expect(getTimerRemainingSeconds(segment, new Date("2026-05-19T10:00:11.000Z"))).toBe(0);
  });

  it("falls back to duration when startedAt is invalid", () => {
    expect(getTimerRemainingSeconds({ durationSeconds: 8, startedAt: "not-a-date" })).toBe(8);
  });
});
