import {
  CENSER_ASSET_LAYERS,
  getCenserVisualSlot,
  type CenserAssetLayer,
  type VisualAssetSize,
} from "../lib/visualAssets";
import { getCenserAssetUrl } from "../lib/visualAssetManifest";
import { getCenserVisualState } from "../lib/visualState";
import type { IntentSetStatus } from "../types";
import IncenseVisual from "./IncenseVisual";

type CenserVisualProps = {
  /**
   * 1-based index of the active incense stick. Keep business state derivation in callers.
   */
  currentIncenseIndex: number;
  /**
   * Total incense sticks selected for this intent set. Valid product range is 1-3.
   */
  incenseCount: number;
  /**
   * Progress for the current stick only, normalized to 0-1 before rendering.
   */
  incenseProgress: number;
  /**
   * Visual asset family. Stage and compact may use different future artwork.
   */
  size: "stage" | "compact";
  /**
   * Minimal intent status needed to derive visual state. Do not pass full session data.
   */
  status: IntentSetStatus;
};

const CenserLayer = ({ layer, size }: { layer: CenserAssetLayer; size: VisualAssetSize }) => {
  const visualSlot = getCenserVisualSlot(size, layer);
  const assetUrl = getCenserAssetUrl(size, layer);

  return (
    <span
      className={`censer-visual__${layer}${assetUrl ? " visual-layer--with-asset" : ""}`}
      data-censer-layer={layer}
      data-visual-slot={visualSlot}
    >
      {assetUrl ? <img alt="" className="visual-layer__asset" draggable="false" src={assetUrl} /> : null}
    </span>
  );
};

const CenserVisual = ({ currentIncenseIndex, incenseCount, incenseProgress, size, status }: CenserVisualProps) => {
  const incenseLabel = `第 ${currentIncenseIndex} / ${incenseCount} 炷`;
  const incenseProgressPercent = Math.round(Math.min(1, Math.max(0, incenseProgress)) * 100);
  const visualState = getCenserVisualState(status);

  return (
    <div
      aria-hidden={size === "compact" ? true : undefined}
      aria-label={size === "stage" ? `香炉占位，${incenseLabel}` : undefined}
      className={`censer-visual censer-visual--${size} censer-visual--${visualState}`}
      data-censer-current={currentIncenseIndex}
      data-censer-incense-count={incenseCount}
      data-censer-progress={incenseProgressPercent}
      data-censer-size={size}
      data-censer-state={visualState}
      role={size === "stage" ? "img" : undefined}
    >
      <div className="censer-visual__asset" aria-hidden="true">
        <IncenseVisual
          currentIncenseIndex={currentIncenseIndex}
          incenseCount={incenseCount}
          progress={incenseProgress}
          size={size}
          status={status}
        />
        {CENSER_ASSET_LAYERS.map((layer) => (
          <CenserLayer key={layer} layer={layer} size={size} />
        ))}
      </div>

      <span className="censer-visual__meta">香炉占位</span>
      <strong className="censer-visual__meta">{incenseLabel}</strong>
      <span className="censer-visual__meta">线香进度 {incenseProgressPercent}%</span>
    </div>
  );
};

export default CenserVisual;
