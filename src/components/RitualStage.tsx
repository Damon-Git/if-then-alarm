import type { IntentSet } from "../types";
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

      <div className="stage-grid">
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
    </section>
  );
};

export default RitualStage;
