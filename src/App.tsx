import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { START_TALISMAN_BURN_MS, TIMER_MODE_CONFIG } from "./constants";
import AbandonSessionModal from "./components/AbandonSessionModal";
import BreakModal from "./components/BreakModal";
import ConfirmModal from "./components/ConfirmModal";
import HistoryPanel from "./components/HistoryPanel";
import ReviewPanel from "./components/ReviewPanel";
import RestoreSessionModal from "./components/RestoreSessionModal";
import RitualStage from "./components/RitualStage";
import SettingsPanel from "./components/SettingsPanel";
import StartIntentConfirmModal from "./components/StartIntentConfirmModal";
import SetupForm from "./components/SetupForm";
import ToastHost from "./components/ToastHost";
import VisualAssetPreviewPanel from "./components/VisualAssetPreviewPanel";
import {
  DESKTOP_PERSISTENCE_WRITE_ERROR_EVENT,
  consumeDesktopPersistenceInitializationResult,
} from "./lib/desktopPersistenceAdapter";
import type { DesktopPersistenceJson } from "./lib/desktopPersistenceSchema";
import {
  downloadTextFile,
  readTextFile,
  selectAndReadTextFile,
  shouldUseDesktopFileDialog,
} from "./lib/fileTransferAdapter";
import {
  applyFullBackupPayload,
  createFullBackupPayload,
  parseFullBackupPayload,
  stringifyFullBackupPayload,
} from "./lib/fullBackup";
import { cancelTimerNotification, scheduleTimerNotification } from "./lib/notificationAdapter";
import type { TimerNotificationKind } from "./lib/notificationAdapter";
import { clearPersistedSession, loadPersistedSession, savePersistedSession } from "./lib/sessionStorage";
import {
  cancelTimerSoundReminder,
  prepareTimerSoundReminder,
  scheduleTimerSoundReminder,
  stopTimerSoundReminderPlayback,
} from "./lib/soundReminder";
import { createActiveTimerSegment, formatDurationLabel, getTimerRemainingSeconds } from "./lib/timer";
import {
  closeCurrentTauriWindow,
  compactCurrentTauriWindow,
  expandCurrentTauriWindow,
  isTauriRuntime,
  listenForTauriCloseRequest,
  setCurrentTauriWindowAlwaysOnTop,
  setTauriDockVisibility,
} from "./lib/tauriWindow";
import { loadAppSettings, saveAppSettings } from "./lib/settingsStorage";
import {
  canChangeTimerSettings,
  canEnterReviewPhase,
  getFocusTimerNotificationKind,
  getActiveIntentSet,
  hasBlockingRitualAction,
  hasUnsavedRitualSession,
  isTimerRestorable,
} from "./lib/sessionGuards";
import {
  clearHistoryRecords,
  createHistoryExportPayload,
  deleteHistoryRecord,
  importHistoryExportPayload,
  loadHistoryRecords,
  saveHistoryRecord,
} from "./lib/storage";
import type {
  ActiveModal,
  ActiveTimerSegment,
  AppPhase,
  AppSettings,
  HistoryRecord,
  IntentSet,
  PersistedSession,
  ReviewInput,
  TimerMode,
  ToastMessage,
} from "./types";

type UtilityPanel = "history" | "settings" | "visual-assets";

type ConfirmationRequest =
  | {
      recordId: string;
      type: "delete-history-record";
    }
  | {
      type: "clear-history-records";
    }
  | {
      payload: DesktopPersistenceJson;
      type: "import-full-backup";
    };

type TauriCloseRequest =
  | {
      type: "active-session";
    }
  | {
      type: "setup-draft";
    };

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const resolvePersistedSession = (session: PersistedSession): PersistedSession => {
  const activeIntentSet = getActiveIntentSet(session.intentSets);

  if (!activeIntentSet || !session.activeTimerSegment || session.activeModal) {
    return session;
  }

  const timerRemaining = getTimerRemainingSeconds(session.activeTimerSegment);

  if (timerRemaining > 0) {
    return {
      ...session,
      timerRemaining,
    };
  }

  if (activeIntentSet.status === "resting") {
    return {
      ...session,
      activeModal: {
        type: "rest-finished",
        intentSetId: activeIntentSet.id,
      },
      activeTimerSegment: null,
      timerRemaining: 0,
    };
  }

  if (activeIntentSet.currentIncenseIndex < activeIntentSet.incenseCount) {
    return {
      ...session,
      activeModal: {
        type: "incense-finished",
        intentSetId: activeIntentSet.id,
      },
      activeTimerSegment: null,
      timerRemaining: 0,
    };
  }

  const nextIntentSets = session.intentSets.map((intentSet) =>
    intentSet.id === activeIntentSet.id ? { ...intentSet, status: "completed" as const } : intentSet,
  );

  return {
    ...session,
    activeModal: null,
    activeTimerSegment: null,
    intentSets: nextIntentSets,
    phase: session.phase,
    timerRemaining: 0,
  };
};

