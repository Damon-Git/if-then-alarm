import { DEFAULT_TIMER_MODE } from "../constants";
import { persistenceAdapter, SETTINGS_STORAGE_KEY } from "./persistenceAdapter";
import type { AppSettings, TimerMode } from "../types";

export const isTimerMode = (value: unknown): value is TimerMode => value === "dev" || value === "prod";

export const normalizeAppSettings = (value: unknown): AppSettings => {
  if (!value || typeof value !== "object") {
    return { timerMode: DEFAULT_TIMER_MODE };
  }

  const settings = value as Partial<AppSettings>;

  if (!isTimerMode(settings.timerMode)) {
    return { timerMode: DEFAULT_TIMER_MODE };
  }

  return {
    timerMode: settings.timerMode,
  };
};

export const loadAppSettings = (): AppSettings => {
  try {
    const rawValue = persistenceAdapter.getItem(SETTINGS_STORAGE_KEY);

    if (!rawValue) {
      return { timerMode: DEFAULT_TIMER_MODE };
    }

    return normalizeAppSettings(JSON.parse(rawValue));
  } catch {
    return { timerMode: DEFAULT_TIMER_MODE };
  }
};

export const saveAppSettings = (settings: AppSettings) => {
  persistenceAdapter.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  return settings;
};
