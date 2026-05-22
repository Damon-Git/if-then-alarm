import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HistoryRecord } from "../types";
import { createDefaultDesktopPersistenceJson } from "./desktopPersistenceSchema";
import {
  DESKTOP_PERSISTENCE_WRITE_ERROR_EVENT,
  consumeDesktopPersistenceInitializationResult,
  createDesktopPersistenceAdapter,
  getDesktopPersistenceInitializationResult,
  initializeDesktopPersistence,
  type DesktopPersistenceFileClient,
} from "./desktopPersistenceAdapter";
import {
  createMemoryPersistenceAdapter,
  HISTORY_STORAGE_KEY,
  persistenceAdapter,
  resetPersistenceAdapterForTest,
  SETTINGS_STORAGE_KEY,
} from "./persistenceAdapter";

const NOW = "2026-05-20T08:00:00.000Z";

const createHistoryRecord = (id: string): HistoryRecord => ({
  createdAt: "2026-05-20T07:00:00.000Z",
  id,
  intentSets: [
    {
      incenseCount: 1,
      preventionIntents: [],
      situationIntent: "当我坐下，就开始写作。",
    },
  ],
  result: "completed",
  reviewText: "完成。",
});

const createFileClient = (initialText: string | null = null) => {
  const writes: string[] = [];
  let text = initialText;
  let backupPath: string | null = null;

  const fileClient: DesktopPersistenceFileClient = {
    backupCorruptTextFile: async () => {
      backupPath = "persistence.v1.corrupt-test.json";
      text = null;
      return backupPath;
    },
    readTextFile: async () => text,
    writeTextFile: async (contents) => {
      text = contents;
      writes.push(contents);
    },
  };

  return {
    fileClient,
    getBackupPath: () => backupPath,
    getText: () => text,
    writes,
  };
};

describe("desktop persistence adapter", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetPersistenceAdapterForTest();
    consumeDesktopPersistenceInitializationResult();
  });

  afterEach(() => {
    resetPersistenceAdapterForTest();
    consumeDesktopPersistenceInitializationResult();
    window.localStorage.clear();
  });

  it("does not initialize outside Tauri unless forced", async () => {
    const file = createFileClient();

    await expect(initializeDesktopPersistence({ fileClient: file.fileClient, now: NOW })).resolves.toEqual({
      enabled: false,
      reason: "not-tauri",
    });
    expect(getDesktopPersistenceInitializationResult()).toEqual({
      enabled: false,
      reason: "not-tauri",
    });
    expect(file.writes).toEqual([]);
  });

  it("initializes the global persistence adapter from an existing desktop file", async () => {
    const record = createHistoryRecord("desktop-record");
    const file = createFileClient(
      JSON.stringify({
        ...createDefaultDesktopPersistenceJson({ now: NOW }),
        history: [record],
        settings: { isAlwaysOnTop: true, isDockVisible: false, isSoundReminderEnabled: true, timerMode: "prod" },
      }),
    );

    const result = await initializeDesktopPersistence({
      fileClient: file.fileClient,
      force: true,
      now: NOW,
    });

    expect(result.enabled).toBe(true);
    expect(result.enabled ? result.source : "").toBe("desktop-json");
    expect(JSON.parse(persistenceAdapter.getItem(HISTORY_STORAGE_KEY) ?? "")).toEqual([record]);
    expect(JSON.parse(persistenceAdapter.getItem(SETTINGS_STORAGE_KEY) ?? "")).toEqual({
      isAlwaysOnTop: true,
      isDockVisible: false,
      isSoundReminderEnabled: true,
      timerMode: "prod",
    });
    expect(getDesktopPersistenceInitializationResult()).toEqual(result);
    expect(file.writes).toEqual([]);
  });

  it("creates a desktop file from existing localStorage data", async () => {
    const record = createHistoryRecord("local-record");
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([record]));
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ timerMode: "prod" }));

    const file = createFileClient();
    const result = await initializeDesktopPersistence({
      fileClient: file.fileClient,
      force: true,
      now: NOW,
    });

    expect(result.enabled).toBe(true);
    expect(result.enabled ? result.source : "").toBe("localStorage");
    expect(JSON.parse(persistenceAdapter.getItem(HISTORY_STORAGE_KEY) ?? "")).toEqual([record]);
    expect(file.writes).toHaveLength(1);
    expect(JSON.parse(file.writes[0])).toMatchObject({
      history: [record],
      migratedAt: NOW,
      migrationSource: "localStorage",
      settings: { isAlwaysOnTop: false, isDockVisible: true, isSoundReminderEnabled: false, timerMode: "prod" },
    });
  });

  it("backs up corrupt desktop files and recovers from localStorage", async () => {
    const record = createHistoryRecord("recovered-record");
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([record]));

    const file = createFileClient("{bad json");
    const result = await initializeDesktopPersistence({
      fileClient: file.fileClient,
      force: true,
      now: NOW,
    });

    expect(result.enabled).toBe(true);
    expect(result.enabled ? result.corruptBackupPath : "").toBe("persistence.v1.corrupt-test.json");
    expect(file.getBackupPath()).toBe("persistence.v1.corrupt-test.json");
    expect(JSON.parse(persistenceAdapter.getItem(HISTORY_STORAGE_KEY) ?? "")).toEqual([record]);
    expect(file.writes).toHaveLength(1);
  });

  it("writes updated cache values back to the desktop file", async () => {
    const initialManifest = createDefaultDesktopPersistenceJson({
      migrationSource: "desktop-json",
      now: "2026-05-19T08:00:00.000Z",
    });
    const cacheAdapter = createMemoryPersistenceAdapter();
    const file = createFileClient();
    const adapter = createDesktopPersistenceAdapter({
      cacheAdapter,
      fileClient: file.fileClient,
      initialManifest,
      now: () => NOW,
    });
    const record = createHistoryRecord("written-record");

    adapter.setItem(HISTORY_STORAGE_KEY, JSON.stringify([record]));
    await adapter.flush();

    expect(JSON.parse(file.writes[0])).toMatchObject({
      createdAt: "2026-05-19T08:00:00.000Z",
      history: [record],
      migrationSource: "desktop-json",
      updatedAt: NOW,
    });
  });

  it("emits an event when desktop file writes fail", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const cacheAdapter = createMemoryPersistenceAdapter();
    const adapter = createDesktopPersistenceAdapter({
      cacheAdapter,
      fileClient: {
        backupCorruptTextFile: async () => null,
        readTextFile: async () => null,
        writeTextFile: async () => {
          throw new Error("write failed");
        },
      },
      initialManifest: createDefaultDesktopPersistenceJson({ now: NOW }),
      now: () => NOW,
    });
    const writeErrorListener = vi.fn();

    window.addEventListener(DESKTOP_PERSISTENCE_WRITE_ERROR_EVENT, writeErrorListener);
    adapter.setItem(HISTORY_STORAGE_KEY, JSON.stringify([createHistoryRecord("failed-write")]));

    await expect(adapter.flush()).rejects.toThrow("write failed");
    expect(writeErrorListener).toHaveBeenCalledTimes(1);

    window.removeEventListener(DESKTOP_PERSISTENCE_WRITE_ERROR_EVENT, writeErrorListener);
    consoleError.mockRestore();
  });
});
