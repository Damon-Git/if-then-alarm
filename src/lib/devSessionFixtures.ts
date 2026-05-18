import { DEFAULT_TIMER_MODE, DEV_BREAK_SECONDS, DEV_TIMER_SECONDS } from "../constants";
import { savePersistedSession, saveRawPersistedSessionForDev } from "./sessionStorage";
import type { IntentSet, PersistedSession } from "../types";

export type DevSessionFixtureId =
  | "focus-running"
  | "focus-expired-next"
  | "rest-running"
  | "rest-expired"
  | "final-focus-expired"
  | "legacy-focus-running";

export type DevSessionFixture = {
  id: DevSessionFixtureId;
  title: string;
  description: string;
};

export const DEV_SESSION_FIXTURES: DevSessionFixture[] = [
  {
    id: "focus-running",
    title: "专注中，剩余 8 秒",
    description: "恢复后应继续烧香倒计时。",
  },
  {
    id: "focus-expired-next",
    title: "专注已超时，还有下一炷香",
    description: "恢复后应直接显示烧完提醒。",
  },
  {
    id: "rest-running",
    title: "休息中，剩余 4 秒",
    description: "恢复后应继续休息倒计时。",
  },
  {
    id: "rest-expired",
    title: "休息已超时",
    description: "恢复后应直接显示休息结束提醒。",
  },
  {
    id: "final-focus-expired",
    title: "最后一炷已超时",
    description: "恢复后应进入复盘流程。",
  },
  {
    id: "legacy-focus-running",
    title: "旧版 session，无计时段",
    description: "恢复后应按保存的剩余秒数继续。",
  },
];

const createIntentSet = (overrides: Partial<IntentSet> = {}): IntentSet => ({
  id: "dev-intent-1",
  situationIntent: "当我看到这个恢复测试，就验证当前计时状态。",
  preventionIntents: ["如果我看到状态不符合预期，那么我就记录具体场景。"],
  incenseCount: 2,
  currentIncenseIndex: 1,
  status: "burning",
  ...overrides,
});

const createStartedAtForRemaining = (durationSeconds: number, remainingSeconds: number, now = new Date()) => {
  const elapsedSeconds = Math.max(0, durationSeconds - remainingSeconds);
  return new Date(now.getTime() - elapsedSeconds * 1000).toISOString();
};

const createExpiredStartedAt = (durationSeconds: number, now = new Date()) => {
  return new Date(now.getTime() - (durationSeconds + 2) * 1000).toISOString();
};

const createBaseSession = (intentSets: IntentSet[], timerRemaining: number): Omit<PersistedSession, "updatedAt" | "version"> => ({
  activeModal: null,
  activeTimerSegment: null,
  intentSets,
  phase: "ritual",
  timerMode: DEFAULT_TIMER_MODE,
  timerRemaining,
});

export const saveDevSessionFixture = (fixtureId: DevSessionFixtureId) => {
  const now = new Date();

  if (fixtureId === "legacy-focus-running") {
    saveRawPersistedSessionForDev({
      activeModal: null,
      intentSets: [createIntentSet()],
      phase: "ritual",
      timerMode: DEFAULT_TIMER_MODE,
      timerRemaining: 7,
      updatedAt: now.toISOString(),
      version: 1,
    });
    return;
  }

  if (fixtureId === "focus-running") {
    savePersistedSession({
      ...createBaseSession([createIntentSet()], 8),
      activeTimerSegment: {
        durationSeconds: DEV_TIMER_SECONDS,
        startedAt: createStartedAtForRemaining(DEV_TIMER_SECONDS, 8, now),
      },
    });
    return;
  }

  if (fixtureId === "focus-expired-next") {
    savePersistedSession({
      ...createBaseSession([createIntentSet()], 0),
      activeTimerSegment: {
        durationSeconds: DEV_TIMER_SECONDS,
        startedAt: createExpiredStartedAt(DEV_TIMER_SECONDS, now),
      },
    });
    return;
  }

  if (fixtureId === "rest-running") {
    savePersistedSession({
      ...createBaseSession([createIntentSet({ status: "resting" })], 4),
      activeTimerSegment: {
        durationSeconds: DEV_BREAK_SECONDS,
        startedAt: createStartedAtForRemaining(DEV_BREAK_SECONDS, 4, now),
      },
    });
    return;
  }

  if (fixtureId === "rest-expired") {
    savePersistedSession({
      ...createBaseSession([createIntentSet({ status: "resting" })], 0),
      activeTimerSegment: {
        durationSeconds: DEV_BREAK_SECONDS,
        startedAt: createExpiredStartedAt(DEV_BREAK_SECONDS, now),
      },
    });
    return;
  }

  savePersistedSession({
    ...createBaseSession([createIntentSet({ incenseCount: 1 })], 0),
    activeTimerSegment: {
      durationSeconds: DEV_TIMER_SECONDS,
      startedAt: createExpiredStartedAt(DEV_TIMER_SECONDS, now),
    },
  });
};
