import { formatSeconds } from "../lib/timer";
import type { IntentSet } from "../types";
import CenserVisual from "./CenserVisual";

type CompactCenserSlotProps = {
  incenseProgress: number;
  intentSet: IntentSet;
  isSessionComplete: boolean;
  onOpenFullView: () => void;
  timerRemaining: number;
};

const statusLabels: Record<IntentSet["status"], string> = {
  idle: "未开始",
  burning: "烧香中",
  resting: "休息中",
  completed: "已完成",
};

const getStatusHint = (intentSet: IntentSet, formattedRemaining: string, isSessionComplete: boolean) => {
  if (intentSet.status === "idle") {
    return "点击展开完整窗口";
  }

  if (intentSet.status === "burning") {
    return `第 ${intentSet.currentIncenseIndex} / ${intentSet.incenseCount} 炷，剩余 ${formattedRemaining}，点击展开完整窗口`;
  }

  if (intentSet.status === "resting") {
    return `休息剩余 ${formattedRemaining}，点击展开完整窗口`;
  }

  if (isSessionComplete) {
    return "全部香已完成，点击展开完整窗口并复盘";
  }

  return "本套已完成，点击查看完整状态";
};

const CompactCenserSlot = ({
  incenseProgress,
  intentSet,
  isSessionComplete,
  onOpenFullView,
  timerRemaining,
}: CompactCenserSlotProps) => {
  const isActive = intentSet.status === "burning" || intentSet.status === "resting";
  const formattedRemaining = formatSeconds(timerRemaining);
  const statusHint = getStatusHint(intentSet, formattedRemaining, isSessionComplete);

  return (
    <article className={`compact-censer compact-censer--${intentSet.status}`}>
      <button
        aria-label={`第 ${intentSet.currentIncenseIndex} / ${intentSet.incenseCount} 炷，${statusLabels[intentSet.status]}，${statusHint}`}
        className="compact-censer__button"
        type="button"
        onClick={onOpenFullView}
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
