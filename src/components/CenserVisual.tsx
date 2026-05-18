import type { IntentSetStatus } from "../types";

type CenserVisualProps = {
  currentIncenseIndex: number;
  incenseCount: number;
  size: "stage" | "compact";
  status: IntentSetStatus;
};

const CenserVisual = ({ currentIncenseIndex, incenseCount, size, status }: CenserVisualProps) => {
  const incenseLabel = `第 ${currentIncenseIndex} / ${incenseCount} 炷`;

  return (
    <div
      aria-hidden={size === "compact" ? true : undefined}
      aria-label={size === "stage" ? `香炉占位，${incenseLabel}` : undefined}
      className={`censer-visual censer-visual--${size} censer-visual--${status}`}
      data-censer-size={size}
      data-censer-status={status}
      role={size === "stage" ? "img" : undefined}
    >
      <div className="censer-visual__asset" aria-hidden="true">
        <span className="censer-visual__lid" data-censer-layer="lid" />
        <span className="censer-visual__mouth" data-censer-layer="mouth" />
        <span className="censer-visual__ash" data-censer-layer="ash" />
        <span className="censer-visual__body" data-censer-layer="body" />
        <span className="censer-visual__feet" data-censer-layer="feet" />
      </div>

      <span className="censer-visual__meta">香炉占位</span>
      <strong className="censer-visual__meta">{incenseLabel}</strong>
    </div>
  );
};

export default CenserVisual;