const App = () => {
  const [phase, setPhase] = useState<AppPhase>("setup");
  const [intentSets, setIntentSets] = useState<IntentSet[]>([]);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);
  const [activeTimerSegment, setActiveTimerSegment] = useState<ActiveTimerSegment | null>(null);
  const [confirmationRequest, setConfirmationRequest] = useState<ConfirmationRequest | null>(null);
  const [pendingStartIntentId, setPendingStartIntentId] = useState<string | null>(null);
  const [startingIntentId, setStartingIntentId] = useState<string | null>(null);
  const [isAbandonConfirmOpen, setIsAbandonConfirmOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings());
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>(() => loadHistoryRecords());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [pendingSession, setPendingSession] = useState<PersistedSession | null>(() => {
    const persistedSession = loadPersistedSession();
    return persistedSession ? resolvePersistedSession(persistedSession) : null;
  });
  const [activeUtilityPanel, setActiveUtilityPanel] = useState<UtilityPanel | null>(null);
  const [hasUnsavedSetupDraft, setHasUnsavedSetupDraft] = useState(false);
  const [tauriCloseRequest, setTauriCloseRequest] = useState<TauriCloseRequest | null>(null);

  const activeIntentSet = useMemo(() => getActiveIntentSet(intentSets), [intentSets]);

  const activeIntentSetKey = activeIntentSet
    ? `${activeIntentSet.id}-${activeIntentSet.status}-${activeIntentSet.currentIncenseIndex}`
    : "";

  const modalIntentSet = activeModal
    ? intentSets.find((intentSet) => intentSet.id === activeModal.intentSetId) ?? null
    : null;
  const pendingStartIntentSet = pendingStartIntentId
    ? intentSets.find((intentSet) => intentSet.id === pendingStartIntentId) ?? null
    : null;

  const hasUnsavedSession = hasUnsavedRitualSession(phase);
  const timerConfig = TIMER_MODE_CONFIG[settings.timerMode];
  const closeStateRef = useRef({
    hasUnsavedSession: false,
    hasUnsavedSetupDraft: false,
    isCloseConfirmOpen: false,
  });
  const isOpeningFullWindowRef = useRef(false);
  const startAnimationTimeoutRef = useRef<number | null>(null);

  const clearStartAnimationTimeout = () => {
    if (startAnimationTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(startAnimationTimeoutRef.current);
    startAnimationTimeoutRef.current = null;
  };

  useEffect(
    () => () => {
      clearStartAnimationTimeout();
    },
    [],
  );

  useEffect(() => {
    expandCurrentTauriWindow().catch(() => {
      // Later user actions still retry full-window restoration and surface a toast if needed.
    });
  }, []);

  useEffect(() => {
    closeStateRef.current = {
      hasUnsavedSession,
      hasUnsavedSetupDraft,
      isCloseConfirmOpen: Boolean(tauriCloseRequest),
    };
  }, [hasUnsavedSession, hasUnsavedSetupDraft, tauriCloseRequest]);

  useEffect(() => {
    setCurrentTauriWindowAlwaysOnTop(settings.isAlwaysOnTop).catch(() => {
      showToast("error", "窗口置顶设置未能生效。");
    });
  }, [settings.isAlwaysOnTop]);

  useEffect(() => {
    setTauriDockVisibility(settings.isDockVisible).catch(() => {
      showToast("error", "Dock 显示设置未能生效。");
    });
  }, [settings.isDockVisible]);

  const showToast = (type: ToastMessage["type"], message: string) => {
    const id = createId();

    setToasts((currentToasts) => [...currentToasts, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
    }, 4200);
  };

  const dismissToast = (toastId: string) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== toastId));
  };

  useEffect(() => {
    const persistenceResult = consumeDesktopPersistenceInitializationResult();

    if (!persistenceResult) {
      return;
    }

    if (!persistenceResult.enabled) {
      if (persistenceResult.reason === "not-tauri") {
        return;
      }

      showToast("error", "桌面数据文件暂不可用，本次将临时使用浏览器存储。");
      return;
    }

    if (persistenceResult.corruptBackupPath) {
      showToast("info", "本地数据文件异常，已保留备份并尝试恢复。");
      return;
    }

    if (persistenceResult.source === "localStorage") {
      showToast("success", "已迁移到桌面本地数据文件。");
    }
  }, []);

  useEffect(() => {
    const handleWriteError = () => {
      showToast("error", "本地数据文件写入失败，本次更改可能暂未落盘。");
    };

    window.addEventListener(DESKTOP_PERSISTENCE_WRITE_ERROR_EVENT, handleWriteError);

    return () => {
      window.removeEventListener(DESKTOP_PERSISTENCE_WRITE_ERROR_EVENT, handleWriteError);
    };
  }, []);

  const beginTimer = (durationSeconds: number, notificationKind: TimerNotificationKind) => {
    setTimerRemaining(durationSeconds);
    setActiveTimerSegment(createActiveTimerSegment(durationSeconds));
    void scheduleTimerNotification({ delaySeconds: durationSeconds, kind: notificationKind });
    scheduleTimerSoundReminder({ delaySeconds: durationSeconds, kind: notificationKind });
  };

  const compactAfterTimerStarts = () => {
    if (!isTauriRuntime()) {
      return;
    }

    compactCurrentTauriWindow()
      .then((didCompact) => {
        if (!didCompact) {
          showToast("error", "小窗未能收起，计时仍在继续。");
        }
      })
      .catch(() => {
        showToast("error", "小窗未能收起，计时仍在继续。");
      });
  };

  useEffect(() => {
    if (
      !activeIntentSet ||
      !activeTimerSegment ||
      activeModal ||
      pendingStartIntentId ||
      startingIntentId ||
      isAbandonConfirmOpen
    ) {
      return;
    }

    const syncTimerRemaining = () => {
      setTimerRemaining(getTimerRemainingSeconds(activeTimerSegment));
    };

    syncTimerRemaining();

    const intervalId = window.setInterval(syncTimerRemaining, 1000);

    return () => window.clearInterval(intervalId);
  }, [
    activeIntentSetKey,
    activeIntentSet,
    activeTimerSegment,
    activeModal,
    pendingStartIntentId,
    startingIntentId,
    isAbandonConfirmOpen,
  ]);

  useEffect(() => {
    if (
      !activeIntentSet ||
      activeModal ||
      pendingStartIntentId ||
      startingIntentId ||
      isAbandonConfirmOpen ||
      timerRemaining !== 0
    ) {
      return;
    }

    if (activeIntentSet.status === "burning") {
      setActiveTimerSegment(null);

      if (activeIntentSet.currentIncenseIndex < activeIntentSet.incenseCount) {
        setActiveModal({
          type: "incense-finished",
          intentSetId: activeIntentSet.id,
        });
        return;
      }

      setIntentSets((currentIntentSets) =>
        currentIntentSets.map((intentSet) =>
          intentSet.id === activeIntentSet.id ? { ...intentSet, status: "completed" } : intentSet,
        ),
      );
    }

    if (activeIntentSet.status === "resting") {
      setActiveTimerSegment(null);
      setActiveModal({
        type: "rest-finished",
        intentSetId: activeIntentSet.id,
      });
    }
  }, [
    activeIntentSet,
    activeIntentSetKey,
    activeModal,
    pendingStartIntentId,
    startingIntentId,
    isAbandonConfirmOpen,
    timerRemaining,
  ]);

  useEffect(() => {
    if (!hasUnsavedSession) {
      return;
    }

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeUnload);

    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedSession]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let isMounted = true;

    listenForTauriCloseRequest(() => {
      const { hasUnsavedSession, hasUnsavedSetupDraft, isCloseConfirmOpen } = closeStateRef.current;

      if (isCloseConfirmOpen) {
        return true;
      }

      if (hasUnsavedSession) {
        setTauriCloseRequest({ type: "active-session" });
        return true;
      }

      if (hasUnsavedSetupDraft) {
        setTauriCloseRequest({ type: "setup-draft" });
        return true;
      }

      return false;
    })
      .then((nextUnlisten) => {
        if (isMounted) {
          unlisten = nextUnlisten;
          return;
        }

        nextUnlisten();
      })
      .catch(() => {
        // Keep browser behavior unchanged if the Tauri listener cannot be registered.
      });

    return () => {
      isMounted = false;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    if (!hasUnsavedSession || intentSets.length === 0) {
      return;
    }

    savePersistedSession({
      phase: phase as Exclude<AppPhase, "setup">,
      intentSets,
      timerRemaining,
      activeTimerSegment,
      activeModal,
      timerMode: settings.timerMode,
    });
  }, [activeModal, activeTimerSegment, hasUnsavedSession, intentSets, phase, settings.timerMode, timerRemaining]);

  const startRitual = (nextIntentSets: IntentSet[]) => {
    setIntentSets(nextIntentSets);
    setTimerRemaining(0);
    setActiveTimerSegment(null);
    setActiveModal(null);
    setPendingStartIntentId(null);
    setStartingIntentId(null);
    setIsAbandonConfirmOpen(false);
    setActiveUtilityPanel(null);
    void cancelTimerNotification();
    cancelTimerSoundReminder();
    clearStartAnimationTimeout();
    setHasUnsavedSetupDraft(false);
    setPhase("ritual");
    expandCurrentTauriWindow().catch(() => {
      showToast("error", "完整仪式台未能打开。");
    });
  };

  const requestStartIntent = (intentSetId: string) => {
    if (activeIntentSet || activeModal || pendingStartIntentId || startingIntentId || isAbandonConfirmOpen) {
      return;
    }

    setPendingStartIntentId(intentSetId);
  };

  const requestFullRitualView = () => {
    if (isOpeningFullWindowRef.current) {
      return;
    }

    isOpeningFullWindowRef.current = true;

    expandCurrentTauriWindow()
      .then((didOpenFullWindow) => {
        if (!didOpenFullWindow) {
          showToast("error", "完整窗口未能打开。");
        }
      })
      .catch(() => {
        showToast("error", "完整窗口未能打开，请再次点击香炉重试。");
      })
      .finally(() => {
        isOpeningFullWindowRef.current = false;
      });
  };

  const requestReview = () => {
    if (!canEnterReviewPhase({ intentSets, phase })) {
      return;
    }

    setActiveUtilityPanel(null);
    setPhase("review");
  };

  const cancelStartIntent = () => {
    setPendingStartIntentId(null);
  };

  const confirmStartIntent = () => {
    if (!pendingStartIntentId || activeIntentSet || activeModal || startingIntentId) {
      return;
    }

    const targetIntentSet = intentSets.find((intentSet) => intentSet.id === pendingStartIntentId);

    if (!targetIntentSet || targetIntentSet.status !== "idle") {
      setPendingStartIntentId(null);
      return;
    }

    const targetIntentSetId = targetIntentSet.id;
    const notificationKind = getFocusTimerNotificationKind({
      intentSetId: targetIntentSetId,
      intentSets,
      nextIncenseIndex: 1,
    });

    setPendingStartIntentId(null);
    setStartingIntentId(targetIntentSetId);
    clearStartAnimationTimeout();

    startAnimationTimeoutRef.current = window.setTimeout(() => {
      startAnimationTimeoutRef.current = null;
      setIntentSets((currentIntentSets) =>
        currentIntentSets.map((intentSet) =>
          intentSet.id === targetIntentSetId && intentSet.status === "idle"
            ? { ...intentSet, currentIncenseIndex: 1, status: "burning" }
            : intentSet,
        ),
      );
      beginTimer(timerConfig.focusSeconds, notificationKind);
      compactAfterTimerStarts();
      setStartingIntentId(null);
    }, START_TALISMAN_BURN_MS);
  };

  const startBreak = (intentSetId: string) => {
    setIntentSets((currentIntentSets) =>
      currentIntentSets.map((intentSet) =>
        intentSet.id === intentSetId ? { ...intentSet, status: "resting" } : intentSet,
      ),
    );
    beginTimer(timerConfig.breakSeconds, "rest-finished");
    compactAfterTimerStarts();
    setActiveModal(null);
  };

  const continueNextIncense = (intentSetId: string) => {
    const targetIntentSet = intentSets.find((intentSet) => intentSet.id === intentSetId);

    if (!targetIntentSet || targetIntentSet.currentIncenseIndex >= targetIntentSet.incenseCount) {
      setIntentSets((currentIntentSets) =>
        currentIntentSets.map((intentSet) =>
          intentSet.id === intentSetId ? { ...intentSet, status: "completed" } : intentSet,
        ),
      );
      setTimerRemaining(0);
      setActiveTimerSegment(null);
      setActiveModal(null);
      return;
    }

    const nextIncenseIndex = targetIntentSet.currentIncenseIndex + 1;
    const notificationKind = getFocusTimerNotificationKind({
      intentSetId,
      intentSets,
      nextIncenseIndex,
    });

    setIntentSets((currentIntentSets) =>
      currentIntentSets.map((intentSet) => {
        if (intentSet.id !== intentSetId) {
          return intentSet;
        }

        return {
          ...intentSet,
          currentIncenseIndex: intentSet.currentIncenseIndex + 1,
          status: "burning",
        };
      }),
    );
    beginTimer(timerConfig.focusSeconds, notificationKind);
    compactAfterTimerStarts();
    setActiveModal(null);
  };

  const requestAbandonSession = () => {
    if (activeTimerSegment) {
      setTimerRemaining(getTimerRemainingSeconds(activeTimerSegment));
      setActiveTimerSegment(null);
      void cancelTimerNotification();
      cancelTimerSoundReminder();
    }

    setIsAbandonConfirmOpen(true);
  };

  const cancelAbandonSession = () => {
    if (activeIntentSet && timerRemaining > 0) {
      setActiveTimerSegment(createActiveTimerSegment(timerRemaining));
      const reminderKind =
        activeIntentSet.status === "resting"
          ? "rest-finished"
          : getFocusTimerNotificationKind({
              intentSetId: activeIntentSet.id,
              intentSets,
              nextIncenseIndex: activeIntentSet.currentIncenseIndex,
            });

      void scheduleTimerNotification({ delaySeconds: timerRemaining, kind: reminderKind });
      scheduleTimerSoundReminder({ delaySeconds: timerRemaining, kind: reminderKind });
    }

    setIsAbandonConfirmOpen(false);
  };

  const abandonCurrentSession = ({ restoreWindow = true } = {}) => {
    setIntentSets([]);
    setTimerRemaining(0);
    setActiveTimerSegment(null);
    setActiveModal(null);
    setPendingStartIntentId(null);
    setStartingIntentId(null);
    setIsAbandonConfirmOpen(false);
    setActiveUtilityPanel(null);
    void cancelTimerNotification();
    cancelTimerSoundReminder();
    clearStartAnimationTimeout();
    setPhase("setup");
    clearPersistedSession();

    if (restoreWindow) {
      expandCurrentTauriWindow().catch(() => {
        showToast("error", "完整窗口未能恢复。");
      });
    }
  };

  const confirmAbandonSession = () => {
    abandonCurrentSession();
  };

  const restorePendingSession = () => {
    if (!pendingSession) {
      return;
    }

    const resolvedSession = resolvePersistedSession(pendingSession);
    const restoredTimerSegment = isTimerRestorable(resolvedSession)
      ? resolvedSession.activeTimerSegment ?? createActiveTimerSegment(resolvedSession.timerRemaining)
      : null;

    setIntentSets(resolvedSession.intentSets);
    setTimerRemaining(resolvedSession.timerRemaining);
    setActiveTimerSegment(restoredTimerSegment);
    setActiveModal(resolvedSession.activeModal);
    setPendingStartIntentId(null);
    setStartingIntentId(null);
    setIsAbandonConfirmOpen(false);
    clearStartAnimationTimeout();
    setSettings((currentSettings) => saveAppSettings({ ...currentSettings, timerMode: resolvedSession.timerMode }));
    setActiveUtilityPanel(null);
    setPhase(resolvedSession.phase);
    setPendingSession(null);

    expandCurrentTauriWindow().catch(() => {
      showToast("error", "窗口状态未能恢复。");
    });

    if (restoredTimerSegment) {
      const restoredActiveIntentSet = getActiveIntentSet(resolvedSession.intentSets);
      const restoredNotificationKind =
        restoredActiveIntentSet?.status === "resting"
          ? "rest-finished"
          : restoredActiveIntentSet
            ? getFocusTimerNotificationKind({
                intentSetId: restoredActiveIntentSet.id,
                intentSets: resolvedSession.intentSets,
                nextIncenseIndex: restoredActiveIntentSet.currentIncenseIndex,
              })
            : "incense-finished";

      void scheduleTimerNotification({
        delaySeconds: resolvedSession.timerRemaining,
        kind: restoredNotificationKind,
      });
      scheduleTimerSoundReminder({
        delaySeconds: resolvedSession.timerRemaining,
        kind: restoredNotificationKind,
      });
    }
  };

  const discardPendingSession = () => {
    clearPersistedSession();
    void cancelTimerNotification();
    cancelTimerSoundReminder();
    setPendingSession(null);
  };

  const saveReview = (review: ReviewInput) => {
    const record: HistoryRecord = {
      id: createId(),
      createdAt: new Date().toISOString(),
      intentSets: intentSets.map((intentSet) => ({
        situationIntent: intentSet.situationIntent,
        preventionIntents: intentSet.preventionIntents,
        incenseCount: intentSet.incenseCount,
      })),
      result: review.result,
      reviewText: review.reviewText,
      obstacleText: review.obstacleText,
      nextAdjustmentText: review.nextAdjustmentText,
      timerMode: settings.timerMode,
    };

    const nextRecords = saveHistoryRecord(record);
    setHistoryRecords(nextRecords);
    showToast("success", "复盘已保存。");
    setIntentSets([]);
    setTimerRemaining(0);
    setActiveTimerSegment(null);
    setActiveModal(null);
    setPendingStartIntentId(null);
    setStartingIntentId(null);
    setIsAbandonConfirmOpen(false);
    setActiveUtilityPanel(null);
    void cancelTimerNotification();
    cancelTimerSoundReminder();
    clearStartAnimationTimeout();
    setPhase("setup");
    clearPersistedSession();
    expandCurrentTauriWindow().catch(() => {
      showToast("error", "完整窗口未能恢复。");
    });
  };

  const deleteRecord = (recordId: string) => {
    setConfirmationRequest({
      recordId,
      type: "delete-history-record",
    });
  };

  const clearRecords = () => {
    setConfirmationRequest({
      type: "clear-history-records",
    });
  };

  const cancelConfirmation = () => {
    setConfirmationRequest(null);
  };

  const confirmRequestedAction = () => {
    if (!confirmationRequest) {
      return;
    }

    if (confirmationRequest.type === "delete-history-record") {
      setHistoryRecords(deleteHistoryRecord(confirmationRequest.recordId));
      showToast("success", "已删除 1 条历史记录。");
    }

    if (confirmationRequest.type === "clear-history-records") {
      setHistoryRecords(clearHistoryRecords());
      showToast("success", "已清空全部历史记录。");
    }

    if (confirmationRequest.type === "import-full-backup") {
      const resolvedSession = confirmationRequest.payload.currentSession
        ? resolvePersistedSession(confirmationRequest.payload.currentSession)
        : null;

      clearStartAnimationTimeout();
      void cancelTimerNotification();
      cancelTimerSoundReminder();
      applyFullBackupPayload(confirmationRequest.payload);
      setHistoryRecords(confirmationRequest.payload.history);
      setSettings(confirmationRequest.payload.settings);
      setPendingSession(resolvedSession);
      setPhase("setup");
      setIntentSets([]);
      setTimerRemaining(0);
      setActiveTimerSegment(null);
      setActiveModal(null);
      setPendingStartIntentId(null);
      setStartingIntentId(null);
      setIsAbandonConfirmOpen(false);
      setHasUnsavedSetupDraft(false);
      setActiveUtilityPanel("settings");
      showToast(
        "success",
        `已导入完整备份：${confirmationRequest.payload.history.length} 条历史${
          resolvedSession ? "，含未完成轮次" : ""
        }。`,
      );
    }

    setConfirmationRequest(null);
  };

  const cancelTauriCloseRequest = () => {
    setTauriCloseRequest(null);
  };

  const saveCurrentSessionForWindowModeChange = () => {
    if (hasUnsavedSession && intentSets.length > 0) {
      savePersistedSession({
        phase: phase as Exclude<AppPhase, "setup">,
        intentSets,
        timerRemaining: activeTimerSegment ? getTimerRemainingSeconds(activeTimerSegment) : timerRemaining,
        activeTimerSegment,
        activeModal,
        timerMode: settings.timerMode,
      });
    }
  };

  const compactTauriWindowWithCurrentSession = async () => {
    setTauriCloseRequest(null);
    saveCurrentSessionForWindowModeChange();

    const didCompact = await compactCurrentTauriWindow();

    if (!didCompact) {
      window.close();
    }
  };

  const requestCompactWindow = () => {
    setActiveUtilityPanel(null);
    saveCurrentSessionForWindowModeChange();

    compactCurrentTauriWindow()
      .then((didCompact) => {
        if (!didCompact) {
          showToast("error", "小窗只在桌面版可用。");
        }
      })
      .catch(() => {
        showToast("error", "小窗未能收起，请稍后重试。");
      });
  };

  const abandonAndCloseTauriSession = async () => {
    setTauriCloseRequest(null);
    abandonCurrentSession({ restoreWindow: false });

    const didClose = await closeCurrentTauriWindow();

    if (!didClose) {
      window.close();
    }
  };

  const confirmTauriCloseRequest = async () => {
    const closeRequest = tauriCloseRequest;
    setTauriCloseRequest(null);

    if (closeRequest?.type === "active-session") {
      await compactTauriWindowWithCurrentSession();
      return;
    }

    const didClose = await closeCurrentTauriWindow();

    if (!didClose) {
      window.close();
    }
  };

  const createCurrentSessionBackup = (): PersistedSession | null => {
    if (hasUnsavedSession && intentSets.length > 0) {
      return {
        activeModal,
        activeTimerSegment,
        intentSets,
        phase: phase as Exclude<AppPhase, "setup">,
        timerMode: settings.timerMode,
        timerRemaining: activeTimerSegment ? getTimerRemainingSeconds(activeTimerSegment) : timerRemaining,
        updatedAt: new Date().toISOString(),
        version: 1,
      };
    }

    return pendingSession ?? loadPersistedSession();
  };

  const exportRecords = async () => {
    const payload = createHistoryExportPayload(historyRecords);
    const jsonValue = JSON.stringify(payload, null, 2);
    const dateSegment = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    const result = await downloadTextFile(`jiji-rululing-history-${dateSegment}.json`, jsonValue, "application/json");

    if (result.status === "cancelled") {
      return;
    }

    showToast("success", `已导出 ${historyRecords.length} 条历史记录。`);
  };

  const importRecords = async (file?: File) => {
    try {
      const transferResult = file
        ? {
            content: await readTextFile(file),
            status: "completed" as const,
          }
        : await selectAndReadTextFile();

      if (transferResult.status === "cancelled") {
        return;
      }

      const rawValue = transferResult.content;
      const result = importHistoryExportPayload(rawValue);

      setHistoryRecords(result.records);
      showToast("success", `导入完成：新增 ${result.importedCount} 条，跳过 ${result.skippedCount} 条重复记录。`);
    } catch {
      showToast("error", "导入失败：请选择由本应用导出的 JSON 历史文件。");
    }
  };

  const exportFullBackup = async () => {
    const payload = createFullBackupPayload({
      currentSession: createCurrentSessionBackup(),
      history: historyRecords,
      settings,
    });
    const dateSegment = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const result = await downloadTextFile(
      `jiji-rululing-full-backup-${dateSegment}.json`,
      stringifyFullBackupPayload(payload),
      "application/json",
      { dialogTitle: "导出完整备份" },
    );

    if (result.status === "cancelled") {
      return;
    }

    showToast(
      "success",
      `已导出完整备份：${payload.history.length} 条历史${payload.currentSession ? "，含未完成轮次" : ""}。`,
    );
  };

  const importFullBackup = async (file?: File) => {
    if (hasUnsavedSession || pendingSession) {
      showToast("error", "当前轮次进行中，暂不能导入完整备份。");
      return;
    }

    try {
      const transferResult = file
        ? {
            content: await readTextFile(file),
            status: "completed" as const,
          }
        : await selectAndReadTextFile({ dialogTitle: "导入完整备份" });

      if (transferResult.status === "cancelled") {
        return;
      }

      setConfirmationRequest({
        payload: parseFullBackupPayload(transferResult.content),
        type: "import-full-backup",
      });
    } catch {
      showToast("error", "导入失败：请选择由本应用导出的完整备份 JSON。");
    }
  };

  const updateTimerMode = (timerMode: TimerMode) => {
    if (
      !canChangeTimerSettings({
        intentSets,
        isStartingIntent: Boolean(startingIntentId),
        pendingSession,
        phase,
      })
    ) {
      return;
    }

    setSettings((currentSettings) => saveAppSettings({ ...currentSettings, timerMode }));
  };

  const updateAlwaysOnTop = (isAlwaysOnTop: boolean) => {
    setSettings((currentSettings) => saveAppSettings({ ...currentSettings, isAlwaysOnTop }));
  };

  const updateDockVisible = (isDockVisible: boolean) => {
    setSettings((currentSettings) => saveAppSettings({ ...currentSettings, isDockVisible }));
  };

  const updateSoundReminder = (isSoundReminderEnabled: boolean) => {
    setSettings((currentSettings) => saveAppSettings({ ...currentSettings, isSoundReminderEnabled }));

    if (isSoundReminderEnabled) {
      void prepareTimerSoundReminder();
      return;
    }

    stopTimerSoundReminderPlayback();
  };

  const updateSetupDraftState = useCallback((nextHasUnsavedDraft: boolean) => {
    setHasUnsavedSetupDraft(nextHasUnsavedDraft);
  }, []);

  const hasBlockingAction = hasBlockingRitualAction({
    activeModal,
    intentSets,
    pendingStartIntentId,
  }) || Boolean(startingIntentId);
  const isTimerModeDisabled = !canChangeTimerSettings({
    intentSets,
    isStartingIntent: Boolean(startingIntentId),
    pendingSession,
    phase,
  });
  const isSessionDataActionDisabled = hasUnsavedSession || Boolean(pendingSession);
  const timerModeDisabledMessage = pendingSession
    ? "有待恢复轮次，恢复或丢弃后可切换"
    : isTimerModeDisabled
      ? "第一张符箓开始燃烧后，完成或放弃后可切换"
      : undefined;
  const confirmationDialog = confirmationRequest
    ? confirmationRequest.type === "delete-history-record"
      ? {
          confirmLabel: "删除记录",
          description: "这条历史记录删除后无法在应用内恢复。",
          eyebrow: "History",
          title: "确定要删除这条历史记录吗？",
          variant: "danger" as const,
        }
      : confirmationRequest.type === "clear-history-records"
        ? {
            confirmLabel: "清空全部",
            description: "全部历史记录会被清空，但不会影响当前正在进行的轮次。",
            eyebrow: "History",
            title: "确定要清空全部历史记录吗？",
            variant: "danger" as const,
          }
        : {
            confirmLabel: "导入并覆盖",
            description:
              "完整备份会替换当前历史、未完成轮次和设置。导入后如备份中包含未完成轮次，会重新显示恢复提示。",
            eyebrow: "Backup",
            title: "确定要导入完整备份吗？",
            variant: "danger" as const,
          }
    : null;

  const toggleUtilityPanel = (panel: UtilityPanel) => {
    setActiveUtilityPanel((currentPanel) => (currentPanel === panel ? null : panel));
  };

  const isVisualAssetPreviewEnabled = import.meta.env.DEV;

  return (
    <div className={`app-shell app-shell--${phase}`}>
      <header className="app-header">
        <div>
          <p className="eyebrow">Intent Timer MVP</p>
          <h1>急急如律令</h1>
        </div>
        <span className="timer-mode">
          {timerConfig.label}：专注 {formatDurationLabel(timerConfig.focusSeconds)} / 休息{" "}
          {formatDurationLabel(timerConfig.breakSeconds)}
        </span>
        <nav className="utility-nav" aria-label="辅助面板">
          <button
            aria-pressed={activeUtilityPanel === "history"}
            className={activeUtilityPanel === "history" ? "ghost-button is-active" : "ghost-button"}
            type="button"
            onClick={() => toggleUtilityPanel("history")}
          >
            历史
          </button>
          <button
            aria-pressed={activeUtilityPanel === "settings"}
            className={activeUtilityPanel === "settings" ? "ghost-button is-active" : "ghost-button"}
            type="button"
            onClick={() => toggleUtilityPanel("settings")}
          >
            设置
          </button>
          {isVisualAssetPreviewEnabled ? (
            <button
              aria-pressed={activeUtilityPanel === "visual-assets"}
              className={activeUtilityPanel === "visual-assets" ? "ghost-button is-active" : "ghost-button"}
              type="button"
              onClick={() => toggleUtilityPanel("visual-assets")}
            >
              素材
            </button>
          ) : null}
        </nav>
      </header>

      <main className="app-main">
        {phase === "setup" ? (
          <SetupForm onDraftStateChange={updateSetupDraftState} onSubmit={startRitual} />
        ) : null}

        {phase === "ritual" ? (
          <RitualStage
            canCompactWindow={isTauriRuntime()}
            focusSeconds={timerConfig.focusSeconds}
            hasBlockingAction={hasBlockingAction}
            intentSets={intentSets}
            startingIntentId={startingIntentId}
            onCompactWindow={requestCompactWindow}
            onContinueRest={continueNextIncense}
            onOpenFullView={requestFullRitualView}
            onRequestAbandon={requestAbandonSession}
            onRequestReview={requestReview}
            onStartIntent={requestStartIntent}
            timerRemaining={timerRemaining}
          />
        ) : null}

        {phase === "review" ? (
          <ReviewPanel
            intentSets={intentSets}
            timerMode={settings.timerMode}
            onRequestAbandon={requestAbandonSession}
            onSave={saveReview}
          />
        ) : null}

        {activeUtilityPanel === "settings" ? (
          <SettingsPanel
            isSessionDataActionDisabled={isSessionDataActionDisabled}
            isTimerModeDisabled={isTimerModeDisabled}
            isAlwaysOnTop={settings.isAlwaysOnTop}
            isDockVisible={settings.isDockVisible}
            isSoundReminderEnabled={settings.isSoundReminderEnabled}
            onAlwaysOnTopChange={updateAlwaysOnTop}
            onDockVisibleChange={updateDockVisible}
            onExportFullBackup={exportFullBackup}
            onImportFullBackup={importFullBackup}
            onSoundReminderChange={updateSoundReminder}
            timerMode={settings.timerMode}
            timerModeDisabledMessage={timerModeDisabledMessage}
            onDevSessionFixtureSaved={(message) => showToast("info", message)}
            onTimerModeChange={updateTimerMode}
            supportsWindowAlwaysOnTop={isTauriRuntime()}
            useNativeFileDialog={shouldUseDesktopFileDialog()}
          />
        ) : null}

        {activeUtilityPanel === "history" ? (
          <HistoryPanel
            records={historyRecords}
            onClearRecords={clearRecords}
            onDeleteRecord={deleteRecord}
            onExportRecords={exportRecords}
            onImportRecords={importRecords}
            useNativeFileDialog={shouldUseDesktopFileDialog()}
          />
        ) : null}

        {activeUtilityPanel === "visual-assets" && isVisualAssetPreviewEnabled ? <VisualAssetPreviewPanel /> : null}
      </main>

      <ToastHost toasts={toasts} onDismiss={dismissToast} />

      {activeModal && modalIntentSet ? (
        <BreakModal
          intentSet={modalIntentSet}
          modal={activeModal}
          onContinueNow={continueNextIncense}
          onStartBreak={startBreak}
        />
      ) : null}

      {isAbandonConfirmOpen ? (
        <AbandonSessionModal onCancel={cancelAbandonSession} onConfirm={confirmAbandonSession} />
      ) : null}

      {confirmationRequest && confirmationDialog ? (
        <ConfirmModal
          cancelLabel="取消"
          confirmLabel={confirmationDialog.confirmLabel}
          description={confirmationDialog.description}
          eyebrow={confirmationDialog.eyebrow}
          title={confirmationDialog.title}
          variant={confirmationDialog.variant}
          onCancel={cancelConfirmation}
          onConfirm={confirmRequestedAction}
        />
      ) : null}

      {tauriCloseRequest ? (
        <ConfirmModal
          cancelLabel={tauriCloseRequest.type === "setup-draft" ? "继续填写" : "放弃并退出"}
          cancelVariant={tauriCloseRequest.type === "setup-draft" ? "default" : "danger"}
          confirmLabel={tauriCloseRequest.type === "setup-draft" ? "关闭窗口" : "收起到小窗继续"}
          description={
            tauriCloseRequest.type === "setup-draft"
              ? "当前填写内容还没有开始创造，关闭后不会保存这份草稿。"
              : "放弃并退出会结束本轮且不写入历史；如果只是想变小窗，下次可以直接点击仪式台里的“收起到小窗”。"
          }
          eyebrow="Desktop"
          title={tauriCloseRequest.type === "setup-draft" ? "确定要关闭窗口吗？" : "关闭会影响当前轮次"}
          variant={tauriCloseRequest.type === "setup-draft" ? "danger" : "default"}
          onCancel={tauriCloseRequest.type === "setup-draft" ? cancelTauriCloseRequest : abandonAndCloseTauriSession}
          onConfirm={tauriCloseRequest.type === "setup-draft" ? confirmTauriCloseRequest : compactTauriWindowWithCurrentSession}
          onDismiss={cancelTauriCloseRequest}
        />
      ) : null}

      {pendingStartIntentSet ? (
        <StartIntentConfirmModal
          intentSet={pendingStartIntentSet}
          timerMode={settings.timerMode}
          onCancel={cancelStartIntent}
          onConfirm={confirmStartIntent}
        />
      ) : null}

      {pendingSession ? (
        <RestoreSessionModal
          onDiscard={discardPendingSession}
          onRestore={restorePendingSession}
          session={pendingSession}
        />
      ) : null}
    </div>
  );
};

export default App;
