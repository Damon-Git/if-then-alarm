import { MAX_PREVENTION_INTENTS } from "../constants";
import type { IntentSetDraft, SetupValidationError } from "../types";

type IntentSetFormProps = {
  draft: IntentSetDraft;
  index: number;
  canRemove: boolean;
  errors: SetupValidationError[];
  onChange: (draft: IntentSetDraft) => void;
  onRemove: () => void;
};

const incenseOptions = [1, 2, 3];

const IntentSetForm = ({
  draft,
  index,
  canRemove,
  errors,
  onChange,
  onRemove,
}: IntentSetFormProps) => {
  const situationErrorId = `${draft.id}-situation-error`;
  const situationHelpId = `${draft.id}-situation-help`;
  const incenseErrorId = `${draft.id}-incense-error`;

  const situationErrors = errors.filter((error) => error.field === "situationIntent");
  const incenseErrors = errors.filter((error) => error.field === "incenseCount");
  const preventionGroupErrors = errors.filter(
    (error) => error.field === "preventionIntent" && error.preventionIndex === undefined,
  );
  const otherErrors = errors.filter((error) => !error.field);
  const getPreventionErrors = (preventionIndex: number) =>
    errors.filter((error) => error.field === "preventionIntent" && error.preventionIndex === preventionIndex);

  const updateDraft = (changes: Partial<IntentSetDraft>) => {
    onChange({
      ...draft,
      ...changes,
    });
  };

  const updatePreventionIntent = (preventionIndex: number, value: string) => {
    updateDraft({
      preventionIntents: draft.preventionIntents.map((preventionIntent, currentIndex) =>
        currentIndex === preventionIndex ? value : preventionIntent,
      ),
    });
  };

  const addPreventionIntent = () => {
    if (draft.preventionIntents.length >= MAX_PREVENTION_INTENTS) {
      return;
    }

    updateDraft({
      preventionIntents: [...draft.preventionIntents, ""],
    });
  };

  const removePreventionIntent = (preventionIndex: number) => {
    updateDraft({
      preventionIntents: draft.preventionIntents.filter((_, currentIndex) => currentIndex !== preventionIndex),
    });
  };

  return (
    <fieldset className="intent-form">
      <div className="intent-form__header">
        <legend>第 {index + 1} 项任务</legend>
        {canRemove ? (
          <button className="ghost-button" type="button" onClick={onRemove}>
            删除
          </button>
        ) : null}
      </div>

      <label className="field">
        <span>目标性执行意图</span>
        <p className="field-help" id={situationHelpId}>
          写清楚一个具体触发情境和下一步动作，避免只写愿望。
        </p>
        <textarea
          aria-describedby={`${situationHelpId}${situationErrors.length > 0 ? ` ${situationErrorId}` : ""}`}
          aria-invalid={situationErrors.length > 0}
          value={draft.situationIntent}
          onChange={(event) => updateDraft({ situationIntent: event.target.value })}
          placeholder="当我打开电脑坐到书桌前，就开始写今天的第一段文稿。"
          rows={3}
        />
        {situationErrors.length > 0 ? (
          <ul className="field-error-list" id={situationErrorId}>
            {situationErrors.map((error) => (
              <li key={error.message}>{error.message}</li>
            ))}
          </ul>
        ) : null}
      </label>

      <div className="field-group">
        <div className="field-group__header">
          <span>预防性执行意图</span>
          {draft.preventionIntents.length < MAX_PREVENTION_INTENTS ? (
            <button className="ghost-button" type="button" onClick={addPreventionIntent}>
              添加
            </button>
          ) : null}
        </div>
        <p className="field-help">
          写真实可能打断你的诱因，再写一个可立即执行的替代动作。
        </p>
        {preventionGroupErrors.length > 0 ? (
          <ul className="field-error-list">
            {preventionGroupErrors.map((error) => (
              <li key={error.message}>{error.message}</li>
            ))}
          </ul>
        ) : null}

        {draft.preventionIntents.length === 0 ? (
          <p className="muted-text">可以不写，遇到容易分心的诱因时再添加。</p>
        ) : null}

        {draft.preventionIntents.map((preventionIntent, preventionIndex) => {
          const preventionErrorId = `${draft.id}-prevention-${preventionIndex}-error`;
          const preventionHelpId = `${draft.id}-prevention-${preventionIndex}-help`;
          const preventionErrors = getPreventionErrors(preventionIndex);

          return (
            <div className="prevention-row" key={`${draft.id}-prevention-${preventionIndex}`}>
              <label className="field field--inline">
                <span>第 {preventionIndex + 1} 条</span>
                <p className="field-help" id={preventionHelpId}>
                  句式：如果出现这个阻碍，那么我就做这个替代动作。
                </p>
                <textarea
                  aria-describedby={`${preventionHelpId}${
                    preventionErrors.length > 0 ? ` ${preventionErrorId}` : ""
                  }`}
                  aria-invalid={preventionErrors.length > 0}
                  value={preventionIntent}
                  onChange={(event) => updatePreventionIntent(preventionIndex, event.target.value)}
                  placeholder="如果我想刷短视频，那么我就先闭眼休息 5 分钟。"
                  rows={2}
                />
                {preventionErrors.length > 0 ? (
                  <ul className="field-error-list" id={preventionErrorId}>
                    {preventionErrors.map((error) => (
                      <li key={error.message}>{error.message}</li>
                    ))}
                  </ul>
                ) : null}
              </label>
              <button
                className="icon-text-button"
                type="button"
                onClick={() => removePreventionIntent(preventionIndex)}
              >
                移除
              </button>
            </div>
          );
        })}
      </div>

      <div className="field">
        <span>香数</span>
        <div
          aria-describedby={incenseErrors.length > 0 ? incenseErrorId : undefined}
          className="segmented-control"
          aria-label={`第 ${index + 1} 项任务香数`}
        >
          {incenseOptions.map((option) => (
            <button
              className={draft.incenseCount === option ? "is-selected" : ""}
              key={option}
              type="button"
              onClick={() => updateDraft({ incenseCount: option })}
            >
              {option} 炷
            </button>
          ))}
        </div>
        {incenseErrors.length > 0 ? (
          <ul className="field-error-list" id={incenseErrorId}>
            {incenseErrors.map((error) => (
              <li key={error.message}>{error.message}</li>
            ))}
          </ul>
        ) : null}
      </div>

      {otherErrors.length > 0 ? (
        <ul className="error-list">
          {otherErrors.map((error) => (
            <li key={error.message}>{error.message}</li>
          ))}
        </ul>
      ) : null}
    </fieldset>
  );
};

export default IntentSetForm;
