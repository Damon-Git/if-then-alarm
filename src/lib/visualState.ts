import type { IntentSetStatus } from "../types";

export type CenserVisualState = "idle" | "active" | "resting" | "completed";

export type CenserLidState = "open" | "closed";

export type IncenseVisualState = "pending" | "burning" | "burned" | "resting";

export type TalismanVisualState = "ready" | "disabled" | "completed";

export type StageCenserEmphasis = "normal" | "muted";

export type StageIntentMetadataVisibility = "censer-hover";

export type StageTalismanVisibility = "visible" | "dismissed";

export type StageTimerIntentStatus = Extract<IntentSetStatus, "burning" | "resting">;

export type StageIntentVisualSemantics = {
  canStart: boolean;
  censerEmphasis: StageCenserEmphasis;
  metadataVisibility: StageIntentMetadataVisibility;
  preventionTalismanVisibility: StageTalismanVisibility;
  shouldRenderTimerPanel: boolean;
  situationTalismanVisibility: StageTalismanVisibility;
  statusLabel: string;
};

const STAGE_INTENT_VISUAL_SEMANTICS = {
  idle: {
    canStart: true,
    censerEmphasis: "normal",
    metadataVisibility: "censer-hover",
    preventionTalismanVisibility: "visible",
    shouldRenderTimerPanel: false,
    situationTalismanVisibility: "visible",
    statusLabel: "未开始",
  },
  burning: {
    canStart: false,
    censerEmphasis: "normal",
    metadataVisibility: "censer-hover",
    preventionTalismanVisibility: "visible",
    shouldRenderTimerPanel: true,
    situationTalismanVisibility: "dismissed",
    statusLabel: "进行中",
  },
  resting: {
    canStart: false,
    censerEmphasis: "normal",
    metadataVisibility: "censer-hover",
    preventionTalismanVisibility: "visible",
    shouldRenderTimerPanel: true,
    situationTalismanVisibility: "dismissed",
    statusLabel: "休息中",
  },
  completed: {
    canStart: false,
    censerEmphasis: "muted",
    metadataVisibility: "censer-hover",
    preventionTalismanVisibility: "dismissed",
    shouldRenderTimerPanel: false,
    situationTalismanVisibility: "dismissed",
    statusLabel: "已完成",
  },
} as const satisfies Record<IntentSetStatus, StageIntentVisualSemantics>;

export const getStageIntentVisualSemantics = (status: IntentSetStatus): StageIntentVisualSemantics =>
  STAGE_INTENT_VISUAL_SEMANTICS[status];

export const isStageTimerIntentStatus = (status: IntentSetStatus): status is StageTimerIntentStatus =>
  getStageIntentVisualSemantics(status).shouldRenderTimerPanel;

export const getCenserVisualState = (status: IntentSetStatus): CenserVisualState => {
  if (status === "burning") {
    return "active";
  }

  if (status === "resting") {
    return "resting";
  }

  if (status === "completed") {
    return "completed";
  }

  return "idle";
};

export const getCenserLidState = (status: IntentSetStatus): CenserLidState =>
  status === "completed" ? "closed" : "open";

export const getIncenseVisualState = (
  incenseNumber: number,
  currentIncenseIndex: number,
  status: IntentSetStatus,
): IncenseVisualState => {
  if (status === "idle") {
    return "pending";
  }

  if (incenseNumber < currentIncenseIndex) {
    return "burned";
  }

  if (incenseNumber > currentIncenseIndex) {
    return "pending";
  }

  if (status === "burning") {
    return "burning";
  }

  if (status === "resting") {
    return "resting";
  }

  return "burned";
};

export const getTalismanVisualState = ({
  disabled,
  intentStatus,
}: {
  disabled?: boolean;
  intentStatus?: IntentSetStatus;
}): TalismanVisualState => {
  if (intentStatus === "completed") {
    return "completed";
  }

  if (disabled) {
    return "disabled";
  }

  return "ready";
};
