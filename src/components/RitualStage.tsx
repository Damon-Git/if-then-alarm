import type { CSSProperties } from "react";
import { getAltarAssetUrl } from "../lib/visualAssetManifest";
import type { IntentSet } from "../types";
import CompactCenserSlot from "./CompactCenserSlot";
import CompactWindowDragRegion from "./CompactWindowDragRegion";
import IntentSlot from "./IntentSlot";

type RitualStageProps = {
  intentSets: IntentSet[];
  focusSeconds: number;
  timerRemaining: number;
  hasBlockingAction: boolean;
  startingIntentId: string | null;
  onStartIntent: (intentSetId: string) => void;
  onOpenFullView: () => void;
  onRequestAbandon: () => void;
  onRequestReview: () => void;
};

const clampProgress = (progress: number) => Math.min(1, Math.max(0, progress));

const getIncenseProgress = (intentSet: IntentSet, focusSeconds: number, timerRemaining: number) => {
  if (intentSet.status === "burning") {
    return focusSeconds > 0 ? clampProgress((focusSeconds - timerRemaining) / focusSeconds) : 0;
  }

  if (intentSet.status === "resting" || intentSet.status === "completed") {
    return 1;
  }

  return 0;
};

const RitualStage = ({
  intentSets,
  focusSeconds,
  timerRemaining,
  hasBlockingAction,
  startingIntentId,
  onStartIntent,
  onOpenFullView,
  onRequestAbandon,
  onRequestReview,
}: RitualStageProps) => {
  const isSessionComplete = intentSets.length > 0 && intentSets.every((intentSet) => intentSet.status === "completed");
  const altarBackgroundUrl = getAltarAssetUrl("background");
  const altarSceneStyle = {
    "--altar-background-image": `url(${altarBackgroundUrl})`,
  } as CSSProperties;

  return (
    <section className="panel ritual-panel" data-ritual-complete={isSessionComplete} aria-labelledby="ritual-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Ritual Stage</p>
          <h2 id="ritual-title">仪式台</h2>
        </div>
        <div className="ritual-actions">
          <button className="ghost-button ritual-abandon-button" type="button" onClick={onRequestAbandon}>
            放弃本轮
          </button>
        </div>
      </div>

      {isSessionComplete ? (
        <div className="ritual-completion-card" role="status" aria-live="polite">
          <div>
            <p className="eyebrow">Completion</p>
            <h3>本轮香尽</h3>
            <p>记录一句复盘，再把本轮收入历史。</p>
          </div>
          <button className="primary-button" type="button" onClick={onRequestReview}>
            进入复盘
          </button>
        </div>
      ) : null}

      <div className="stage-grid stage-grid--full">
        <div
          className={`altar-scene altar-scene--slots-${intentSets.length}`}
          data-ritual-complete={isSessionComplete}
          style={altarSceneStyle}
        >
          <div className="altar-scene__slots">
            {intentSets.map((intentSet) => {
              const isActive = intentSet.status === "burning" || intentSet.status === "resting";
              const incenseProgress = getIncenseProgress(intentSet, focusSeconds, isActive ? timerRemaining : 0);

              return (
                <IntentSlot
                  actionDisabled={hasBlockingAction && !isActive}
                  incenseProgress={incenseProgress}
                  isStartAnimationActive={startingIntentId === intentSet.id}
                  intentSet={intentSet}
                  key={intentSet.id}
                  onStart={onStartIntent}
                  timerRemaining={isActive ? timerRemaining : 0}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="compact-stage" aria-label="小窗香炉舞台">
        <CompactWindowDragRegion />
        <div className="compact-stage__censers">
          {intentSets.map((intentSet) => {
            const isActive = intentSet.status === "burning" || intentSet.status === "resting";
            const incenseProgress = getIncenseProgress(intentSet, focusSeconds, isActive ? timerRemaining : 0);

            return (
              <CompactCenserSlot
                incenseProgress={incenseProgress}
                intentSet={intentSet}
                isSessionComplete={isSessionComplete}
                key={intentSet.id}
                onOpenFullView={onOpenFullView}
                timerRemaining={isActive ? timerRemaining : 0}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default RitualStage;
