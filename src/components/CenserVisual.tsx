import type { CSSProperties } from "react";
import {
  CENSER_ASSET_LAYERS,
  getCenserVisualSlot,
  getVisualAssetRenderVars,
  type CenserAssetLayer,
  type VisualAssetSize,
} from "../lib/visualAssets";
import { getCenserAssetUrl } from "../lib/visualAssetManifest";
import { getCenserLidState, getCenserVisualState, getStageIntentVisualSemantics } from "../lib/visualState";
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
   * True only while the dedicated censer hit area is hovered.
   */
  isMetadataActive?: boolean;
  /**
   * Reports hover state for the dedicated censer hit area.
   */
  onMetadataActiveChange?: (isActive: boolean) => void;
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

const CenserVisual = ({
  currentIncenseIndex,
  incenseCount,
  incenseProgress,
  isMetadataActive = false,
  onMetadataActiveChange,
  size,
  status,
}: CenserVisualProps) => {
  const incenseLabel = `第 ${currentIncenseIndex} / ${incenseCount} 炷`;
  const incenseProgressPercent = Math.round(Math.min(1, Math.max(0, incenseProgress)) * 100);
  const renderStyle = getVisualAssetRenderVars("censer", size) as CSSProperties;
  const visualState = getCenserVisualState(status);
  const lidState = getCenserLidState(status);
  const statusLabel = getStageIntentVisualSemantics(status).statusLabel;

  return (
    <div
      aria-hidden={size === "compact" ? true : undefined}
      aria-label={size === "stage" ? `香炉，${incenseLabel}，${lidState === "closed" ? "盖子已盖上" : "盖子打开"}` : undefined}
      className={`censer-visual censer-visual--${size} censer-visual--${visualState}`}
      data-censer-current={currentIncenseIndex}
      data-censer-incense-count={incenseCount}
      data-censer-interaction-role={size === "stage" ? "metadata-only" : "presentational"}
      data-censer-lid-state={lidState}
      data-censer-metadata-active={isMetadataActive ? "true" : "false"}
      data-censer-progress={incenseProgressPercent}
      data-censer-size={size}
      data-censer-state={visualState}
      role={size === "stage" ? "img" : undefined}
      style={renderStyle}
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
      <span
        className="censer-visual__hover-target"
        data-censer-hover-action="show-metadata"
        aria-hidden="true"
        onMouseEnter={() => onMetadataActiveChange?.(true)}
        onMouseLeave={() => onMetadataActiveChange?.(false)}
        onMouseMove={() => onMetadataActiveChange?.(true)}
      />

      <div className="censer-visual__metadata" aria-hidden="true">
        <span className="censer-visual__meta censer-visual__meta--status">{statusLabel}</span>
        <strong className="censer-visual__meta">{incenseLabel}</strong>
        <span className="censer-visual__meta">线香进度 {incenseProgressPercent}%</span>
      </div>
    </div>
  );
};

export default CenserVisual;
