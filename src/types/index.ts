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

export type TimerMode = "dev" | "prod";

export type AppSettings = {
  isAlwaysOnTop: boolean;
  isDockVisible: boolean;
  isSoundReminderEnabled: boolean;
  timerMode: TimerMode;
};

export type ToastMessage = {
  id: string;
  message: string;
  type: "success" | "error" | "info";
};

export type ReviewResult = "completed" | "partial" | "failed";

export type ReviewInput = {
  result: ReviewResult;
  reviewText: string;
  obstacleText?: string;
  nextAdjustmentText?: string;
};

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
  obstacleText?: string;
  nextAdjustmentText?: string;
  timerMode?: TimerMode;
};

export type HistoryExportPayload = {
  version: 1;
  exportedAt: string;
  records: HistoryRecord[];
};

export type HistoryImportResult = {
  records: HistoryRecord[];
  importedCount: number;
  skippedCount: number;
};

export type ActiveTimerSegment = {
  startedAt: string;
  durationSeconds: number;
};

export type PersistedSession = {
  version: 1;
  phase: Exclude<AppPhase, "setup">;
  intentSets: IntentSet[];
  timerRemaining: number;
  activeTimerSegment: ActiveTimerSegment | null;
  activeModal: ActiveModal | null;
  timerMode: TimerMode;
  updatedAt: string;
};

export type IntentSetDraft = {
  id: string;
  situationIntent: string;
  preventionIntents: string[];
  incenseCount: number;
};

export type SetupValidationError = {
  field?: "situationIntent" | "preventionIntent" | "incenseCount";
  message: string;
  preventionIndex?: number;
};

export type SetupValidationErrors = Record<string, SetupValidationError[]>;

export type ActiveModal =
  | {
      type: "incense-finished";
      intentSetId: string;
    }
  | {
      type: "rest-finished";
      intentSetId: string;
    };
