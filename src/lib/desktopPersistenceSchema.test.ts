import { describe, expect, it } from "vitest";
import { DEFAULT_TIMER_MODE } from "../constants";
import type { HistoryRecord, PersistedSession } from "../types";
import {
  DESKTOP_PERSISTENCE_FILENAME,
  DESKTOP_PERSISTENCE_VERSION,
  createDefaultDesktopPersistenceJson,
  createDesktopPersistenceJsonFromSnapshot,
  createSnapshotFromDesktopPersistenceJson,
  normalizeDesktopPersistenceJson,
  updateDesktopPersistenceJsonFromSnapshot,
} from "./desktopPersistenceSchema";
import { HISTORY_STORAGE_KEY, SESSION_STORAGE_KEY, SETTINGS_STORAGE_KEY } from "./persistenceAdapter";

const NOW = "2026-05-20T08:00:00.000Z";

const createHistoryRecord = (id: string, createdAt: string): HistoryRecord => ({
  createdAt,
  id,
  intentSets: [
    {
      incenseCount: 2,
      preventionIntents: ["如果我想分心，那么我先停一下。"],
      situationIntent: "当我坐到桌前，就开始写作。",
    },
  ],
  result: "completed",
  reviewText: "完成了一轮。",
  timerMode: "dev",
});

const createPersistedSession = (overrides: Partial<PersistedSession> = {}): PersistedSession => ({
  activeModal: null,
  activeTimerSegment: null,
  intentSets: [
    {
      currentIncenseIndex: 1,
      id: "intent-1",
      incenseCount: 2,
      preventionIntents: [],
      situationIntent: "当我坐下，就开始写作。",
      status: "burning",
    },
  ],
  phase: "ritual",
  timerMode: "dev",
  timerRemaining: 8,
  updatedAt: NOW,
  version: 1,
  ...overrides,
});

