import { useEffect, useMemo, useState } from "react";
import { TIMER_MODE_CONFIG } from "./constants";
import AbandonSessionModal from "./components/AbandonSessionModal";
import BreakModal from "./components/BreakModal";
import HistoryPanel from "./components/HistoryPanel";
import ReviewPanel from "./components/ReviewPanel";
import RestoreSessionModal from "./components/RestoreSessionModal";
import RitualStage from "./components/RitualStage";
import SettingsPanel from "./components/SettingsPanel";
import StartIntentConfirmModal from "./components/StartIntentConfirmModal";
import SetupForm from "./components/SetupForm";
import ToastHost from "./components/ToastHost";
import { clearPersistedSession, loadPersistedSession, savePersistedSession } from "./lib/sessionStorage";
import { formatDurationLabel } from "./lib/timer";
import { loadAppSettings, saveAppSettings } from "./lib/settingsStorage";
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
  AppPhase,
  AppSettings,
  HistoryRecord,
  IntentSet,
  PersistedSession,
  ReviewInput,
  TimerMode,
  ToastMessage,
} from "./types";

type UtilityPanel = "history" | "settings";

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const App = () => {
  const [phase, setPhase] = useState<AppPhase>("setup");
  const [intentSets, setIntentSets] = useState<IntentSet[]>([]);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);
  const [pendingStartIntentId, setPendingStartIntentId] = useState<string | null>(null);
  const [isAbandonConfirmOpen, setIsAbandonConfirmOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings());
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>(() => loadHistoryRecords());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [pendingSession, setPendingSession] = useState<PersistedSession | null>(() => loadPersistedSession());
  const [activeUtilityPanel, setActiveUtilityPanel] = useState<UtilityPanel | null>(null);

  const activeIntentSet = useMemo(
    () => intentSets.find((intentSet) => intentSet.status === "burning" || intentSet.status === "resting") ?? null,
    [intentSets],
  );

  const activeIntentSetKey = activeIntentSet
    ? `${activeIntentSet.id}-${activeIntentSet.status}-${activeIntentSet.currentIncenseIndex}`
    : "";

  const modalIntentSet = activeModal
    ? intentSets.find((intentSet) => intentSet.id === activeModal.intentSetId) ?? null
    : null;
  const pendingStartIntentSet = pendingStartIntentId
    ? intentSets.find((intentSet) => intentSet.id === pendingStartIntentId) ?? null
    : null;

  const hasUnsavedSession = phase === "ritual" || phase === "review";
  const timerConfig = TIMER_MODE_CONFIG[settings.timerMode];

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
    if (!activeIntentSet || activeModal || pendingStartIntentId || isAbandonConfirmOpen || timerRemaining <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setTimerRemaining((currentSeconds) => Math.max(0, currentSeconds - 1));
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [activeIntentSetKey, activeIntentSet, activeModal, pendingStartIntentId, isAbandonConfirmOpen, timerRemaining]);

  useEffect(() => {
    if (!activeIntentSet || activeModal || pendingStartIntentId || isAbandonConfirmOpen || timerRemaining !== 0) {
      return;
    }

    if (activeIntentSet.status === "burning") {
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
      setActiveModal({
        type: "rest-finished",
        intentSetId: activeIntentSet.id,
      });
    }
  }, [activeIntentSet, activeIntentSetKey, activeModal, pendingStartIntentId, isAbandonConfirmOpen, timerRemaining]);

  useEffect(() => {
    if (phase === "ritual" && intentSets.length > 0 && intentSets.every((intentSet) => intentSet.status === "completed")) {
      setPhase("review");
    }
  }, [intentSets, phase]);

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
    if (!hasUnsavedSession || intentSets.length === 0) {
      return;
    }

    savePersistedSession({
      phase: phase as Exclude<AppPhase, "setup">,
      intentSets,
      timerRemaining,
      activeModal,
      timerMode: settings.timerMode,
    });
  }, [activeModal, hasUnsavedSession, intentSets, phase, settings.timerMode, timerRemaining]);

  const startRitual = (nextIntentSets: IntentSet[]) => {
    setIntentSets(nextIntentSets);
    setTimerRemaining(0);
    setActiveModal(null);
    setPendingStartIntentId(null);
    setIsAbandonConfirmOpen(false);
    setActiveUtilityPanel(null);
    setPhase("ritual");
  };

  const requestStartIntent = (intentSetId: string) => {
    if (activeIntentSet || activeModal || pendingStartIntentId || isAbandonConfirmOpen) {
      return;
    }

    setPendingStartIntentId(intentSetId);
  };

  const cancelStartIntent = () => {
    setPendingStartIntentId(null);
  };

  const confirmStartIntent = () => {
    if (!pendingStartIntentId || activeIntentSet || activeModal) {
      return;
    }

    setIntentSets((currentIntentSets) =>
      currentIntentSets.map((intentSet) =>
        intentSet.id === pendingStartIntentId && intentSet.status === "idle"
          ? { ...intentSet, currentIncenseIndex: 1, status: "burning" }
          : intentSet,
      ),
    );
    setTimerRemaining(timerConfig.focusSeconds);
    setPendingStartIntentId(null);
  };

  const startBreak = (intentSetId: string) => {
    setIntentSets((currentIntentSets) =>
      currentIntentSets.map((intentSet) =>
        intentSet.id === intentSetId ? { ...intentSet, status: "resting" } : intentSet,
      ),
    );
    setTimerRemaining(timerConfig.breakSeconds);
    setActiveModal(null);
  };

  const continueNextIncense = (intentSetId: string) => {
    setIntentSets((currentIntentSets) =>
      currentIntentSets.map((intentSet) => {
        if (intentSet.id !== intentSetId) {
          return intentSet;
        }

        if (intentSet.currentIncenseIndex >= intentSet.incenseCount) {
          return { ...intentSet, status: "completed" };
        }

        return {
          ...intentSet,
          currentIncenseIndex: intentSet.currentIncenseIndex + 1,
          status: "burning",
        };
      }),
    );
    setTimerRemaining(timerConfig.focusSeconds);
    setActiveModal(null);
  };

  const requestAbandonSession = () => {
    setIsAbandonConfirmOpen(true);
  };

  const cancelAbandonSession = () => {
    setIsAbandonConfirmOpen(false);
  };

  const confirmAbandonSession = () => {
    setIntentSets([]);
    setTimerRemaining(0);
    setActiveModal(null);
    setPendingStartIntentId(null);
    setIsAbandonConfirmOpen(false);
    setActiveUtilityPanel(null);
    setPhase("setup");
    clearPersistedSession();
  };

  const restorePendingSession = () => {
    if (!pendingSession) {
      return;
    }

    setIntentSets(pendingSession.intentSets);
    setTimerRemaining(pendingSession.timerRemaining);
    setActiveModal(pendingSession.activeModal);
    setPendingStartIntentId(null);
    setIsAbandonConfirmOpen(false);
    setSettings(saveAppSettings({ timerMode: pendingSession.timerMode }));
    setActiveUtilityPanel(null);
    setPhase(pendingSession.phase);
    setPendingSession(null);
  };

  const discardPendingSession = () => {
    clearPersistedSession();
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
    setActiveModal(null);
    setPendingStartIntentId(null);
    setIsAbandonConfirmOpen(false);
    setActiveUtilityPanel(null);
    setPhase("setup");
    clearPersistedSession();
  };

  const deleteRecord = (recordId: string) => {
    const shouldDelete = window.confirm("确定要删除这条历史记录吗？");

    if (!shouldDelete) {
      return;
    }

    setHistoryRecords(deleteHistoryRecord(recordId));
    showToast("success", "已删除 1 条历史记录。");
  };

  const clearRecords = () => {
    const shouldClear = window.confirm("确定要清空全部历史记录吗？此操作不会影响当前正在进行的轮次。");

    if (!shouldClear) {
      return;
    }

    setHistoryRecords(clearHistoryRecords());
    showToast("success", "已清空全部历史记录。");
  };

  const exportRecords = () => {
    const payload = createHistoryExportPayload(historyRecords);
    const jsonValue = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonValue], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateSegment = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    link.href = url;
    link.download = `jiji-rululing-history-${dateSegment}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    showToast("success", `已导出 ${historyRecords.length} 条历史记录。`);
  };

  const importRecords = async (file: File) => {
    try {
      const rawValue = await file.text();
      const result = importHistoryExportPayload(rawValue);

      setHistoryRecords(result.records);
      showToast("success", `导入完成：新增 ${result.importedCount} 条，跳过 ${result.skippedCount} 条重复记录。`);
    } catch {
      showToast("error", "导入失败：请选择由本应用导出的 JSON 历史文件。");
    }
  };

  const updateTimerMode = (timerMode: TimerMode) => {
    if (hasUnsavedSession || pendingSession) {
      return;
    }

    setSettings(saveAppSettings({ timerMode }));
  };

  const hasBlockingAction = Boolean(activeIntentSet || activeModal || pendingStartIntentId);
  const isSettingsDisabled = hasUnsavedSession || Boolean(pendingSession);

  const toggleUtilityPanel = (panel: UtilityPanel) => {
    setActiveUtilityPanel((currentPanel) => (currentPanel === panel ? null : panel));
  };

  return (
    <div className="app-shell">
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
        </nav>
      </header>

      <main className="app-main">
        {phase === "setup" ? <SetupForm onSubmit={startRitual} /> : null}

        {phase === "ritual" ? (
          <RitualStage
            focusSeconds={timerConfig.focusSeconds}
            hasBlockingAction={hasBlockingAction}
            intentSets={intentSets}
            onRequestAbandon={requestAbandonSession}
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
            disabled={isSettingsDisabled}
            timerMode={settings.timerMode}
            onTimerModeChange={updateTimerMode}
          />
        ) : null}

        {activeUtilityPanel === "history" ? (
          <HistoryPanel
            records={historyRecords}
            onClearRecords={clearRecords}
            onDeleteRecord={deleteRecord}
            onExportRecords={exportRecords}
            onImportRecords={importRecords}
          />
        ) : null}
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
