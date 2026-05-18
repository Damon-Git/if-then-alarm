type TalismanVisualProps = {
  disabled?: boolean;
  interactive?: boolean;
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
  label,
  onClick,
  text,
  variant,
}: TalismanVisualProps) => {
  const className = `talisman-visual talisman-visual--${variant}${interactive ? " talisman-visual--interactive" : ""}`;

  if (interactive) {
    return (
      <button
        className={className}
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
    <div className={className} data-talisman-variant={variant}>
      <TalismanContent label={label} text={text} />
    </div>
  );
};

export default TalismanVisual;
