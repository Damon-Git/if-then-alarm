import type { IntentSet } from "../types";
import CenserVisual from "./CenserVisual";
import TalismanVisual from "./TalismanVisual";
import TimerPanel from "./TimerPanel";

type IntentSlotProps = {
  intentSet: IntentSet;
  actionDisabled: boolean;
  incenseProgress: number;
  timerRemaining: number;
  onStart: (intentSetId: string) => void;
};

const statusLabels: Record<IntentSet["status"], string> = {
  idle: "未开始",
  burning: "进行中",
  resting: "休息中",
  completed: "已完成",
};

const IntentSlot = ({ intentSet, actionDisabled, incenseProgress, timerRemaining, onStart }: IntentSlotProps) => {
  const canStart = intentSet.status === "idle" && !actionDisabled;
  return (
    <article className={`intent-slot intent-slot--${intentSet.status}`}>
      <div className="intent-slot__topline">
        <span className="status-pill">{statusLabels[intentSet.status]}</span>
        <span>{intentSet.incenseCount} 炷香</span>
      </div>

      <TalismanVisual
        disabled={!canStart}
        interactive
        label="情境性符箓"
        text={intentSet.situationIntent}
        variant="situation"
        onClick={() => onStart(intentSet.id)}
      />

      <CenserVisual
        currentIncenseIndex={intentSet.currentIncenseIndex}
        incenseCount={intentSet.incenseCount}
        incenseProgress={incenseProgress}
        size="stage"
        status={intentSet.status}
      />

      {intentSet.status === "burning" || intentSet.status === "resting" ? (
        <TimerPanel
          currentIncenseIndex={intentSet.currentIncenseIndex}
          incenseCount={intentSet.incenseCount}
          secondsRemaining={timerRemaining}
          status={intentSet.status}
        />
      ) : null}

      <div className="prevention-list">
        <span className="prevention-list__title">预防性符箓</span>
        {intentSet.preventionIntents.length === 0 ? (
          <p className="muted-text">暂无预防性符箓</p>
        ) : (
          intentSet.preventionIntents.map((preventionIntent, index) => (
            <TalismanVisual
              key={`${intentSet.id}-${index}`}
              label={`第 ${index + 1} 条`}
              text={preventionIntent}
              variant="prevention"
            />
          ))
        )}
      </div>
    </article>
  );
};

export default IntentSlot;
