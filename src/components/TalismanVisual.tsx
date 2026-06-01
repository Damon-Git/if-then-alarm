import { useState } from "react";
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
   * Notifies the stage when this talisman is being previewed so parent stacking can stay stable in WebView.
   */
  onPreviewActiveChange?: (isActive: boolean) => void;
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

const SituationTalismanBurnEffect = () => (
  <>
    <span className="talisman-visual__burn talisman-visual__burn--ignition" data-talisman-burn-layer="ignition" />
    <span className="talisman-visual__burn talisman-visual__burn--char" data-talisman-burn-layer="char" />
    <span className="talisman-visual__burn talisman-visual__burn--edge" data-talisman-burn-layer="edge" />
    <span className="talisman-visual__burn talisman-visual__burn--sparks" data-talisman-burn-layer="sparks">
      <span />
      <span />
      <span />
    </span>
  </>
);

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
      {layer === "state" && variant === "situation" ? <SituationTalismanBurnEffect /> : null}
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
  onPreviewActiveChange,
  text,
  variant,
}: TalismanVisualProps) => {
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const visualState = getTalismanVisualState({ disabled, intentStatus });
  const interactionRole = interactive ? "start-entry" : "view-only";
  const clickAction = interactive && !disabled ? "start-confirm" : "none";
  const className = `talisman-visual talisman-visual--${variant} talisman-visual--${visualState}${
    interactive ? " talisman-visual--interactive" : ""
  }`;

  const setPreviewActive = (nextIsPreviewActive: boolean) => {
    setIsPreviewActive(nextIsPreviewActive);
    onPreviewActiveChange?.(nextIsPreviewActive);
  };

  const handleClick = () => {
    if (disabled) {
      return;
    }

    onClick?.();
  };

  const interactionProps = {
    "data-talisman-preview-active": isPreviewActive ? "true" : "false",
    onBlur: () => setPreviewActive(false),
    onFocus: () => setPreviewActive(true),
    onMouseEnter: () => setPreviewActive(true),
    onMouseLeave: () => setPreviewActive(false),
    onMouseMove: () => setPreviewActive(true),
  } as const;

  if (interactive) {
    return (
      <button
        aria-label={`${label}：${text}`}
        aria-disabled={disabled}
        className={className}
        data-talisman-click-action={clickAction}
        data-talisman-interaction-role={interactionRole}
        data-talisman-state={visualState}
        data-talisman-variant={variant}
        tabIndex={disabled ? -1 : undefined}
        type="button"
        onClick={handleClick}
        {...interactionProps}
      >
        <TalismanContent label={label} text={text} variant={variant} />
      </button>
    );
  }

  return (
    <div
      aria-label={`${label}：${text}`}
      className={className}
      data-talisman-click-action="none"
      data-talisman-interaction-role={interactionRole}
      data-talisman-preview-active={isPreviewActive ? "true" : "false"}
      data-talisman-state={visualState}
      data-talisman-variant={variant}
      role="group"
      tabIndex={disabled ? -1 : 0}
      onBlur={() => setPreviewActive(false)}
      onFocus={() => setPreviewActive(true)}
      onMouseEnter={() => setPreviewActive(true)}
      onMouseLeave={() => setPreviewActive(false)}
      onMouseMove={() => setPreviewActive(true)}
    >
      <TalismanContent label={label} text={text} variant={variant} />
    </div>
  );
};

export default TalismanVisual;
