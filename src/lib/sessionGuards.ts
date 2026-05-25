import { normalizeIntentText } from "./validation";
import type { ActiveModal, AppPhase, IntentSet, IntentSetDraft, PersistedSession } from "../types";

export const getActiveIntentSet = (intentSets: IntentSet[]) =>
  intentSets.find((intentSet) => intentSet.status === "burning" || intentSet.status === "resting") ?? null;

export const hasUnsavedSetupDraft = (drafts: IntentSetDraft[]) =>
  drafts.length > 1 ||
  drafts.some(
    (draft) =>
      Boolean(normalizeIntentText(draft.situationIntent)) ||
      draft.preventionIntents.length > 0 ||
      draft.incenseCount !== 1,
  );

export const hasUnsavedRitualSession = (phase: AppPhase) => phase === "ritual" || phase === "review";

export const areAllIntentSetsCompleted = (intentSets: IntentSet[]) =>
  intentSets.length > 0 && intentSets.every((intentSet) => intentSet.status === "completed");

export const canEnterReviewPhase = ({
  intentSets,
  phase,
}: {
  intentSets: IntentSet[];
  phase: AppPhase;
}) => phase === "ritual" && areAllIntentSetsCompleted(intentSets);

export const getFocusTimerNotificationKind = ({
  intentSetId,
  intentSets,
  nextIncenseIndex,
}: {
  intentSetId: string;
  intentSets: IntentSet[];
  nextIncenseIndex: number;
}) => {
  const targetIntentSet = intentSets.find((intentSet) => intentSet.id === intentSetId);

  if (!targetIntentSet) {
    return "incense-finished";
  }

  const isTargetFinalIncense = nextIncenseIndex >= targetIntentSet.incenseCount;
  const areOtherIntentSetsCompleted = intentSets.every(
    (intentSet) => intentSet.id === intentSetId || intentSet.status === "completed",
  );

  return isTargetFinalIncense && areOtherIntentSetsCompleted ? "ritual-completed" : "incense-finished";
};

export const isTimerRestorable = (session: PersistedSession) =>
  Boolean(getActiveIntentSet(session.intentSets) && !session.activeModal && session.timerRemaining > 0);

export const hasBlockingRitualAction = ({
  activeModal,
  intentSets,
  isAbandonConfirmOpen,
  pendingStartIntentId,
}: {
  activeModal: ActiveModal | null;
  intentSets: IntentSet[];
  isAbandonConfirmOpen?: boolean;
  pendingStartIntentId: string | null;
}) => Boolean(getActiveIntentSet(intentSets) || activeModal || pendingStartIntentId || isAbandonConfirmOpen);

export const canChangeTimerSettings = ({
  pendingSession,
  phase,
}: {
  pendingSession: PersistedSession | null;
  phase: AppPhase;
}) => !hasUnsavedRitualSession(phase) && !pendingSession;
