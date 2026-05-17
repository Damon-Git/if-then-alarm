import { formatSeconds } from "../lib/timer";
import type { IntentSet } from "../types";

type CompactCenserSlotProps = {
  actionDisabled: boolean;
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

const CompactCenserSlot = ({ actionDisabled, intentSet, onStart, timerRemaining }: CompactCenserSlotProps) => {
  const isActive = intentSet.status === "burning" || intentSet.status === "resting";
  const canStart = intentSet.status === "idle" && !actionDisabled;

  return (
    <article className={`compact-censer compact-censer--${intentSet.status}`}>
      <button
        aria-label={`第 ${intentSet.currentIncenseIndex} / ${intentSet.incenseCount} 炷，${statusLabels[intentSet.status]}`}
        className="compact-censer__button"
        disabled={!canStart}
        type="button"
        onClick={() => onStart(intentSet.id)}
      >
        <span className="compact-censer__bowl" aria-hidden="true">
          <span className="compact-censer__rim" />
          <span className="compact-censer__body" />
          <span className="compact-censer__feet" />
        </span>
        <span className="compact-censer__status">{statusLabels[intentSet.status]}</span>
        <strong>
          {isActive ? formatSeconds(timerRemaining) : `第 ${intentSet.currentIncenseIndex} / ${intentSet.incenseCount} 炷`}
        </strong>
      </button>
      <p>{intentSet.situationIntent}</p>
    </article>
  );
};

export default CompactCenserSlot;
