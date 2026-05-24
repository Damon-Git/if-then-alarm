import type { CSSProperties } from "react";
import {
  getIncenseVisualSlot,
  INCENSE_ASSET_LAYERS,
  type IncenseAssetLayer,
  type VisualAssetSize,
} from "../lib/visualAssets";
import { getIncenseAssetUrl } from "../lib/visualAssetManifest";
import { getIncenseVisualState, type IncenseVisualState } from "../lib/visualState";
import type { IntentSetStatus } from "../types";

type IncenseVisualProps = {
  /**
   * 1-based index of the stick currently controlled by timer state.
   */
  currentIncenseIndex: number;
  /**
   * Total sticks to render. This mirrors the user's selected incense count.
   */
  incenseCount: number;
  /**
   * Current stick progress from 0-1. This component clamps but does not compute time.
   */
  progress: number;
  /**
   * Visual asset family. Stage and compact may use different future artwork.
   */
  size: "stage" | "compact";
  /**
   * Minimal status used to map each stick to pending, burning, burned, or resting.
   */
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

const IncenseLayer = ({ layer, size }: { layer: IncenseAssetLayer; size: VisualAssetSize }) => {
  const visualSlot = getIncenseVisualSlot(size, layer);
  const assetUrl = getIncenseAssetUrl(size, layer);

  return (
    <span
      className={`incense-visual__${layer}${assetUrl ? " visual-layer--with-asset" : ""}`}
      data-incense-layer={layer}
      data-visual-slot={visualSlot}
      aria-hidden="true"
    >
      {assetUrl ? <img alt="" className="visual-layer__asset" draggable="false" src={assetUrl} /> : null}
    </span>
  );
};

const IncenseVisual = ({ currentIncenseIndex, incenseCount, progress, size, status }: IncenseVisualProps) => {
  const normalizedProgress = clampProgress(progress);
  const progressPercent = Math.round(normalizedProgress * 100);
  const incenseNumbers = Array.from({ length: incenseCount }, (_, index) => index + 1);

  return (
    <div
      className={`incense-visual incense-visual--${size}`}
      data-incense-click-action="none"
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
            {INCENSE_ASSET_LAYERS.map((layer) => (
              <IncenseLayer key={layer} layer={layer} size={size} />
            ))}
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
