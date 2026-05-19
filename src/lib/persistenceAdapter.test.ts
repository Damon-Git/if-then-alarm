import { beforeEach, describe, expect, it } from "vitest";
import {
  createMemoryPersistenceAdapter,
  createPersistenceSnapshot,
  HISTORY_STORAGE_KEY,
  initializePersistenceCacheFromAdapter,
  PERSISTENCE_STORAGE_KEYS,
  SESSION_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  webPersistenceAdapter,
} from "./persistenceAdapter";

describe("persistence adapter", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("creates a memory adapter that can read, write, and remove values", () => {
    const adapter = createMemoryPersistenceAdapter({
      [HISTORY_STORAGE_KEY]: "[]",
    });

    expect(adapter.getItem(HISTORY_STORAGE_KEY)).toBe("[]");

    adapter.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ timerMode: "dev" }));
    expect(adapter.getItem(SETTINGS_STORAGE_KEY)).toBe(JSON.stringify({ timerMode: "dev" }));

    adapter.removeItem(HISTORY_STORAGE_KEY);
    expect(adapter.getItem(HISTORY_STORAGE_KEY)).toBeNull();
  });

  it("exports snapshots for known persistence keys only", () => {
    const adapter = createMemoryPersistenceAdapter({
      [HISTORY_STORAGE_KEY]: "[]",
      [SESSION_STORAGE_KEY]: JSON.stringify({ version: 1 }),
      "unrelated-key": "ignored",
    });

    expect(createPersistenceSnapshot(adapter)).toEqual({
      [HISTORY_STORAGE_KEY]: "[]",
      [SESSION_STORAGE_KEY]: JSON.stringify({ version: 1 }),
    });
  });

  it("initializes a cache adapter from localStorage persistence keys", () => {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, "[]");
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ version: 1 }));
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ timerMode: "prod" }));
    window.localStorage.setItem("unrelated-key", "ignored");

    const cacheAdapter = createMemoryPersistenceAdapter({
      [HISTORY_STORAGE_KEY]: "stale",
      [SETTINGS_STORAGE_KEY]: "stale",
    });
    const snapshot = initializePersistenceCacheFromAdapter(cacheAdapter, webPersistenceAdapter);

    expect(snapshot).toEqual({
      [HISTORY_STORAGE_KEY]: "[]",
      [SESSION_STORAGE_KEY]: JSON.stringify({ version: 1 }),
      [SETTINGS_STORAGE_KEY]: JSON.stringify({ timerMode: "prod" }),
    });
    expect(createPersistenceSnapshot(cacheAdapter)).toEqual(snapshot);
    expect(cacheAdapter.getItem("unrelated-key")).toBeNull();
  });

  it("uses the three expected persistence keys", () => {
    expect(PERSISTENCE_STORAGE_KEYS).toEqual([
      "jiji-rululing.history",
      "jiji-rululing.current-session",
      "jiji-rululing.settings",
    ]);
  });
});
