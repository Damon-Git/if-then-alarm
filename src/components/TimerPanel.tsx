import { formatSeconds } from "../lib/timer";
import type { IntentSetStatus } from "../types";

type TimerPanelProps = {
  status: Extract<IntentSetStatus, "burning" | "resting">;
  currentIncenseIndex: number;
  incenseCount: number;
  secondsRemaining: number;
};

const TimerPanel = ({ status, currentIncenseIndex, incenseCount, secondsRemaining }: TimerPanelProps) => {
  const isResting = status === "resting";
  const nextIncenseIndex = Math.min(currentIncenseIndex + 1, incenseCount);

  return (
    <div className="timer-panel">
      <span className="timer-panel__label">{isResting ? "休息中" : "烧香中"}</span>
      <strong>{formatSeconds(secondsRemaining)}</strong>
      <span>
        {isResting
          ? `休息后进入第 ${nextIncenseIndex} / ${incenseCount} 炷`
          : `第 ${currentIncenseIndex} / ${incenseCount} 炷`}
      </span>
    </div>
  );
};

export default TimerPanel;
