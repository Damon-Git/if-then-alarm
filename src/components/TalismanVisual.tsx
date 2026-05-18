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

const TalismanContent = ({ label, text }: Pick<TalismanVisualProps, "label" | "text">) => (
  <>
    <span className="talisman-visual__template" data-talisman-layer="template" aria-hidden="true" />
    <span className="talisman-visual__state" data-talisman-layer="state" aria-hidden="true" />
    <span className="talisman-visual__text" data-talisman-layer="text">
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
        <TalismanContent label={label} text={text} />
      </button>
    );
  }

  return (
    <div className={className} data-talisman-state={visualState} data-talisman-variant={variant}>
      <TalismanContent label={label} text={text} />
    </div>
  );
};

export default TalismanVisual;
