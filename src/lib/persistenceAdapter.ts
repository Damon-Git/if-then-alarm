export type PersistenceAdapter = {
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
};

export const HISTORY_STORAGE_KEY = "jiji-rululing.history";
export const SESSION_STORAGE_KEY = "jiji-rululing.current-session";
export const SETTINGS_STORAGE_KEY = "jiji-rululing.settings";

export const PERSISTENCE_STORAGE_KEYS = [HISTORY_STORAGE_KEY, SESSION_STORAGE_KEY, SETTINGS_STORAGE_KEY] as const;

export type PersistenceStorageKey = (typeof PERSISTENCE_STORAGE_KEYS)[number];

export type PersistenceSnapshot = Partial<Record<PersistenceStorageKey, string>>;

export const webPersistenceAdapter: PersistenceAdapter = {
  getItem: (key) => window.localStorage.getItem(key),
  removeItem: (key) => window.localStorage.removeItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
};

export const createMemoryPersistenceAdapter = (initialSnapshot: Record<string, string> = {}): PersistenceAdapter => {
  const values = new Map(Object.entries(initialSnapshot));

  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
};

export const createPersistenceSnapshot = (
  adapter: PersistenceAdapter,
  keys: readonly PersistenceStorageKey[] = PERSISTENCE_STORAGE_KEYS,
): PersistenceSnapshot =>
  keys.reduce<PersistenceSnapshot>((snapshot, key) => {
    const value = adapter.getItem(key);

    if (value !== null) {
      snapshot[key] = value;
    }

    return snapshot;
  }, {});

export const initializePersistenceCacheFromAdapter = (
  cacheAdapter: PersistenceAdapter,
  sourceAdapter: PersistenceAdapter = webPersistenceAdapter,
  keys: readonly PersistenceStorageKey[] = PERSISTENCE_STORAGE_KEYS,
) => {
  const snapshot = createPersistenceSnapshot(sourceAdapter, keys);

  keys.forEach((key) => cacheAdapter.removeItem(key));
  Object.entries(snapshot).forEach(([key, value]) => cacheAdapter.setItem(key, value));

  return snapshot;
};

export const persistenceAdapter = webPersistenceAdapter;
