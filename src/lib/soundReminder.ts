import { loadAppSettings } from "./settingsStorage";
import type { TimerNotificationKind } from "./notificationAdapter";

type ScheduleTimerSoundReminderInput = {
  delaySeconds: number;
  kind: TimerNotificationKind;
};

type WebkitAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

const BELL_DURATION_SECONDS = 1.4;

let timerSoundTimeoutId: number | null = null;
let sharedAudioContext: AudioContext | null = null;

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

export const prepareTimerSoundReminder = async () => {
  if (!loadAppSettings().isSoundReminderEnabled) {
    return;
  }

  try {
    await getAudioContext();
  } catch {
    // Audio preparation can fail because of platform policy; the timer should continue.
  }
};

const playGeneratedBell = async (kind: TimerNotificationKind) => {
  const audioContext = await getAudioContext();

  if (!audioContext) {
    return;
  }

  const now = audioContext.currentTime;
  const output = audioContext.createGain();
  const baseFrequency = kind === "rest-finished" ? 392 : 523.25;

  output.gain.setValueAtTime(0.0001, now);
  output.gain.exponentialRampToValueAtTime(0.28, now + 0.02);
  output.gain.exponentialRampToValueAtTime(0.0001, now + BELL_DURATION_SECONDS);
  output.connect(audioContext.destination);

  [baseFrequency, baseFrequency * 2.01].forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(index === 0 ? 0.8 : 0.28, now);
    oscillator.connect(gain);
    gain.connect(output);
    oscillator.start(now);
    oscillator.stop(now + BELL_DURATION_SECONDS);
  });
};

const playTimerSoundReminder = async (kind: TimerNotificationKind) => {
  if (!loadAppSettings().isSoundReminderEnabled) {
    return;
  }

  try {
    await playGeneratedBell(kind);
  } catch {
    // Sound is an enhancement; timer, modal, and system notification remain authoritative.
  }
};

export const cancelTimerSoundReminder = () => {
  clearTimerSoundTimeout();
};

export const scheduleTimerSoundReminder = ({ delaySeconds, kind }: ScheduleTimerSoundReminderInput) => {
  clearTimerSoundTimeout();
  void prepareTimerSoundReminder();

  timerSoundTimeoutId = window.setTimeout(() => {
    timerSoundTimeoutId = null;
    void playTimerSoundReminder(kind);
  }, resolveSoundDelay(delaySeconds));
};
