import { formatSeconds } from "../lib/timer";
import type { IntentSet } from "../types";
import CenserVisual from "./CenserVisual";

type CompactCenserSlotProps = {
  actionDisabled: boolean;
  incenseProgress: number;
  intentSet: IntentSet;
  onStart: (intentSetId: string) => void;
  timerRemaining: number;
};

const statusLabels: Record<IntentSet["status"], string> = {
  idle: "未开始",
  burning: "烧香中",
  resting: "休息中",
  completed: "已完成",
};

const getStatusHint = (intentSet: IntentSet, canStart: boolean, formattedRemaining: string) => {
  if (intentSet.status === "idle") {
    return canStart ? "点击香炉开始" : "等待当前香炉结束";
  }

  if (intentSet.status === "burning") {
    return `第 ${intentSet.currentIncenseIndex} / ${intentSet.incenseCount} 炷，剩余 ${formattedRemaining}`;
  }

  if (intentSet.status === "resting") {
    return `休息剩余 ${formattedRemaining}`;
  }

  return "本套已完成";
};

const CompactCenserSlot = ({
  actionDisabled,
  incenseProgress,
  intentSet,
  onStart,
  timerRemaining,
}: CompactCenserSlotProps) => {
  const isActive = intentSet.status === "burning" || intentSet.status === "resting";
  const canStart = intentSet.status === "idle" && !actionDisabled;
  const formattedRemaining = formatSeconds(timerRemaining);
  const statusHint = getStatusHint(intentSet, canStart, formattedRemaining);

  return (
    <article className={`compact-censer compact-censer--${intentSet.status}`}>
      <button
        aria-label={`第 ${intentSet.currentIncenseIndex} / ${intentSet.incenseCount} 炷，${statusLabels[intentSet.status]}，${statusHint}`}
        className="compact-censer__button"
        disabled={!canStart}
        type="button"
        onClick={() => onStart(intentSet.id)}
      >
        <CenserVisual
          currentIncenseIndex={intentSet.currentIncenseIndex}
          incenseCount={intentSet.incenseCount}
          incenseProgress={incenseProgress}
          size="compact"
          status={intentSet.status}
        />
        <span className="compact-censer__status">{statusLabels[intentSet.status]}</span>
        <strong>
          {isActive ? formattedRemaining : `第 ${intentSet.currentIncenseIndex} / ${intentSet.incenseCount} 炷`}
        </strong>
        <span className="compact-censer__hint">{statusHint}</span>
      </button>
      <p>{intentSet.situationIntent}</p>
    </article>
  );
};

export default CompactCenserSlot;
