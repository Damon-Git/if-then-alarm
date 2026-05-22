import { isCurrentDocumentWindowCompact, isTauriRuntime } from "./tauriWindow";

const TIMER_NOTIFICATION_ID = 20260516;

export type TimerNotificationKind = "incense-finished" | "rest-finished" | "ritual-completed";

type ScheduleTimerNotificationInput = {
  delaySeconds: number;
  kind: TimerNotificationKind;
};

let timerNotificationTimeoutId: number | null = null;

const getNotificationCopy = (kind: TimerNotificationKind) => {
  if (kind === "rest-finished") {
    return "休息结束，是否继续下一炷香？";
  }

  if (kind === "ritual-completed") {
    return isCurrentDocumentWindowCompact() ? "本轮已完成，点击香炉回到完整窗口复盘。" : "本轮已完成，请填写复盘。";
  }

  return "这一炷香已经烧完。";
};

const resolveNotificationDelay = (delaySeconds: number) => Math.max(delaySeconds, 1) * 1000;

const requestNotificationPermission = async () => {
  const { isPermissionGranted, requestPermission } = await import("@tauri-apps/plugin-notification");

  if (await isPermissionGranted()) {
    return true;
  }

  return (await requestPermission()) === "granted";
};

const clearTimerNotificationTimeout = () => {
  if (timerNotificationTimeoutId === null) {
    return;
  }

  window.clearTimeout(timerNotificationTimeoutId);
  timerNotificationTimeoutId = null;
};

const sendTimerNotification = async (kind: TimerNotificationKind) => {
  const { sendNotification } = await import("@tauri-apps/plugin-notification");

  sendNotification({
    id: TIMER_NOTIFICATION_ID,
    title: "急急如律令",
    body: getNotificationCopy(kind),
  });
};

export const cancelTimerNotification = async () => {
  clearTimerNotificationTimeout();

  if (!isTauriRuntime()) {
    return;
  }

  const { cancel } = await import("@tauri-apps/plugin-notification");

  try {
    await cancel([TIMER_NOTIFICATION_ID]);
  } catch {
    // The notification may already have fired or may not exist yet.
  }
};

export const scheduleTimerNotification = async ({ delaySeconds, kind }: ScheduleTimerNotificationInput) => {
  if (!isTauriRuntime()) {
    return;
  }

  try {
    if (!(await requestNotificationPermission())) {
      return;
    }

    await cancelTimerNotification();

    timerNotificationTimeoutId = window.setTimeout(() => {
      timerNotificationTimeoutId = null;
      void sendTimerNotification(kind);
    }, resolveNotificationDelay(delaySeconds));
  } catch {
    // Notifications are an enhancement; timer and recovery state remain authoritative.
  }
};
