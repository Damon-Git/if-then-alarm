import { beforeEach, describe, expect, it } from "vitest";
import { clearPersistedSession, loadPersistedSession, savePersistedSession, SESSION_STORAGE_KEY } from "./sessionStorage";
import type { PersistedSession } from "../types";

const createSession = (): Omit<PersistedSession, "version" | "updatedAt"> => ({
  activeModal: null,
  activeTimerSegment: {
    durationSeconds: 10,
    startedAt: "2026-05-19T10:00:00.000Z",
  },
  intentSets: [
    {
      currentIncenseIndex: 1,
      id: "intent-1",
      incenseCount: 2,
      preventionIntents: ["如果我分心，那么我先休息。"],
      situationIntent: "当我坐下，就开始写作。",
      status: "burning",
    },
  ],
  phase: "ritual",
  timerMode: "dev",
  timerRemaining: 8,
});

describe("session storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("saves and loads current session", () => {
    const saved = savePersistedSession(createSession());
    const loaded = loadPersistedSession();

    expect(loaded).toEqual(saved);
  });

  it("loads legacy sessions without active timer segment", () => {
    window.localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        activeModal: null,
        intentSets: createSession().intentSets,
        phase: "ritual",
        timerMode: "dev",
        timerRemaining: 7,
        updatedAt: "2026-05-19T10:00:00.000Z",
        version: 1,
      }),
    );

    expect(loadPersistedSession()?.activeTimerSegment).toBeNull();
  });

  it("rejects invalid sessions", () => {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ phase: "setup", version: 1 }));

    expect(loadPersistedSession()).toBeNull();
  });

  it("clears persisted session", () => {
    savePersistedSession(createSession());
    clearPersistedSession();

    expect(loadPersistedSession()).toBeNull();
  });
});
