import type { CSSProperties } from "react";
import type { IntentSetStatus } from "../types";

type IncenseVisualProps = {
  currentIncenseIndex: number;
  incenseCount: number;
  progress: number;
  size: "stage" | "compact";
  status: IntentSetStatus;
};

const clampProgress = (progress: number) => Math.min(1, Math.max(0, progress));

const getStickProgress = (
  incenseNumber: number,
  currentIncenseIndex: number,
  progress: number,
  status: IntentSetStatus,
) => {
  if (status === "idle") {
    return 0;
  }

  if (incenseNumber < currentIncenseIndex) {
    return 1;
  }

  if (incenseNumber > currentIncenseIndex) {
    return 0;
  }

  if (status === "burning") {
    return progress;
  }

  if (status === "resting" || status === "completed") {
    return 1;
  }

  return 0;
};

const IncenseVisual = ({ currentIncenseIndex, incenseCount, progress, size, status }: IncenseVisualProps) => {
  const normalizedProgress = clampProgress(progress);
  const progressPercent = Math.round(normalizedProgress * 100);
  const incenseNumbers = Array.from({ length: incenseCount }, (_, index) => index + 1);

  return (
    <div
      className={`incense-visual incense-visual--${size} incense-visual--${status}`}
      data-incense-count={incenseCount}
      data-incense-current={currentIncenseIndex}
      data-incense-progress={progressPercent}
      data-incense-size={size}
      data-incense-status={status}
    >
      {incenseNumbers.map((incenseNumber) => {
        const stickProgress = getStickProgress(incenseNumber, currentIncenseIndex, normalizedProgress, status);
        const stickProgressPercent = Math.round(stickProgress * 100);
        const isActiveStick = status === "burning" && incenseNumber === currentIncenseIndex;

        return (
          <span
            className={`incense-visual__unit${isActiveStick ? " incense-visual__unit--active" : ""}`}
            data-incense-index={incenseNumber}
            data-incense-stick-progress={stickProgressPercent}
            key={incenseNumber}
            style={{ "--incense-stick-progress": `${stickProgressPercent}%` } as CSSProperties}
          >
            <span className="incense-visual__stick" data-incense-layer="stick" aria-hidden="true" />
            <span className="incense-visual__ash" data-incense-layer="ash" aria-hidden="true" />
            <span className="incense-visual__ember" data-incense-layer="ember" aria-hidden="true" />
            <span className="incense-visual__smoke" data-incense-layer="smoke" aria-hidden="true" />
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
