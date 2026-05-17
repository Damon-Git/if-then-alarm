import type { IntentSet } from "../types";
import CompactCenserSlot from "./CompactCenserSlot";
import IntentSlot from "./IntentSlot";

type RitualStageProps = {
  intentSets: IntentSet[];
  timerRemaining: number;
  hasBlockingAction: boolean;
  onStartIntent: (intentSetId: string) => void;
  onRequestAbandon: () => void;
};

const RitualStage = ({
  intentSets,
  timerRemaining,
  hasBlockingAction,
  onStartIntent,
  onRequestAbandon,
}: RitualStageProps) => {
  return (
    <section className="panel ritual-panel" aria-labelledby="ritual-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Ritual Stage</p>
          <h2 id="ritual-title">仪式台</h2>
        </div>
        <button className="ghost-button" type="button" onClick={onRequestAbandon}>
          放弃本轮
        </button>
      </div>

      <div className="stage-grid stage-grid--full">
        {intentSets.map((intentSet) => {
          const isActive = intentSet.status === "burning" || intentSet.status === "resting";

          return (
            <IntentSlot
              actionDisabled={hasBlockingAction && !isActive}
              intentSet={intentSet}
              key={intentSet.id}
              onStart={onStartIntent}
              timerRemaining={isActive ? timerRemaining : 0}
            />
          );
        })}
      </div>

      <div className="compact-stage" aria-label="小窗香炉舞台">
        {intentSets.map((intentSet) => {
          const isActive = intentSet.status === "burning" || intentSet.status === "resting";

          return (
            <CompactCenserSlot
              actionDisabled={hasBlockingAction && !isActive}
              intentSet={intentSet}
              key={intentSet.id}
              onStart={onStartIntent}
              timerRemaining={isActive ? timerRemaining : 0}
            />
          );
        })}
      </div>
    </section>
  );
};

export default RitualStage;
