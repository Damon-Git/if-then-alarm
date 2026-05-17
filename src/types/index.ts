export type IntentSetStatus = "idle" | "burning" | "resting" | "completed";

export type IntentSet = {
  id: string;
  situationIntent: string;
  preventionIntents: string[];
  incenseCount: number;
  currentIncenseIndex: number;
  status: IntentSetStatus;
};

export type AppPhase = "setup" | "ritual" | "review";

export type ReviewResult = "completed" | "failed";

export type HistoryRecord = {
  id: string;
  createdAt: string;
  intentSets: {
    situationIntent: string;
    preventionIntents: string[];
    incenseCount: number;
  }[];
  result: ReviewResult;
  reviewText: string;
};

export type PersistedSession = {
  version: 1;
  phase: Exclude<AppPhase, "setup">;
  intentSets: IntentSet[];
  timerRemaining: number;
  activeModal: ActiveModal | null;
  updatedAt: string;
};

export type IntentSetDraft = {
  id: string;
  situationIntent: string;
  preventionIntents: string[];
  incenseCount: number;
};

export type SetupValidationErrors = Record<string, string[]>;

export type ActiveModal =
  | {
      type: "incense-finished";
      intentSetId: string;
    }
  | {
      type: "rest-finished";
      intentSetId: string;
    };
