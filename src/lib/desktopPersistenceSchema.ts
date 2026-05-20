import { DEFAULT_TIMER_MODE } from "../constants";
import {
  HISTORY_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  type PersistenceSnapshot,
} from "./persistenceAdapter";
import { normalizePersistedSession } from "./sessionStorage";
import { normalizeAppSettings } from "./settingsStorage";
import { isHistoryRecord } from "./storage";
import type { AppSettings, HistoryRecord, PersistedSession } from "../types";

export const DESKTOP_PERSISTENCE_VERSION = 1;
export const DESKTOP_PERSISTENCE_FILENAME = "persistence.v1.json";

type DesktopPersistenceMigrationSource = "desktop-json" | "empty" | "localStorage";

export type DesktopPersistenceJson = {
  createdAt: string;
  currentSession: PersistedSession | null;
  history: HistoryRecord[];
  migratedAt?: string;
  migrationSource?: DesktopPersistenceMigrationSource;
  settings: AppSettings;
  updatedAt: string;
  version: typeof DESKTOP_PERSISTENCE_VERSION;
};

type CreateDesktopPersistenceOptions = {
  migratedAt?: string;
  migrationSource?: DesktopPersistenceMigrationSource;
  now?: string;
};

const getNow = () => new Date().toISOString();

const isDesktopPersistenceMigrationSource = (value: unknown): value is DesktopPersistenceMigrationSource =>
  value === "desktop-json" || value === "empty" || value === "localStorage";

const parseJsonValue = (rawValue: string | undefined) => {
  if (!rawValue) {
    return undefined;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return undefined;
  }
};

const getSortableTimestamp = (createdAt: string) => {
  const timestamp = new Date(createdAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const normalizeHistoryRecords = (value: unknown): HistoryRecord[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const knownIds = new Set<string>();
  const records: HistoryRecord[] = [];

  value.forEach((record) => {
    if (!isHistoryRecord(record) || knownIds.has(record.id)) {
      return;
    }

    knownIds.add(record.id);
    records.push(record);
  });

  return records.sort(
    (first, second) => getSortableTimestamp(second.createdAt) - getSortableTimestamp(first.createdAt),
  );
};

export const createDefaultDesktopPersistenceJson = ({
  migratedAt,
  migrationSource = "empty",
  now = getNow(),
}: CreateDesktopPersistenceOptions = {}): DesktopPersistenceJson => ({
  createdAt: now,
  currentSession: null,
  history: [],
  migratedAt,
  migrationSource,
  settings: {
    timerMode: DEFAULT_TIMER_MODE,
  },
  updatedAt: now,
  version: DESKTOP_PERSISTENCE_VERSION,
});

export const createDesktopPersistenceJsonFromSnapshot = (
  snapshot: PersistenceSnapshot,
  options: CreateDesktopPersistenceOptions = {},
): DesktopPersistenceJson => {
  const now = options.now ?? getNow();

  return {
    ...createDefaultDesktopPersistenceJson({
      migratedAt: options.migratedAt,
      migrationSource: options.migrationSource ?? "localStorage",
      now,
    }),
    currentSession: normalizePersistedSession(parseJsonValue(snapshot[SESSION_STORAGE_KEY])),
    history: normalizeHistoryRecords(parseJsonValue(snapshot[HISTORY_STORAGE_KEY])),
    settings: normalizeAppSettings(parseJsonValue(snapshot[SETTINGS_STORAGE_KEY])),
  };
};

export const normalizeDesktopPersistenceJson = (
  value: unknown,
  options: CreateDesktopPersistenceOptions = {},
): DesktopPersistenceJson => {
  const now = options.now ?? getNow();
  const fallback = createDefaultDesktopPersistenceJson({
    migrationSource: options.migrationSource ?? "empty",
    now,
  });

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const persistenceValue = value as Partial<DesktopPersistenceJson>;

  if (persistenceValue.version !== DESKTOP_PERSISTENCE_VERSION) {
    return fallback;
  }

  const createdAt = typeof persistenceValue.createdAt === "string" ? persistenceValue.createdAt : now;
  const updatedAt = typeof persistenceValue.updatedAt === "string" ? persistenceValue.updatedAt : createdAt;

  return {
    createdAt,
    currentSession: normalizePersistedSession(persistenceValue.currentSession),
    history: normalizeHistoryRecords(persistenceValue.history),
    migratedAt: typeof persistenceValue.migratedAt === "string" ? persistenceValue.migratedAt : undefined,
    migrationSource: isDesktopPersistenceMigrationSource(persistenceValue.migrationSource)
      ? persistenceValue.migrationSource
      : undefined,
    settings: normalizeAppSettings(persistenceValue.settings),
    updatedAt,
    version: DESKTOP_PERSISTENCE_VERSION,
  };
};

export const createSnapshotFromDesktopPersistenceJson = (
  persistenceValue: DesktopPersistenceJson,
): PersistenceSnapshot => {
  const snapshot: PersistenceSnapshot = {
    [HISTORY_STORAGE_KEY]: JSON.stringify(persistenceValue.history),
    [SETTINGS_STORAGE_KEY]: JSON.stringify(persistenceValue.settings),
  };

  if (persistenceValue.currentSession) {
    snapshot[SESSION_STORAGE_KEY] = JSON.stringify(persistenceValue.currentSession);
  }

  return snapshot;
};

export const updateDesktopPersistenceJsonFromSnapshot = (
  currentPersistenceValue: DesktopPersistenceJson,
  snapshot: PersistenceSnapshot,
  { now = getNow() }: Pick<CreateDesktopPersistenceOptions, "now"> = {},
): DesktopPersistenceJson => ({
  ...createDesktopPersistenceJsonFromSnapshot(snapshot, {
    migratedAt: currentPersistenceValue.migratedAt,
    migrationSource: currentPersistenceValue.migrationSource ?? "desktop-json",
    now,
  }),
  createdAt: currentPersistenceValue.createdAt,
  updatedAt: now,
});
