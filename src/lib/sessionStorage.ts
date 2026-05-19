import { DEFAULT_TIMER_MODE } from "../constants";
import { persistenceAdapter, SESSION_STORAGE_KEY } from "./persistenceAdapter";
import { isTimerMode } from "./settingsStorage";
import type { ActiveTimerSegment, PersistedSession } from "../types";

export { SESSION_STORAGE_KEY } from "./persistenceAdapter";

const isActiveTimerSegment = (value: unknown): value is ActiveTimerSegment => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const timerSegment = value as Partial<ActiveTimerSegment>;

  return (
    typeof timerSegment.startedAt === "string" &&
    typeof timerSegment.durationSeconds === "number" &&
    Number.isFinite(timerSegment.durationSeconds) &&
    timerSegment.durationSeconds >= 0
  );
};

const isPersistedSession = (value: unknown): value is PersistedSession => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<PersistedSession>;

  return (
    session.version === 1 &&
    (session.phase === "ritual" || session.phase === "review") &&
    Array.isArray(session.intentSets) &&
    typeof session.timerRemaining === "number" &&
    (session.activeTimerSegment === undefined ||
      session.activeTimerSegment === null ||
      isActiveTimerSegment(session.activeTimerSegment)) &&
    (session.timerMode === undefined || isTimerMode(session.timerMode)) &&
    typeof session.updatedAt === "string"
  );
};

export const loadPersistedSession = (): PersistedSession | null => {
  try {
    const rawValue = persistenceAdapter.getItem(SESSION_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue);

    if (!isPersistedSession(parsedValue)) {
      return null;
    }

    return {
      ...parsedValue,
      activeTimerSegment: parsedValue.activeTimerSegment ?? null,
      timerMode: parsedValue.timerMode ?? DEFAULT_TIMER_MODE,
    };
  } catch {
    return null;
  }
};

export const savePersistedSession = (session: Omit<PersistedSession, "version" | "updatedAt">) => {
  const nextSession: PersistedSession = {
    ...session,
    version: 1,
    updatedAt: new Date().toISOString(),
  };

  persistenceAdapter.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
  return nextSession;
};

export const clearPersistedSession = () => {
  persistenceAdapter.removeItem(SESSION_STORAGE_KEY);
};

export const saveRawPersistedSessionForDev = (session: unknown) => {
  if (!import.meta.env.DEV) {
    return;
  }

  persistenceAdapter.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
};
