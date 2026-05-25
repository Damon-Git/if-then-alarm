import {
  DESKTOP_PERSISTENCE_VERSION,
  normalizeDesktopPersistenceJson,
  type DesktopPersistenceJson,
} from "./desktopPersistenceSchema";
import { HISTORY_STORAGE_KEY, SESSION_STORAGE_KEY, SETTINGS_STORAGE_KEY, persistenceAdapter } from "./persistenceAdapter";
import type { AppSettings, HistoryRecord, PersistedSession } from "../types";

type FullBackupSource = {
  currentSession: PersistedSession | null;
  history: HistoryRecord[];
  settings: AppSettings;
};

const getNow = () => new Date().toISOString();

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasRequiredFullBackupShape = (value: unknown): value is Partial<DesktopPersistenceJson> => {
  if (!isObject(value)) {
    return false;
  }

  return (
    value.version === DESKTOP_PERSISTENCE_VERSION &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    Array.isArray(value.history) &&
    "currentSession" in value &&
    isObject(value.settings)
  );
};

export const createFullBackupPayload = (
  { currentSession, history, settings }: FullBackupSource,
  { now = getNow() }: { now?: string } = {},
): DesktopPersistenceJson =>
  normalizeDesktopPersistenceJson(
    {
      createdAt: now,
      currentSession,
      history,
      migrationSource: "desktop-json",
      settings,
      updatedAt: now,
      version: DESKTOP_PERSISTENCE_VERSION,
    },
    {
      migrationSource: "desktop-json",
      now,
    },
  );

export const stringifyFullBackupPayload = (payload: DesktopPersistenceJson) => `${JSON.stringify(payload, null, 2)}\n`;

export const parseFullBackupPayload = (rawValue: string): DesktopPersistenceJson => {
  const parsedValue = JSON.parse(rawValue) as unknown;

  if (!hasRequiredFullBackupShape(parsedValue)) {
    throw new Error("INVALID_FULL_BACKUP");
  }

  return normalizeDesktopPersistenceJson(parsedValue, {
    migrationSource: "desktop-json",
    now: getNow(),
  });
};

export const applyFullBackupPayload = (payload: DesktopPersistenceJson) => {
  persistenceAdapter.setItem(HISTORY_STORAGE_KEY, JSON.stringify(payload.history));

  if (payload.currentSession) {
    persistenceAdapter.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload.currentSession));
  } else {
    persistenceAdapter.removeItem(SESSION_STORAGE_KEY);
  }

  persistenceAdapter.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload.settings));
};

