import type { CSSProperties } from "react";
import { getIncenseVisualSlot } from "../lib/visualAssets";
import { getIncenseVisualState, type IncenseVisualState } from "../lib/visualState";
import type { IntentSetStatus } from "../types";

type IncenseVisualProps = {
  currentIncenseIndex: number;
  incenseCount: number;
  progress: number;
  size: "stage" | "compact";
  status: IntentSetStatus;
};

const clampProgress = (progress: number) => Math.min(1, Math.max(0, progress));

const getStickProgress = (progress: number, visualState: IncenseVisualState) => {
  if (visualState === "pending") {
    return 0;
  }

  if (visualState === "burning") {
    return progress;
  }

  return 1;
};

const IncenseVisual = ({ currentIncenseIndex, incenseCount, progress, size, status }: IncenseVisualProps) => {
  const normalizedProgress = clampProgress(progress);
  const progressPercent = Math.round(normalizedProgress * 100);
  const incenseNumbers = Array.from({ length: incenseCount }, (_, index) => index + 1);

  return (
    <div
      className={`incense-visual incense-visual--${size}`}
      data-incense-count={incenseCount}
      data-incense-current={currentIncenseIndex}
      data-incense-progress={progressPercent}
      data-incense-size={size}
    >
      {incenseNumbers.map((incenseNumber) => {
        const visualState = getIncenseVisualState(incenseNumber, currentIncenseIndex, status);
        const stickProgress = getStickProgress(normalizedProgress, visualState);
        const stickProgressPercent = Math.round(stickProgress * 100);

        return (
          <span
            className={`incense-visual__unit incense-visual__unit--${visualState}`}
            data-incense-index={incenseNumber}
            data-incense-state={visualState}
            data-incense-stick-progress={stickProgressPercent}
            key={incenseNumber}
            style={{ "--incense-stick-progress": `${stickProgressPercent}%` } as CSSProperties}
          >
            <span
              className="incense-visual__stick"
              data-incense-layer="stick"
              data-visual-slot={getIncenseVisualSlot(size, "stick")}
              aria-hidden="true"
            />
            <span
              className="incense-visual__ash"
              data-incense-layer="ash"
              data-visual-slot={getIncenseVisualSlot(size, "ash")}
              aria-hidden="true"
            />
            <span
              className="incense-visual__ember"
              data-incense-layer="ember"
              data-visual-slot={getIncenseVisualSlot(size, "ember")}
              aria-hidden="true"
            />
            <span
              className="incense-visual__smoke"
              data-incense-layer="smoke"
              data-visual-slot={getIncenseVisualSlot(size, "smoke")}
              aria-hidden="true"
            />
          </span>
        );
      })}
      <span className="incense-visual__progress">
        当前第 {currentIncenseIndex} / {incenseCount} 炷，线香进度 {progressPercent}%
      </span>
    </div>
  );
};

export default IncenseVisual;
