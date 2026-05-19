import { DEFAULT_TIMER_MODE } from "../constants";
import { persistenceAdapter, SETTINGS_STORAGE_KEY } from "./persistenceAdapter";
import type { AppSettings, TimerMode } from "../types";

export const isTimerMode = (value: unknown): value is TimerMode => value === "dev" || value === "prod";

export const loadAppSettings = (): AppSettings => {
  try {
    const rawValue = persistenceAdapter.getItem(SETTINGS_STORAGE_KEY);

    if (!rawValue) {
      return { timerMode: DEFAULT_TIMER_MODE };
    }

    const parsedValue = JSON.parse(rawValue) as Partial<AppSettings>;

    if (!isTimerMode(parsedValue.timerMode)) {
      return { timerMode: DEFAULT_TIMER_MODE };
    }

    return {
      timerMode: parsedValue.timerMode,
    };
  } catch {
    return { timerMode: DEFAULT_TIMER_MODE };
  }
};

export const saveAppSettings = (settings: AppSettings) => {
  persistenceAdapter.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  return settings;
};
