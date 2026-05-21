import { DEFAULT_TIMER_MODE } from "../constants";
import { persistenceAdapter, SETTINGS_STORAGE_KEY } from "./persistenceAdapter";
import type { AppSettings, TimerMode } from "../types";

export const isTimerMode = (value: unknown): value is TimerMode => value === "dev" || value === "prod";

export const createDefaultAppSettings = (): AppSettings => ({
  isAlwaysOnTop: false,
  isDockVisible: true,
  timerMode: DEFAULT_TIMER_MODE,
});

export const normalizeAppSettings = (value: unknown): AppSettings => {
  if (!value || typeof value !== "object") {
    return createDefaultAppSettings();
  }

  const settings = value as Partial<AppSettings>;

  return {
    isAlwaysOnTop: settings.isAlwaysOnTop === true,
    isDockVisible: settings.isDockVisible !== false,
    timerMode: isTimerMode(settings.timerMode) ? settings.timerMode : DEFAULT_TIMER_MODE,
  };
};

export const loadAppSettings = (): AppSettings => {
  try {
    const rawValue = persistenceAdapter.getItem(SETTINGS_STORAGE_KEY);

    if (!rawValue) {
      return createDefaultAppSettings();
    }

    return normalizeAppSettings(JSON.parse(rawValue));
  } catch {
    return createDefaultAppSettings();
  }
};

export const saveAppSettings = (settings: AppSettings) => {
  persistenceAdapter.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  return settings;
};
