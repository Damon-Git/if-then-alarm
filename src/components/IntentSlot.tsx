import { useState } from "react";
import type { IntentSet } from "../types";
import { getStageIntentVisualSemantics, isStageTimerIntentStatus } from "../lib/visualState";
import CenserVisual from "./CenserVisual";
import TalismanVisual from "./TalismanVisual";
import TimerPanel from "./TimerPanel";

type IntentSlotProps = {
  intentSet: IntentSet;
  actionDisabled: boolean;
  incenseProgress: number;
  isStartAnimationActive: boolean;
  timerRemaining: number;
  onStart: (intentSetId: string) => void;
};

const IntentSlot = ({
  intentSet,
  actionDisabled,
  incenseProgress,
  isStartAnimationActive,
  timerRemaining,
  onStart,
}: IntentSlotProps) => {
  const [isCenserMetadataActive, setIsCenserMetadataActive] = useState(false);
  const [isPreventionPreviewActive, setIsPreventionPreviewActive] = useState(false);
  const visualSemantics = getStageIntentVisualSemantics(intentSet.status);
  const canStart = visualSemantics.canStart && !actionDisabled;
  const timerStatus = isStageTimerIntentStatus(intentSet.status) ? intentSet.status : null;
  const preventionCount = intentSet.preventionIntents.length;

  return (
    <article
      className={`intent-slot intent-slot--${intentSet.status}`}
      data-stage-can-start={canStart}
      data-stage-censer-emphasis={visualSemantics.censerEmphasis}
      data-stage-intent-status={intentSet.status}
      data-stage-metadata-active={isCenserMetadataActive ? "true" : "false"}
      data-stage-metadata-visibility={visualSemantics.metadataVisibility}
      data-stage-prevention-visibility={visualSemantics.preventionTalismanVisibility}
      data-stage-prevention-preview-active={isPreventionPreviewActive ? "true" : "false"}
      data-stage-start-visual-state={isStartAnimationActive ? "burning" : "idle"}
      data-stage-situation-visibility={visualSemantics.situationTalismanVisibility}
      data-stage-timer-visible={timerStatus !== null}
    >
      <TalismanVisual
        disabled={!canStart}
        interactive
        intentStatus={intentSet.status}
        label="情境性符箓"
        text={intentSet.situationIntent}
        variant="situation"
        onClick={() => onStart(intentSet.id)}
      />

      <CenserVisual
        currentIncenseIndex={intentSet.currentIncenseIndex}
        incenseCount={intentSet.incenseCount}
        incenseProgress={incenseProgress}
        isMetadataActive={isCenserMetadataActive}
        onMetadataActiveChange={setIsCenserMetadataActive}
        size="stage"
        status={intentSet.status}
      />

      {timerStatus ? (
        <TimerPanel
          currentIncenseIndex={intentSet.currentIncenseIndex}
          incenseCount={intentSet.incenseCount}
          secondsRemaining={timerRemaining}
          status={timerStatus}
        />
      ) : null}

      <div className="prevention-list" data-prevention-count={preventionCount}>
        <span className="prevention-list__title">预防性符箓</span>
        {preventionCount === 0 ? (
          <p className="muted-text">暂无预防性符箓</p>
        ) : (
          <div className="prevention-list__items">
            {intentSet.preventionIntents.map((preventionIntent, index) => (
              <TalismanVisual
                key={`${intentSet.id}-${index}`}
                intentStatus={intentSet.status}
                label={`第 ${index + 1} 条`}
                onPreviewActiveChange={setIsPreventionPreviewActive}
                text={preventionIntent}
                variant="prevention"
              />
            ))}
          </div>
        )}
      </div>
    </article>
  );
};

export default IntentSlot;
