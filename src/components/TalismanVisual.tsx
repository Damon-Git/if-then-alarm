import {
  getTalismanVisualSlot,
  TALISMAN_TEMPLATE_ASSET_LAYERS,
  type TalismanAssetLayer,
  type TalismanAssetVariant,
} from "../lib/visualAssets";
import { getTalismanAssetUrl } from "../lib/visualAssetManifest";
import { getTalismanVisualState } from "../lib/visualState";
import type { IntentSetStatus } from "../types";

type TalismanVisualProps = {
  /**
   * Prevents interaction and maps to a disabled visual state.
   */
  disabled?: boolean;
  /**
   * Renders as a button only when true. Non-interactive talismans stay presentational.
   */
  interactive?: boolean;
  /**
   * Minimal intent status needed for visual state. Do not pass full intent/session data.
   */
  intentStatus?: IntentSetStatus;
  /**
   * Short UI label outside the user-authored intent text.
   */
  label: string;
  /**
   * Optional click handler for the situation talisman entry point.
   */
  onClick?: () => void;
  /**
   * User-authored text rendered over the talisman template layer.
   */
  text: string;
  /**
   * Selects the future talisman template family.
   */
  variant: "situation" | "prevention";
};

const splitIntentText = (text: string, variant: TalismanAssetVariant) => {
  const marker = variant === "situation" ? "就" : "那么";
  const markerIndex = text.indexOf(marker);

  if (markerIndex > 0) {
    return {
      left: text.slice(markerIndex).trim(),
      right: text.slice(0, markerIndex).trim(),
    };
  }

  const midpoint = Math.ceil(text.length / 2);

  return {
    left: text.slice(midpoint).trim(),
    right: text.slice(0, midpoint).trim(),
  };
};

const TalismanLayer = ({
  layer,
  variant,
}: {
  layer: Extract<TalismanAssetLayer, "template" | "state">;
  variant: TalismanAssetVariant;
}) => {
  const visualSlot = getTalismanVisualSlot(variant, layer);
  const assetUrl = getTalismanAssetUrl(variant, layer);

  return (
    <span
      className={`talisman-visual__${layer}${assetUrl ? " visual-layer--with-asset" : ""}`}
      data-talisman-layer={layer}
      data-visual-slot={visualSlot}
      aria-hidden="true"
    >
      {assetUrl ? <img alt="" className="visual-layer__asset" draggable="false" src={assetUrl} /> : null}
    </span>
  );
};

const TalismanContent = ({ label, text, variant }: Pick<TalismanVisualProps, "label" | "text" | "variant">) => {
  const textColumns = splitIntentText(text, variant);

  return (
    <>
      {TALISMAN_TEMPLATE_ASSET_LAYERS.map((layer) => (
        <TalismanLayer key={layer} layer={layer} variant={variant} />
      ))}
      <span
        className="talisman-visual__text"
        data-talisman-layer="text"
        data-visual-slot={getTalismanVisualSlot(variant, "text")}
      >
        <span className="talisman-visual__label">{label}</span>
        <strong className="talisman-visual__column talisman-visual__column--right">{textColumns.right}</strong>
        <strong className="talisman-visual__column talisman-visual__column--left">{textColumns.left}</strong>
      </span>
    </>
  );
};

const TalismanVisual = ({
  disabled = false,
  interactive = false,
  intentStatus,
  label,
  onClick,
  text,
  variant,
}: TalismanVisualProps) => {
  const visualState = getTalismanVisualState({ disabled, intentStatus });
  const className = `talisman-visual talisman-visual--${variant} talisman-visual--${visualState}${
    interactive ? " talisman-visual--interactive" : ""
  }`;

  if (interactive) {
    return (
      <button
        aria-label={`${label}：${text}`}
        className={className}
        data-talisman-state={visualState}
        data-talisman-variant={variant}
        disabled={disabled}
        type="button"
        onClick={onClick}
      >
        <TalismanContent label={label} text={text} variant={variant} />
      </button>
    );
  }

  return (
    <div className={className} data-talisman-state={visualState} data-talisman-variant={variant}>
      <TalismanContent label={label} text={text} variant={variant} />
    </div>
  );
};

export default TalismanVisual;
