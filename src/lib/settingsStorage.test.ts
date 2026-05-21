import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_TIMER_MODE } from "../constants";
import { loadAppSettings, normalizeAppSettings, saveAppSettings } from "./settingsStorage";

describe("settings storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("normalizes missing settings to defaults", () => {
    expect(normalizeAppSettings(null)).toEqual({
      isAlwaysOnTop: false,
      timerMode: DEFAULT_TIMER_MODE,
    });
  });

  it("normalizes legacy settings without window behavior fields", () => {
    expect(normalizeAppSettings({ timerMode: "prod" })).toEqual({
      isAlwaysOnTop: false,
      timerMode: "prod",
    });
  });

  it("normalizes invalid settings values", () => {
    expect(normalizeAppSettings({ isAlwaysOnTop: "yes", timerMode: "fast" })).toEqual({
      isAlwaysOnTop: false,
      timerMode: DEFAULT_TIMER_MODE,
    });
  });

  it("saves and loads app settings", () => {
    saveAppSettings({
      isAlwaysOnTop: true,
      timerMode: "prod",
    });

    expect(loadAppSettings()).toEqual({
      isAlwaysOnTop: true,
      timerMode: "prod",
    });
  });
});
