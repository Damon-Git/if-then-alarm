import { useEffect, useRef } from "react";
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
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressionResetTimeoutRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const isActive = intentSet.status === "burning" || intentSet.status === "resting";
  const formattedRemaining = formatSeconds(timerRemaining);
  const statusHint = getStatusHint(intentSet, formattedRemaining, isSessionComplete);

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
    <article className={`compact-censer compact-censer--${intentSet.status}`}>
      <button
        aria-label={`第 ${intentSet.currentIncenseIndex} / ${intentSet.incenseCount} 炷，${statusLabels[intentSet.status]}，${statusHint}`}
        className="compact-censer__button"
        data-compact-censer-click-action="open-full-window"
        data-compact-censer-drag-click-suppression={`${CENSER_DRAG_CLICK_SUPPRESSION_PX}px-threshold`}
        type="button"
        onClick={(event) => {
          clearScheduledSuppressionReset();

          if (suppressClickRef.current) {
            event.preventDefault();
            suppressClickRef.current = false;
            return;
          }

          onOpenFullView();
        }}
        onPointerCancel={() => {
          clearScheduledSuppressionReset();
          pointerStartRef.current = null;
          suppressClickRef.current = false;
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) {
            return;
          }

          clearScheduledSuppressionReset();
          pointerStartRef.current = { x: event.clientX, y: event.clientY };
          suppressClickRef.current = false;

          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            // Synthetic browser checks do not register a native active pointer.
          }
        }}
        onPointerLeave={() => {
          if (pointerStartRef.current) {
            suppressClickRef.current = true;
          }
        }}
        onPointerMove={(event) => {
          const pointerStart = pointerStartRef.current;

          if (
            pointerStart &&
            Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) >=
              CENSER_DRAG_CLICK_SUPPRESSION_PX
          ) {
            suppressClickRef.current = true;
          }
        }}
        onPointerUp={(event) => {
          pointerStartRef.current = null;

          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }

          if (suppressClickRef.current) {
            suppressionResetTimeoutRef.current = window.setTimeout(() => {
              suppressClickRef.current = false;
              suppressionResetTimeoutRef.current = null;
            });
          }
        }}
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