describe("desktop persistence schema", () => {
  it("creates a default desktop persistence manifest", () => {
    expect(DESKTOP_PERSISTENCE_FILENAME).toBe("persistence.v1.json");
    expect(createDefaultDesktopPersistenceJson({ now: NOW })).toEqual({
      createdAt: NOW,
      currentSession: null,
      history: [],
      migratedAt: undefined,
      migrationSource: "empty",
      settings: {
        isAlwaysOnTop: false,
        timerMode: DEFAULT_TIMER_MODE,
      },
      updatedAt: NOW,
      version: DESKTOP_PERSISTENCE_VERSION,
    });
  });

  it("creates a normalized desktop manifest from a localStorage snapshot", () => {
    const olderRecord = createHistoryRecord("older", "2026-05-18T08:00:00.000Z");
    const newerRecord = createHistoryRecord("newer", "2026-05-19T08:00:00.000Z");
    const legacySession = createPersistedSession({
      activeTimerSegment: undefined as unknown as PersistedSession["activeTimerSegment"],
      timerMode: undefined as unknown as PersistedSession["timerMode"],
    });

    const manifest = createDesktopPersistenceJsonFromSnapshot(
      {
        [HISTORY_STORAGE_KEY]: JSON.stringify([olderRecord, { id: "bad" }, newerRecord]),
        [SESSION_STORAGE_KEY]: JSON.stringify(legacySession),
        [SETTINGS_STORAGE_KEY]: JSON.stringify({ timerMode: "prod" }),
      },
      {
        migratedAt: NOW,
        now: NOW,
      },
    );

    expect(manifest.history.map((record) => record.id)).toEqual(["newer", "older"]);
    expect(manifest.currentSession?.activeTimerSegment).toBeNull();
    expect(manifest.currentSession?.timerMode).toBe(DEFAULT_TIMER_MODE);
    expect(manifest.settings).toEqual({
      isAlwaysOnTop: false,
      timerMode: "prod",
    });
    expect(manifest.migrationSource).toBe("localStorage");
    expect(manifest.migratedAt).toBe(NOW);
  });

  it("normalizes invalid desktop manifests to a safe fallback", () => {
    expect(normalizeDesktopPersistenceJson({ version: 2 }, { now: NOW })).toEqual(
      createDefaultDesktopPersistenceJson({ now: NOW }),
    );

    const validRecord = createHistoryRecord("record-1", "2026-05-19T08:00:00.000Z");
    const normalized = normalizeDesktopPersistenceJson(
      {
        createdAt: "2026-05-19T07:00:00.000Z",
        currentSession: { phase: "setup", version: 1 },
        history: [validRecord, createHistoryRecord("record-1", "2026-05-20T08:00:00.000Z"), { bad: true }],
        migrationSource: "unknown",
        settings: { timerMode: "fast" },
        updatedAt: 123,
        version: 1,
      },
      { now: NOW },
    );

    expect(normalized.createdAt).toBe("2026-05-19T07:00:00.000Z");
    expect(normalized.updatedAt).toBe("2026-05-19T07:00:00.000Z");
    expect(normalized.history).toEqual([validRecord]);
    expect(normalized.currentSession).toBeNull();
    expect(normalized.settings).toEqual({
      isAlwaysOnTop: false,
      timerMode: DEFAULT_TIMER_MODE,
    });
    expect(normalized.migrationSource).toBeUndefined();
  });

  it("creates a persistence snapshot from a desktop manifest", () => {
    const record = createHistoryRecord("record-1", "2026-05-19T08:00:00.000Z");
    const manifest = {
      ...createDefaultDesktopPersistenceJson({ now: NOW }),
      currentSession: createPersistedSession(),
      history: [record],
      settings: {
        isAlwaysOnTop: true,
        timerMode: "prod" as const,
      },
    };

    const snapshot = createSnapshotFromDesktopPersistenceJson(manifest);

    expect(JSON.parse(snapshot[HISTORY_STORAGE_KEY] ?? "")).toEqual([record]);
    expect(JSON.parse(snapshot[SESSION_STORAGE_KEY] ?? "")).toEqual(manifest.currentSession);
    expect(JSON.parse(snapshot[SETTINGS_STORAGE_KEY] ?? "")).toEqual({
      isAlwaysOnTop: true,
      timerMode: "prod",
    });
  });

  it("omits the current session snapshot when no session is active", () => {
    const snapshot = createSnapshotFromDesktopPersistenceJson(createDefaultDesktopPersistenceJson({ now: NOW }));

    expect(snapshot[SESSION_STORAGE_KEY]).toBeUndefined();
  });

  it("updates a desktop manifest from the current persistence snapshot", () => {
    const currentManifest = {
      ...createDefaultDesktopPersistenceJson({
        migratedAt: "2026-05-19T08:00:00.000Z",
        migrationSource: "localStorage",
        now: "2026-05-19T08:00:00.000Z",
      }),
      history: [createHistoryRecord("old", "2026-05-19T08:00:00.000Z")],
    };
    const nextRecord = createHistoryRecord("next", "2026-05-20T07:00:00.000Z");

    const nextManifest = updateDesktopPersistenceJsonFromSnapshot(
      currentManifest,
      {
        [HISTORY_STORAGE_KEY]: JSON.stringify([nextRecord]),
        [SETTINGS_STORAGE_KEY]: JSON.stringify({ isAlwaysOnTop: true, timerMode: "prod" }),
      },
      { now: NOW },
    );

    expect(nextManifest.createdAt).toBe(currentManifest.createdAt);
    expect(nextManifest.updatedAt).toBe(NOW);
    expect(nextManifest.migratedAt).toBe(currentManifest.migratedAt);
    expect(nextManifest.migrationSource).toBe("localStorage");
    expect(nextManifest.history).toEqual([nextRecord]);
    expect(nextManifest.currentSession).toBeNull();
    expect(nextManifest.settings).toEqual({
      isAlwaysOnTop: true,
      timerMode: "prod",
    });
  });
});
