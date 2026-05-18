import { getCenserVisualState } from "../lib/visualState";
import type { IntentSetStatus } from "../types";
import IncenseVisual from "./IncenseVisual";

type CenserVisualProps = {
  currentIncenseIndex: number;
  incenseCount: number;
  incenseProgress: number;
  size: "stage" | "compact";
  status: IntentSetStatus;
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
        <span className="censer-visual__lid" data-censer-layer="lid" />
        <span className="censer-visual__mouth" data-censer-layer="mouth" />
        <span className="censer-visual__ash" data-censer-layer="ash" />
        <span className="censer-visual__body" data-censer-layer="body" />
        <span className="censer-visual__feet" data-censer-layer="feet" />
      </div>

      <span className="censer-visual__meta">香炉占位</span>
      <strong className="censer-visual__meta">{incenseLabel}</strong>
      <span className="censer-visual__meta">线香进度 {incenseProgressPercent}%</span>
    </div>
  );
};

export default CenserVisual;
