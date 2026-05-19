import { describe, expect, it } from "vitest";
import {
  canChangeTimerSettings,
  getActiveIntentSet,
  hasBlockingRitualAction,
  hasUnsavedRitualSession,
  hasUnsavedSetupDraft,
  isTimerRestorable,
} from "./sessionGuards";
import type { IntentSet, IntentSetDraft, PersistedSession } from "../types";

const createIntentSet = (status: IntentSet["status"] = "idle"): IntentSet => ({
  id: `intent-${status}`,
  situationIntent: "当我打开电脑，就开始写作。",
  preventionIntents: [],
  incenseCount: 2,
  currentIncenseIndex: 1,
  status,
});

const createDraft = (overrides: Partial<IntentSetDraft> = {}): IntentSetDraft => ({
  id: "draft-1",
  situationIntent: "",
  preventionIntents: [],
  incenseCount: 1,
  ...overrides,
});

const createSession = (overrides: Partial<PersistedSession> = {}): PersistedSession => ({
  version: 1,
  phase: "ritual",
  intentSets: [createIntentSet("burning")],
  timerRemaining: 5,
  activeTimerSegment: null,
  activeModal: null,
  timerMode: "dev",
  updatedAt: "2026-05-19T00:00:00.000Z",
  ...overrides,
});

describe("session guards", () => {
  it("finds the active burning or resting intent set", () => {
    expect(getActiveIntentSet([createIntentSet("idle"), createIntentSet("burning")])?.status).toBe("burning");
    expect(getActiveIntentSet([createIntentSet("completed"), createIntentSet("resting")])?.status).toBe("resting");
    expect(getActiveIntentSet([createIntentSet("idle"), createIntentSet("completed")])).toBeNull();
  });

  it("detects unsaved setup drafts", () => {
    expect(hasUnsavedSetupDraft([createDraft()])).toBe(false);
    expect(hasUnsavedSetupDraft([createDraft(), createDraft({ id: "draft-2" })])).toBe(true);
    expect(hasUnsavedSetupDraft([createDraft({ situationIntent: "  当我坐下，就开始。  " })])).toBe(true);
    expect(hasUnsavedSetupDraft([createDraft({ preventionIntents: ["如果想刷手机，那么先休息。"] })])).toBe(true);
    expect(hasUnsavedSetupDraft([createDraft({ incenseCount: 2 })])).toBe(true);
  });

  it("detects unsaved ritual phases", () => {
    expect(hasUnsavedRitualSession("setup")).toBe(false);
    expect(hasUnsavedRitualSession("ritual")).toBe(true);
    expect(hasUnsavedRitualSession("review")).toBe(true);
  });

  it("detects whether a persisted timer can be restored directly", () => {
    expect(isTimerRestorable(createSession())).toBe(true);
    expect(isTimerRestorable(createSession({ timerRemaining: 0 }))).toBe(false);
    expect(isTimerRestorable(createSession({ activeModal: { type: "incense-finished", intentSetId: "intent-burning" } }))).toBe(
      false,
    );
    expect(isTimerRestorable(createSession({ intentSets: [createIntentSet("idle")] }))).toBe(false);
  });

  it("detects blocking ritual actions", () => {
    expect(
      hasBlockingRitualAction({
        activeModal: null,
        intentSets: [createIntentSet("idle")],
        pendingStartIntentId: null,
      }),
    ).toBe(false);

    expect(
      hasBlockingRitualAction({
        activeModal: null,
        intentSets: [createIntentSet("burning")],
        pendingStartIntentId: null,
      }),
    ).toBe(true);

    expect(
      hasBlockingRitualAction({
        activeModal: { type: "rest-finished", intentSetId: "intent-resting" },
        intentSets: [createIntentSet("idle")],
        pendingStartIntentId: null,
      }),
    ).toBe(true);

    expect(
      hasBlockingRitualAction({
        activeModal: null,
        intentSets: [createIntentSet("idle")],
        isAbandonConfirmOpen: true,
        pendingStartIntentId: null,
      }),
    ).toBe(true);
  });

  it("allows timer setting changes only outside unsaved or pending sessions", () => {
    expect(canChangeTimerSettings({ pendingSession: null, phase: "setup" })).toBe(true);
    expect(canChangeTimerSettings({ pendingSession: null, phase: "ritual" })).toBe(false);
    expect(canChangeTimerSettings({ pendingSession: createSession(), phase: "setup" })).toBe(false);
  });
});
