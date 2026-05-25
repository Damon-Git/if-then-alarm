import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_TIMER_MODE } from "../constants";
import type { AppSettings, HistoryRecord, PersistedSession } from "../types";
import { DESKTOP_PERSISTENCE_VERSION } from "./desktopPersistenceSchema";
import {
  applyFullBackupPayload,
  createFullBackupPayload,
  parseFullBackupPayload,
  stringifyFullBackupPayload,
} from "./fullBackup";
import {
  HISTORY_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  persistenceAdapter,
  resetPersistenceAdapterForTest,
} from "./persistenceAdapter";

const NOW = "2026-05-25T08:00:00.000Z";

const createHistoryRecord = (id: string, createdAt = NOW): HistoryRecord => ({
  createdAt,
  id,
  intentSets: [
    {
      incenseCount: 1,
      preventionIntents: ["如果我想刷手机，那么我先闭眼休息。"],
      situationIntent: "当我坐到桌前，就开始写作。",
    },
  ],
  result: "completed",
  reviewText: "完成一轮。",
  timerMode: "dev",
});

const createSession = (): PersistedSession => ({
  activeModal: null,
  activeTimerSegment: null,
  intentSets: [
    {
      currentIncenseIndex: 1,
      id: "intent-1",
      incenseCount: 2,
      preventionIntents: [],
      situationIntent: "当我打开电脑，就开始写作。",
      status: "burning",
    },
  ],
  phase: "ritual",
  timerMode: "dev",
  timerRemaining: 8,
  updatedAt: NOW,
  version: 1,
});

const settings: AppSettings = {
  isAlwaysOnTop: true,
  isDockVisible: false,
  isSoundReminderEnabled: true,
  timerMode: "prod",
};

describe("full backup", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetPersistenceAdapterForTest();
  });

  it("creates a desktop persistence shaped backup payload", () => {
    const payload = createFullBackupPayload(
      {
        currentSession: createSession(),
        history: [createHistoryRecord("record-1")],
        settings,
      },
      { now: NOW },
    );

    expect(payload).toMatchObject({
      createdAt: NOW,
      currentSession: createSession(),
      history: [createHistoryRecord("record-1")],
      migrationSource: "desktop-json",
      settings,
      updatedAt: NOW,
      version: DESKTOP_PERSISTENCE_VERSION,
    });
  });

  it("parses and normalizes full backup payloads", () => {
    const olderRecord = createHistoryRecord("older", "2026-05-24T08:00:00.000Z");
    const newerRecord = createHistoryRecord("newer", "2026-05-25T08:00:00.000Z");
    const rawValue = stringifyFullBackupPayload({
      createdAt: "2026-05-24T07:00:00.000Z",
      currentSession: createSession(),
      history: [olderRecord, { bad: true } as unknown as HistoryRecord, newerRecord],
      settings: { timerMode: "prod" } as AppSettings,
      updatedAt: NOW,
      version: DESKTOP_PERSISTENCE_VERSION,
    });

    const payload = parseFullBackupPayload(rawValue);

    expect(payload.history.map((record) => record.id)).toEqual(["newer", "older"]);
    expect(payload.settings).toEqual({
      isAlwaysOnTop: false,
      isDockVisible: true,
      isSoundReminderEnabled: false,
      timerMode: "prod",
    });
    expect(payload.currentSession).toEqual(createSession());
  });

  it("rejects payloads without the full backup shape", () => {
    expect(() => parseFullBackupPayload("{")).toThrow();
    expect(() => parseFullBackupPayload(JSON.stringify({ version: 1, records: [] }))).toThrow(
      "INVALID_FULL_BACKUP",
    );
    expect(() =>
      parseFullBackupPayload(
        JSON.stringify({
          createdAt: NOW,
          currentSession: null,
          history: [],
          settings: {},
          updatedAt: NOW,
          version: 2,
        }),
      ),
    ).toThrow("INVALID_FULL_BACKUP");
  });

  it("applies full backups to all persistence keys", () => {
    const record = createHistoryRecord("record-1");
    const session = createSession();
    const payload = createFullBackupPayload(
      {
        currentSession: session,
        history: [record],
        settings,
      },
      { now: NOW },
    );

    applyFullBackupPayload(payload);

    expect(JSON.parse(persistenceAdapter.getItem(HISTORY_STORAGE_KEY) ?? "")).toEqual([record]);
    expect(JSON.parse(persistenceAdapter.getItem(SESSION_STORAGE_KEY) ?? "")).toEqual(session);
    expect(JSON.parse(persistenceAdapter.getItem(SETTINGS_STORAGE_KEY) ?? "")).toEqual(settings);
  });

  it("removes the persisted session when a full backup has no active session", () => {
    persistenceAdapter.setItem(SESSION_STORAGE_KEY, JSON.stringify(createSession()));

    applyFullBackupPayload(
      createFullBackupPayload(
        {
          currentSession: null,
          history: [],
          settings: {
            isAlwaysOnTop: false,
            isDockVisible: true,
            isSoundReminderEnabled: false,
            timerMode: DEFAULT_TIMER_MODE,
          },
        },
        { now: NOW },
      ),
    );

    expect(persistenceAdapter.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });
});

