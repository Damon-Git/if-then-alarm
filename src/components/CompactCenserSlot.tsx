import { useEffect, useRef, useState } from "react";
import { formatSeconds } from "../lib/timer";
import type { IntentSet } from "../types";
import CenserVisual from "./CenserVisual";
import { useCompactWindowDragSession } from "./useCompactWindowDragSession";

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

const CENSER_DRAG_CLICK_SUPPRESSION_PX = 6;

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
    return "全部香已完成，点击展开完整窗口查看复盘入口";
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
  const [isRemainingVisible, setIsRemainingVisible] = useState(false);
  const suppressionResetTimeoutRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const isActive = intentSet.status === "burning" || intentSet.status === "resting";
  const formattedRemaining = formatSeconds(timerRemaining);
  const statusHint = getStatusHint(intentSet, formattedRemaining, isSessionComplete);
  const windowDragSession = useCompactWindowDragSession<HTMLButtonElement>({
    activationDistance: CENSER_DRAG_CLICK_SUPPRESSION_PX,
    onDragActivated: () => {
      suppressClickRef.current = true;
    },
  });

  const clearScheduledSuppressionReset = () => {
    if (suppressionResetTimeoutRef.current !== null) {
      window.clearTimeout(suppressionResetTimeoutRef.current);
      suppressionResetTimeoutRef.current = null;
    }
  };

  useEffect(
    () => () => {
      clearScheduledSuppressionReset();
    },
    [],
  );

  return (
    <article
      className={`compact-censer compact-censer--${intentSet.status}`}
      data-compact-censer-has-remaining={isActive ? "true" : "false"}
      data-compact-censer-remaining-visible={isActive && isRemainingVisible ? "true" : "false"}
    >
      <button
        aria-label={`第 ${intentSet.currentIncenseIndex} / ${intentSet.incenseCount} 炷，${statusLabels[intentSet.status]}，${statusHint}`}
        className="compact-censer__button"
        data-compact-censer-click-action="open-full-window"
        data-compact-censer-drag-action="move-window-after-threshold"
        data-compact-censer-drag-click-suppression={`${CENSER_DRAG_CLICK_SUPPRESSION_PX}px-threshold`}
        type="button"
        onBlur={() => setIsRemainingVisible(false)}
        onClick={(event) => {
          clearScheduledSuppressionReset();

          if (suppressClickRef.current) {
            event.preventDefault();
            suppressClickRef.current = false;
            return;
          }

          onOpenFullView();
        }}
        onPointerCancel={(event) => {
          clearScheduledSuppressionReset();
          setIsRemainingVisible(false);
          suppressClickRef.current = false;
          windowDragSession.onPointerCancel(event);
        }}
        onPointerDown={(event) => {
          clearScheduledSuppressionReset();
          suppressClickRef.current = false;
          windowDragSession.onPointerDown(event);
        }}
        onPointerMove={windowDragSession.onPointerMove}
        onPointerEnter={() => setIsRemainingVisible(true)}
        onPointerLeave={() => setIsRemainingVisible(false)}
        onPointerUp={(event) => {
          windowDragSession.onPointerUp(event);

          if (suppressClickRef.current) {
            suppressionResetTimeoutRef.current = window.setTimeout(() => {
              suppressClickRef.current = false;
              suppressionResetTimeoutRef.current = null;
            });
          }
        }}
        onFocus={() => setIsRemainingVisible(true)}
      >
        <CenserVisual
          currentIncenseIndex={intentSet.currentIncenseIndex}
          incenseCount={intentSet.incenseCount}
          incenseProgress={incenseProgress}
          size="compact"
          status={intentSet.status}
        />
        <span className="compact-censer__status">{statusLabels[intentSet.status]}</span>
        <span className="compact-censer__hint">{statusHint}</span>
      </button>
      {isActive ? <strong className="compact-censer__remaining">{formattedRemaining}</strong> : null}
      <p>{intentSet.situationIntent}</p>
    </article>
  );
};

export default CompactCenserSlot;
