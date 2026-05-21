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
      isDockVisible: true,
      timerMode: DEFAULT_TIMER_MODE,
    });
  });

  it("normalizes legacy settings without window behavior fields", () => {
    expect(normalizeAppSettings({ timerMode: "prod" })).toEqual({
      isAlwaysOnTop: false,
      isDockVisible: true,
      timerMode: "prod",
    });
  });

  it("normalizes invalid settings values", () => {
    expect(normalizeAppSettings({ isAlwaysOnTop: "yes", isDockVisible: "no", timerMode: "fast" })).toEqual({
      isAlwaysOnTop: false,
      isDockVisible: true,
      timerMode: DEFAULT_TIMER_MODE,
    });
  });

  it("saves and loads app settings", () => {
    saveAppSettings({
      isAlwaysOnTop: true,
      isDockVisible: false,
      timerMode: "prod",
    });

    expect(loadAppSettings()).toEqual({
      isAlwaysOnTop: true,
      isDockVisible: false,
      timerMode: "prod",
    });
  });
});
