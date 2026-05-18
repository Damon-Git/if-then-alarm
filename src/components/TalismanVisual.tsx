import { getTalismanVisualSlot } from "../lib/visualAssets";
import { getTalismanVisualState } from "../lib/visualState";
import type { IntentSetStatus } from "../types";

type TalismanVisualProps = {
  disabled?: boolean;
  interactive?: boolean;
  intentStatus?: IntentSetStatus;
  label: string;
  onClick?: () => void;
  text: string;
  variant: "situation" | "prevention";
};

const TalismanContent = ({ label, text, variant }: Pick<TalismanVisualProps, "label" | "text" | "variant">) => (
  <>
    <span
      className="talisman-visual__template"
      data-talisman-layer="template"
      data-visual-slot={getTalismanVisualSlot(variant, "template")}
      aria-hidden="true"
    />
    <span
      className="talisman-visual__state"
      data-talisman-layer="state"
      data-visual-slot={getTalismanVisualSlot(variant, "state")}
      aria-hidden="true"
    />
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
