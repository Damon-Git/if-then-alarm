import {
  getTalismanVisualSlot,
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

const TalismanContent = ({ label, text, variant }: Pick<TalismanVisualProps, "label" | "text" | "variant">) => (
  <>
    <TalismanLayer layer="template" variant={variant} />
    <TalismanLayer layer="state" variant={variant} />
    <span
      className="talisman-visual__text"
      data-talisman-layer="text"
      data-visual-slot={getTalismanVisualSlot(variant, "text")}
    >
      <span className="talisman-visual__label">{label}</span>
      <strong>{text}</strong>
    </span>
  </>
);

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
