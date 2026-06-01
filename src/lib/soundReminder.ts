import { loadAppSettings } from "./settingsStorage";
import type { TimerNotificationKind } from "./notificationAdapter";
import incenseFinishedBellUrl from "../assets/sounds/incense-finished.wav?url";
import restFinishedBellUrl from "../assets/sounds/rest-finished.wav?url";
import ritualCompletedBellUrl from "../assets/sounds/ritual-completed.wav?url";

type ScheduleTimerSoundReminderInput = {
  delaySeconds: number;
  kind: TimerNotificationKind;
};

type WebkitAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

const BELL_PLAYBACK_GAIN = 0.68;
const BELL_ASSET_URLS: Record<TimerNotificationKind, string> = {
  "incense-finished": incenseFinishedBellUrl,
  "rest-finished": restFinishedBellUrl,
  "ritual-completed": ritualCompletedBellUrl,
};

let timerSoundTimeoutId: number | null = null;
let sharedAudioContext: AudioContext | null = null;
let activeBellSource: AudioBufferSourceNode | null = null;
let latestPlaybackRequestId = 0;
const bellBufferPromises = new Map<TimerNotificationKind, Promise<AudioBuffer>>();

const resolveSoundDelay = (delaySeconds: number) => Math.max(delaySeconds, 1) * 1000;

const clearTimerSoundTimeout = () => {
  if (timerSoundTimeoutId === null) {
    return;
  }

  window.clearTimeout(timerSoundTimeoutId);
  timerSoundTimeoutId = null;
};

const getAudioContext = async () => {
  const AudioContextConstructor = window.AudioContext ?? (window as WebkitAudioWindow).webkitAudioContext;

  if (!AudioContextConstructor) {
    return null;
  }

  sharedAudioContext ??= new AudioContextConstructor();

  if (sharedAudioContext.state === "suspended") {
    await sharedAudioContext.resume();
  }

  return sharedAudioContext;
};

const loadBellBuffer = (audioContext: AudioContext, kind: TimerNotificationKind) => {
  const existingPromise = bellBufferPromises.get(kind);

  if (existingPromise) {
    return existingPromise;
  }

  const bufferPromise = fetch(BELL_ASSET_URLS[kind])
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Could not load sound reminder asset: ${kind}`);
      }

      return response.arrayBuffer();
    })
    .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
    .catch((error) => {
      bellBufferPromises.delete(kind);
      throw error;
    });

  bellBufferPromises.set(kind, bufferPromise);
  return bufferPromise;
};

const stopActiveBellPlayback = () => {
  if (!activeBellSource) {
    return;
  }

  try {
    activeBellSource.stop();
  } catch {
    // The source may already have ended.
  }

  activeBellSource = null;
};

export const stopTimerSoundReminderPlayback = () => {
  latestPlaybackRequestId += 1;
  stopActiveBellPlayback();
};

export const prepareTimerSoundReminder = async () => {
  if (!loadAppSettings().isSoundReminderEnabled) {
    return;
  }

  try {
    const audioContext = await getAudioContext();

    if (!audioContext) {
      return;
    }

    await Promise.all(
      (Object.keys(BELL_ASSET_URLS) as TimerNotificationKind[]).map((kind) => loadBellBuffer(audioContext, kind)),
    );
  } catch {
    // Audio preparation can fail because of platform policy; the timer should continue.
  }
};

const playLocalBell = async (kind: TimerNotificationKind) => {
  const playbackRequestId = ++latestPlaybackRequestId;
  const audioContext = await getAudioContext();

  if (!audioContext) {
    return;
  }

  const bellBuffer = await loadBellBuffer(audioContext, kind);

  if (playbackRequestId !== latestPlaybackRequestId || !loadAppSettings().isSoundReminderEnabled) {
    return;
  }

  stopActiveBellPlayback();

  const source = audioContext.createBufferSource();
  const output = audioContext.createGain();

  source.buffer = bellBuffer;
  output.gain.value = BELL_PLAYBACK_GAIN;
  source.connect(output);
  output.connect(audioContext.destination);
  activeBellSource = source;
  source.onended = () => {
    if (activeBellSource === source) {
      activeBellSource = null;
    }
  };
  source.start();
};

const playTimerSoundReminder = async (kind: TimerNotificationKind) => {
  if (!loadAppSettings().isSoundReminderEnabled) {
    return;
  }

  try {
    await playLocalBell(kind);
  } catch {
    // Sound is an enhancement; timer, modal, and system notification remain authoritative.
  }
};

export const cancelTimerSoundReminder = () => {
  clearTimerSoundTimeout();
  stopTimerSoundReminderPlayback();
};

export const scheduleTimerSoundReminder = ({ delaySeconds, kind }: ScheduleTimerSoundReminderInput) => {
  clearTimerSoundTimeout();
  stopTimerSoundReminderPlayback();
  void prepareTimerSoundReminder();

  timerSoundTimeoutId = window.setTimeout(() => {
    timerSoundTimeoutId = null;
    void playTimerSoundReminder(kind);
  }, resolveSoundDelay(delaySeconds));
};
