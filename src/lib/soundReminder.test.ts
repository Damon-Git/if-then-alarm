import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TimerNotificationKind } from "./notificationAdapter";

type MockAudioBuffer = AudioBuffer & {
  assetUrl: string;
};

type MockAudioBufferSource = AudioBufferSourceNode & {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
};

const audioContexts: MockAudioContext[] = [];
const audioSources: MockAudioBufferSource[] = [];

class MockAudioContext {
  destination = {};
  state = "running";

  constructor() {
    audioContexts.push(this);
  }

  createBufferSource() {
    const source = {
      buffer: null,
      connect: vi.fn(),
      onended: null,
      start: vi.fn(),
      stop: vi.fn(),
    } as unknown as MockAudioBufferSource;

    audioSources.push(source);
    return source;
  }

  createGain() {
    return {
      connect: vi.fn(),
      gain: {
        value: 1,
      },
    };
  }

  decodeAudioData(arrayBuffer: ArrayBuffer) {
    return Promise.resolve({
      assetUrl: new TextDecoder().decode(arrayBuffer),
    } as MockAudioBuffer);
  }

  resume() {
    return Promise.resolve();
  }
}

const setSoundReminderEnabled = async (isSoundReminderEnabled: boolean) => {
  const { createDefaultAppSettings, saveAppSettings } = await import("./settingsStorage");

  saveAppSettings({
    ...createDefaultAppSettings(),
    isSoundReminderEnabled,
  });
};

const scheduleAndRun = async (kind: TimerNotificationKind) => {
  const soundReminder = await import("./soundReminder");

  soundReminder.scheduleTimerSoundReminder({ delaySeconds: 0, kind });
  await vi.advanceTimersByTimeAsync(1000);

  return soundReminder;
};

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  window.localStorage.clear();
  audioContexts.length = 0;
  audioSources.length = 0;
  Object.defineProperty(window, "AudioContext", {
    configurable: true,
    value: MockAudioContext,
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => ({
      arrayBuffer: async () => new TextEncoder().encode(url).buffer,
      ok: true,
    })),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("sound reminder", () => {
  it("does not prepare or play audio when the saved setting is disabled", async () => {
    await setSoundReminderEnabled(false);
    await scheduleAndRun("incense-finished");

    expect(audioContexts).toHaveLength(0);
    expect(audioSources).toHaveLength(0);
  });

  it.each([
    ["incense-finished", "incense-finished.wav"],
    ["rest-finished", "rest-finished.wav"],
    ["ritual-completed", "ritual-completed.wav"],
  ] as const)("plays the bundled %s asset once", async (kind, expectedFilename) => {
    await setSoundReminderEnabled(true);
    await scheduleAndRun(kind);

    expect(audioContexts).toHaveLength(1);
    expect(audioSources).toHaveLength(1);
    expect((audioSources[0].buffer as MockAudioBuffer).assetUrl).toContain(expectedFilename);
    expect(audioSources[0].start).toHaveBeenCalledTimes(1);
  });

  it("keeps only the latest scheduled reminder", async () => {
    await setSoundReminderEnabled(true);
    const soundReminder = await import("./soundReminder");

    soundReminder.scheduleTimerSoundReminder({ delaySeconds: 2, kind: "incense-finished" });
    soundReminder.scheduleTimerSoundReminder({ delaySeconds: 1, kind: "rest-finished" });
    await vi.advanceTimersByTimeAsync(2000);

    expect(audioSources).toHaveLength(1);
    expect((audioSources[0].buffer as MockAudioBuffer).assetUrl).toContain("rest-finished.wav");
  });

  it("cancels a pending reminder before it can play", async () => {
    await setSoundReminderEnabled(true);
    const soundReminder = await import("./soundReminder");

    soundReminder.scheduleTimerSoundReminder({ delaySeconds: 1, kind: "incense-finished" });
    soundReminder.cancelTimerSoundReminder();
    await vi.advanceTimersByTimeAsync(1000);

    expect(audioSources).toHaveLength(0);
  });

  it("stops an active sound without removing a future timer when the setting is turned off", async () => {
    await setSoundReminderEnabled(true);
    const soundReminder = await scheduleAndRun("ritual-completed");

    await setSoundReminderEnabled(false);
    soundReminder.stopTimerSoundReminderPlayback();

    expect(audioSources).toHaveLength(1);
    expect(audioSources[0].stop).toHaveBeenCalledTimes(1);
  });
});
