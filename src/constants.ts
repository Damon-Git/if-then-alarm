import type { TimerMode } from "./types";

export const DEV_TIMER_SECONDS = 10;
export const DEV_BREAK_SECONDS = 5;

export const PROD_TIMER_SECONDS = 25 * 60;
export const PROD_BREAK_SECONDS = 5 * 60;

export const MAX_INTENT_SETS = 3;
export const MAX_PREVENTION_INTENTS = 3;
export const FOCUS_MINUTES_PER_INCENSE = 25;

export const DEFAULT_TIMER_MODE: TimerMode = "dev";

export const TIMER_MODE_CONFIG: Record<
  TimerMode,
  {
    breakSeconds: number;
    focusSeconds: number;
    label: string;
  }
> = {
  dev: {
    breakSeconds: DEV_BREAK_SECONDS,
    focusSeconds: DEV_TIMER_SECONDS,
    label: "开发模式",
  },
  prod: {
    breakSeconds: PROD_BREAK_SECONDS,
    focusSeconds: PROD_TIMER_SECONDS,
    label: "正式模式",
  },
};
