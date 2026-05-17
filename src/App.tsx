import { useEffect, useMemo, useState } from "react";
import { BREAK_SECONDS, TIMER_SECONDS } from "./constants";
import AbandonSessionModal from "./components/AbandonSessionModal";
import BreakModal from "./components/BreakModal";
import HistoryPanel from "./components/HistoryPanel";
import ReviewPanel from "./components/ReviewPanel";
import RitualStage from "./components/RitualStage";
import SetupForm from "./components/SetupForm";
import { loadHistoryRecords, saveHistoryRecord } from "./lib/storage";
import type { ActiveModal, AppPhase, HistoryRecord, IntentSet, ReviewResult } from "./types";

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
  const [isAbandonConfirmOpen, setIsAbandonConfirmOpen] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>(() => loadHistoryRecords());

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

  const hasUnsavedSession = phase === "ritual" || phase === "review";

  useEffect(() => {
    if (!activeIntentSet || activeModal || isAbandonConfirmOpen || timerRemaining <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setTimerRemaining((currentSeconds) => Math.max(0, currentSeconds - 1));
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [activeIntentSetKey, activeIntentSet, activeModal, isAbandonConfirmOpen, timerRemaining]);

  useEffect(() => {
    if (!activeIntentSet || activeModal || isAbandonConfirmOpen || timerRemaining !== 0) {
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
  }, [activeIntentSet, activeIntentSetKey, activeModal, isAbandonConfirmOpen, timerRemaining]);

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

  const startRitual = (nextIntentSets: IntentSet[]) => {
    setIntentSets(nextIntentSets);
    setTimerRemaining(0);
    setActiveModal(null);
    setIsAbandonConfirmOpen(false);
    setPhase("ritual");
  };

  const startIntent = (intentSetId: string) => {
    if (activeIntentSet || activeModal) {
      return;
    }

    setIntentSets((currentIntentSets) =>
      currentIntentSets.map((intentSet) =>
        intentSet.id === intentSetId && intentSet.status === "idle"
          ? { ...intentSet, currentIncenseIndex: 1, status: "burning" }
          : intentSet,
      ),
    );
    setTimerRemaining(TIMER_SECONDS);
  };

  const startBreak = (intentSetId: string) => {
    setIntentSets((currentIntentSets) =>
      currentIntentSets.map((intentSet) =>
        intentSet.id === intentSetId ? { ...intentSet, status: "resting" } : intentSet,
      ),
    );
    setTimerRemaining(BREAK_SECONDS);
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
    setTimerRemaining(TIMER_SECONDS);
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
    setIsAbandonConfirmOpen(false);
    setPhase("setup");
  };

  const saveReview = (result: ReviewResult, reviewText: string) => {
    const record: HistoryRecord = {
      id: createId(),
      createdAt: new Date().toISOString(),
      intentSets: intentSets.map((intentSet) => ({
        situationIntent: intentSet.situationIntent,
        preventionIntents: intentSet.preventionIntents,
        incenseCount: intentSet.incenseCount,
      })),
      result,
      reviewText,
    };

    const nextRecords = saveHistoryRecord(record);
    setHistoryRecords(nextRecords);
    setIntentSets([]);
    setTimerRemaining(0);
    setActiveModal(null);
    setIsAbandonConfirmOpen(false);
    setPhase("setup");
  };

  const hasBlockingAction = Boolean(activeIntentSet || activeModal);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Intent Timer MVP</p>
          <h1>急急如律令</h1>
        </div>
        <span className="timer-mode">开发计时：{TIMER_SECONDS} 秒 / 休息 {BREAK_SECONDS} 秒</span>
      </header>

      <main className="app-main">
        {phase === "setup" ? <SetupForm onSubmit={startRitual} /> : null}

        {phase === "ritual" ? (
          <RitualStage
            hasBlockingAction={hasBlockingAction}
            intentSets={intentSets}
            onRequestAbandon={requestAbandonSession}
            onStartIntent={startIntent}
            timerRemaining={timerRemaining}
          />
        ) : null}

        {phase === "review" ? (
          <ReviewPanel intentSets={intentSets} onRequestAbandon={requestAbandonSession} onSave={saveReview} />
        ) : null}

        <HistoryPanel records={historyRecords} />
      </main>

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
    </div>
  );
};

export default App;
